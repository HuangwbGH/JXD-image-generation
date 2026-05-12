import { fetch, ProxyAgent } from "undici";
import { getAppSettings } from "@/lib/settings";

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  inline_data?: { mime_type: string; data: string };
};

export type GeminiInputImage = {
  mimeType: string;
  data: string;
};

export async function generateWithGemini(params: {
  apiKey: string;
  model: string;
  prompt: string;
  images: GeminiInputImage[];
  aspectRatio: string;
  imageSize: string;
}) {
  const settings = getAppSettings();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`;
  const parts: Record<string, unknown>[] = [{ text: params.prompt }];

  for (const image of params.images) {
    parts.push({
      inline_data: {
        mime_type: image.mimeType,
        data: image.data
      }
    });
  }

  const imageConfig: Record<string, string> = {};
  if (params.aspectRatio !== "auto") imageConfig.aspectRatio = params.aspectRatio;
  if (params.imageSize !== "auto") imageConfig.imageSize = params.imageSize;

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      ...(Object.keys(imageConfig).length > 0 ? { imageConfig } : {})
    }
  };

  const proxyUrl = normalizeProxyUrl(settings.appHttpsProxy || settings.appHttpProxy);
  const dispatcher = settings.proxyEnabled && proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": params.apiKey
      },
      body: JSON.stringify(body),
      dispatcher,
      signal: controller.signal
    });

    const json = (await response.json()) as {
      error?: { message?: string };
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
    };

    if (!response.ok) {
      throw new Error(json.error?.message || `Gemini 请求失败：${response.status}`);
    }

    const responseParts = json.candidates?.[0]?.content?.parts || [];
    const text = responseParts
      .map((part) => part.text)
      .filter(Boolean)
      .join("\n");
    const images = responseParts
      .map((part) => part.inlineData || (part.inline_data
        ? { mimeType: part.inline_data.mime_type, data: part.inline_data.data }
        : undefined))
      .filter((part): part is { mimeType: string; data: string } => Boolean(part));

    return { text, images };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeProxyUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}
