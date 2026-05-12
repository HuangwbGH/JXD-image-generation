import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWithGemini } from "@/lib/gemini/generate";
import { requireAdmin } from "@/lib/auth/session";
import { getDepartmentApiKey } from "@/lib/settings";
import { handleRoute, jsonError } from "@/lib/http";

const schema = z.object({
  departmentId: z.enum(["rd_1", "rd_2"]),
  model: z.string().min(1)
});

export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdmin();
    const input = schema.parse(await request.json());
    const apiKey = getDepartmentApiKey(input.departmentId);
    if (!apiKey) return jsonError("该部门 API Key 未配置", 400);

    await generateWithGemini({
      apiKey,
      model: input.model,
      prompt: "Generate a simple small image of a blue square.",
      images: [],
      aspectRatio: "1:1",
      imageSize: "1K"
    });

    return NextResponse.json({ ok: true });
  });
}
