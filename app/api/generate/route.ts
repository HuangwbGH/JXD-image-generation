import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/database";
import { requireUser } from "@/lib/auth/session";
import { getAppSettings, getDepartmentApiKey } from "@/lib/settings";
import { generateWithGemini } from "@/lib/gemini/generate";
import { saveGeneratedImage, saveUpload, toPublicUrl } from "@/lib/storage/files";
import { handleRoute, jsonError } from "@/lib/http";
import { writeLog } from "@/lib/logging/system-log";

let activeGenerations = 0;

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireUser();
    const settings = getAppSettings();
    if (activeGenerations >= Number(process.env.GENERATION_MAX_CONCURRENCY || 3)) {
      writeLog({
        level: "warn",
        action: "generation.rejected",
        userId: user.id,
        username: user.username,
        departmentId: user.departmentId,
        message: "生成被拒绝：并发达到上限"
      });
      return jsonError("当前生成任务较多，请稍后重试", 429);
    }

    const formData = await request.formData();
    const responseMode = String(formData.get("responseMode") || "json");
    const wantsHtml = responseMode === "html";
    const fail = (message: string, status = 400) =>
      wantsHtml
        ? new NextResponse(null, { status: 303, headers: { Location: `/?error=${encodeURIComponent(message)}` } })
        : jsonError(message, status);
    const mode = String(formData.get("mode") || "");
    const prompt = String(formData.get("prompt") || "").trim();
    const model = String(formData.get("model") || settings.defaultModel);
    const aspectRatio = String(formData.get("aspectRatio") || "auto");
    const imageSize = String(formData.get("imageSize") || "1K");
    const outputFormat = String(formData.get("outputFormat") || "png") as "png" | "jpg";
    const departmentId =
      user.role === "admin" ? String(formData.get("departmentId") || "") : user.departmentId;
    const files = formData
      .getAll("images")
      .filter((item): item is File => item instanceof File && item.name.trim() !== "" && item.size > 0);

    if (!prompt) return fail("请输入提示词");
    if (mode !== "text-to-image" && mode !== "image-to-image") return fail("生成模式无效");
    if (outputFormat !== "png" && outputFormat !== "jpg") return fail("输出格式无效");
    if (!departmentId) return fail("缺少部门信息");
    if (!settings.allowedModels.includes(model)) return fail("模型不在允许列表中");
    if (files.length > settings.uploadMaxImages) return fail("上传图片数量超过限制");
    if (mode === "image-to-image" && files.length === 0) return fail("图生图模式需要上传图片");

    const maxBytes = settings.uploadMaxFileSizeMb * 1024 * 1024;
    for (const file of files) {
      if (!file.type || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        return fail("仅支持 png、jpg、jpeg、webp 图片");
      }
      if (file.size > maxBytes) return fail("上传图片超过大小限制");
    }

    const apiKey = getDepartmentApiKey(departmentId);
    if (!apiKey) {
      writeLog({
        level: "warn",
        action: "generation.rejected",
        userId: user.id,
        username: user.username,
        departmentId,
        message: "生成被拒绝：部门 API Key 未配置"
      });
      return fail("当前部门 API Key 未配置，请联系运维在设置页配置该部门 API Key。");
    }

    const started = Date.now();
    const inputImages = [];
    const geminiImages = [];
    const requestMetadata = {
      mode,
      model,
      prompt,
      aspectRatio,
      imageSize,
      outputFormat,
      departmentId,
      inputImages: files.map((file) => ({
        name: file.name,
        mimeType: file.type,
        size: file.size
      }))
    };
    activeGenerations += 1;
    try {
      for (const file of files) {
        const saved = await saveUpload(file, user.id);
        inputImages.push(saved);
        geminiImages.push({
          mimeType: file.type,
          data: Buffer.from(await file.arrayBuffer()).toString("base64")
        });
      }

      writeLog({
        action: "generation.request",
        userId: user.id,
        username: user.username,
        departmentId,
        message: "发送 Gemini 生成请求",
        metadata: {
          ...requestMetadata,
          savedInputImages: inputImages
        }
      });

      const response = await generateWithGemini({
        apiKey,
        model,
        prompt,
        images: geminiImages,
        aspectRatio,
        imageSize
      });

      writeLog({
        action: "generation.response",
        userId: user.id,
        username: user.username,
        departmentId,
        message: "收到 Gemini 生成响应",
        metadata: {
          text: response.text,
          imageCount: response.images.length,
          images: response.images.map((image) => ({
            mimeType: image.mimeType,
            dataLength: image.data.length
          })),
          durationMs: Date.now() - started
        }
      });

      if (response.images.length === 0) {
        writeLog({
          level: "warn",
          action: "generation.no_image",
          userId: user.id,
          username: user.username,
          departmentId,
          message: "模型未返回图片",
          metadata: { mode, model }
        });
        return fail("模型未返回图片，请在提示词中明确要求生成图片");
      }

      const outputImages = [];
      for (let index = 0; index < response.images.length; index += 1) {
        const image = response.images[index];
        const saved = await saveGeneratedImage(Buffer.from(image.data, "base64"), outputFormat, user.id, index);
        outputImages.push(saved);
      }

      const id = randomUUID();
      getDb()
        .prepare(
          `INSERT INTO generation_jobs
            (id, user_id, department_id, mode, model, prompt, aspect_ratio, image_size, output_format,
             input_images, output_images, status, error_message, duration_ms, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'success', NULL, ?, ?)`
        )
        .run(
          id,
          user.id,
          departmentId,
          mode,
          model,
          prompt,
          aspectRatio,
          imageSize,
          outputFormat,
          JSON.stringify(inputImages),
          JSON.stringify(outputImages),
          Date.now() - started,
          new Date().toISOString()
        );

      writeLog({
        action: "generation.success",
        userId: user.id,
        username: user.username,
        departmentId,
        targetId: id,
        message: "生成任务成功",
        metadata: {
          mode,
          model,
          imageCount: outputImages.length,
          durationMs: Date.now() - started
        }
      });

      if (wantsHtml) {
        return new NextResponse(null, {
          status: 303,
          headers: { Location: `/records?view=detail&id=${id}` }
        });
      }

      return NextResponse.json({
        id,
        status: "success",
        text: response.text,
        durationMs: Date.now() - started,
        images: outputImages.map((image) => ({
          url: toPublicUrl(image.path),
          mimeType: image.mimeType
        }))
      });
    } catch (error) {
      writeLog({
        level: "error",
        action: "generation.error",
        userId: user.id,
        username: user.username,
        departmentId,
        message: error instanceof Error ? error.message : "生成失败",
        metadata: {
          request: requestMetadata,
          savedInputImages: inputImages,
          errorName: error instanceof Error ? error.name : "UnknownError",
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      if (wantsHtml) {
        return new NextResponse(null, {
          status: 303,
          headers: { Location: `/?error=${encodeURIComponent(formatGenerationError(error))}` }
        });
      }
      if (!wantsHtml) return jsonError(formatGenerationError(error), 500);
      throw error;
    } finally {
      activeGenerations -= 1;
    }
  });
}

function formatGenerationError(error: unknown) {
  const message = error instanceof Error ? error.message : "生成失败";
  if (/quota|rate.?limit|exceeded/i.test(message)) {
    return "Gemini API 配额不足或请求频率受限，请联系运维检查该部门 API Key 的配额。";
  }
  if (/api key|permission|unauth|forbidden/i.test(message)) {
    return "Gemini API Key 无效或无权限，请联系运维检查该部门 API Key。";
  }
  if (/abort|timeout/i.test(message)) {
    return "Gemini 请求超时，请稍后重试或检查代理配置。";
  }
  return message || "生成失败";
}
