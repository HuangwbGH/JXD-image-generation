# Gemini API 接入方案

## 推荐模型

| 模型 | 用途 | 建议 |
| --- | --- | --- |
| `gemini-3.1-flash-image-preview` | 通用文生图、图生图、高频内部使用 | 默认模型 |
| `gemini-3-pro-image-preview` | 复杂资产、文字渲染、更高保真 | 作为高级选项 |
| `gemini-2.5-flash-image` | 低延迟、成本敏感场景 | 作为兼容选项 |

官方文档把 Gemini 原生图像生成能力称为 Nano Banana 系列，支持通过文本、图片或二者组合生成和编辑图片。所有生成图像都会包含 SynthID 水印。

## 文生图

当前实现使用服务端 REST 请求，便于通过 `undici` 注入程序级代理。请求不包含 API Key 明文日志，API Key 只放在服务端请求头里。

```ts
const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": departmentGeminiApiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "生成一张公司年会主视觉，科技感，深色背景，中文标题留白" }] }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "2K"
        }
      }
    })
  }
);
```

响应中遍历 `response.candidates[0].content.parts`，如果存在 `inlineData`，将 `inlineData.data` 从 base64 转成图片文件保存。

## 图生图

```ts
import { readFile } from "node:fs/promises";

const imageBuffer = await readFile("./storage/uploads/example.png");

const body = {
  contents: [{
    parts: [
      { text: "保留人物和构图，将背景改为现代办公室，整体风格更适合企业宣传海报" },
      {
        inline_data: {
          mime_type: "image/png",
          data: imageBuffer.toString("base64")
        }
      }
    ]
  }],
  generationConfig: {
    responseModalities: ["IMAGE"],
    imageConfig: { imageSize: "2K" }
  }
};
```

## 多图输入

内部产品可先限制为最多 8 张输入图，和参考站点一致。模型层面需要按所选模型动态限制：

- `gemini-2.5-flash-image` 更适合最多 3 张输入图。
- `gemini-3.1-flash-image-preview` 可支持更多参考图，适合多对象、多角色组合工作流。
- 如果用户选择的图片数量超过模型建议值，前端应提示切换模型或减少图片。

## 输出参数

### 纵横比

建议前端先提供这些常用项：

- `auto`
- `1:1`
- `9:16`
- `16:9`
- `3:4`
- `4:3`
- `3:2`
- `2:3`
- `5:4`
- `4:5`
- `21:9`

高级模型可扩展到 `1:4`、`4:1`、`1:8`、`8:1`。

### 分辨率

- `1K`：默认，速度和成本更稳。
- `2K`：适合常规营销素材。
- `4K`：仅在模型支持时开放，适合海报和正式物料。

### 输出格式

Gemini 返回的 `inlineData` 通常是模型生成的图片数据。后端可统一保存为 PNG；如果用户选择 JPG，则在服务端用 `sharp` 转换。

## 代理支持

公司服务器不能固定直连 Gemini，因此后端必须支持程序级代理配置。代理只作用于本程序访问 Gemini 的请求，不要求整台服务器走代理。

```env
APP_HTTP_PROXY=http://192.168.1.27:20171
APP_HTTPS_PROXY=http://192.168.1.27:20171
```

Node.js 服务使用 `undici` 的 `ProxyAgent` 注入代理。不要在浏览器端设置代理，也不要通过服务器全局代理影响其他进程。

## 错误处理

常见错误映射：

| 场景 | 给用户的提示 |
| --- | --- |
| API Key 缺失 | 当前部门 Gemini API Key 未配置，请到设置页填写 |
| 代理不可达 | 代理连接失败，请检查代理地址 |
| 无图片返回 | 模型未返回图片，请补充“生成图片/输出图片”要求后重试 |
| 图片过大 | 上传图片超过大小限制，请压缩后重试 |
| 模型不支持参数 | 当前模型不支持该比例或分辨率，请调整参数 |
| 超时 | 生成超时，请稍后重试或降低分辨率 |

## 参考来源

- https://ai.google.dev/gemini-api/docs/image-generation
