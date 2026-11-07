/**
 * 火山方舟（Volcengine Ark）官方 Seedream 图片 + Seedance 视频供应商。
 *
 * 图片：POST /api/v3/images/generations（同步，b64_json）
 * 视频：POST /api/v3/contents/generations/tasks（异步，轮询）
 *
 * 与中转站（APIMart / 优云智算等）的区别：
 * - 官方 API 的 wire format 是 Ark 原生协议，不是 OpenAI 兼容协议。
 * - 图片请求体用 `image`（单图）或 `images`（多图），不是 `image_urls`。
 * - 视频请求体用 `content[]` 数组，不是 `prompt` + `image_with_roles`。
 * - 视频轮询状态是 `succeeded` / `failed` / `cancelled` / `expired`。
 */

const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "API Key（视频）",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "imageApiKey" as const,
    title: "API Key（图片）",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "baseUrl" as const,
    title: "请求地址",
    value: "https://ark.cn-beijing.volces.com/api/v3",
    props: { placeholder: "https://ark.cn-beijing.volces.com/api/v3" },
  },
] as const;

const version = "1.0.0";

/** 官方限制：单次请求体（含 Base64 膨胀）不超过 64 MB。 */
const ARK_BODY_LIMIT = 64 * 1024 * 1024;

function payload(body: Record<string, unknown>, label: string): string {
  const text = JSON.stringify(body);
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > ARK_BODY_LIMIT) {
    throw new Error(`${label}请求体约 ${(bytes / 1024 / 1024).toFixed(1)} MB，超过火山方舟 64 MB 上限；请压缩参考素材或改用公网 URL`);
  }
  return text;
}

/** Seedream 5.0 Pro：1K / 1.5K / 2K，默认 2K。 */
const seedreamProSizes: Record<string, Record<string, string>> = {
  "1K": {
    "1:1": "1024x1024",
    "4:3": "1152x864",
    "3:4": "864x1152",
    "16:9": "1424x800",
    "9:16": "800x1424",
    "3:2": "1248x832",
    "2:3": "832x1248",
    "21:9": "1568x672",
  },
  "1.5K": {
    "1:1": "1536x1536",
    "4:3": "1792x1344",
    "3:4": "1344x1792",
    "16:9": "2048x1152",
    "9:16": "1152x2048",
    "3:2": "1872x1248",
    "2:3": "1248x1872",
    "21:9": "2352x1008",
  },
  "2K": {
    "1:1": "2048x2048",
    "4:3": "2368x1776",
    "3:4": "1776x2368",
    "16:9": "2816x1584",
    "9:16": "1584x2816",
    "3:2": "2496x1664",
    "2:3": "1664x2496",
    "21:9": "3136x1344",
  },
};

/** Seedream 5.0：2K / 3K / 4K，默认 2K。 */
const seedreamSizes: Record<string, Record<string, string>> = {
  "2K": {
    "1:1": "2048x2048",
    "4:3": "2304x1728",
    "3:4": "1728x2304",
    "16:9": "2848x1600",
    "9:16": "1600x2848",
    "3:2": "2496x1664",
    "2:3": "1664x2496",
    "21:9": "3136x1344",
  },
  "3K": {
    "1:1": "3072x3072",
    "4:3": "3456x2592",
    "3:4": "2592x3456",
    "16:9": "4096x2304",
    "9:16": "2304x4096",
    "3:2": "3744x2496",
    "2:3": "2496x3744",
    "21:9": "4704x2016",
  },
  "4K": {
    "1:1": "4096x4096",
    "4:3": "4704x3520",
    "3:4": "3520x4704",
    "16:9": "5504x3040",
    "9:16": "3040x5504",
    "3:2": "4992x3328",
    "2:3": "3328x4992",
    "21:9": "6240x2656",
  },
};

type ReferencedVideoRequest = VideoRequest & {
  referenceOrder?: ({ type: "image" | "video" | "audio"; index: number } | { type: "firstFrame" | "lastFrame" | "text" })[];
};

function normalizeSeedreamSize(model: string, size: string | undefined, ratio: string | undefined): string {
  const lower = model.toLowerCase();
  const table = lower.includes("seedream-5-0-pro") ? seedreamProSizes : seedreamSizes;
  const defaultTier = "2K";
  const tier = size?.trim() || defaultTier;
  const ratioKey = ratio?.trim() || "";
  if (table[tier] && ratioKey && table[tier][ratioKey]) return table[tier][ratioKey];
  if (table[defaultTier] && ratioKey && table[defaultTier][ratioKey]) return table[defaultTier][ratioKey];
  return size || defaultTier;
}

function mediaUrl(input: MediaInput): string {
  if (input.type === "url") return input.url;
  const data = input.type === "binary" ? Buffer.from(input.data).toString("base64") : input.data;
  if (data.startsWith("data:")) return data;
  // 官方文档要求 Data URI 的格式名小写（如 image/png），且不接受 Content-Type 参数。
  const mimeType = (input.mimeType || "image/png").split(";")[0]!.trim().toLowerCase();
  return `data:${mimeType};base64,${data}`;
}

/** 读取 Ark 错误正文（形如 {"error":{"code":"...","message":"..."}}），失败时回退为纯文本。 */
async function arkHttpError(prefix: string, response: Response): Promise<Error> {
  let detail = "";
  try {
    const text = (await response.clone().text()).slice(0, 2000).trim();
    if (text) {
      try {
        const data = JSON.parse(text) as { error?: { code?: unknown; message?: unknown }; message?: unknown };
        const code = typeof data.error?.code === "string" ? data.error.code : "";
        const message = typeof data.error?.message === "string" ? data.error.message
          : typeof data.message === "string" ? data.message : "";
        detail = message ? `${code ? `${code}: ` : ""}${message}` : text;
      } catch {
        detail = text;
      }
    }
  } catch { /* 错误正文不可读时只保留状态码。 */ }
  return new Error(`${prefix}：HTTP ${response.status}${detail ? `（${detail}）` : ""}`);
}

async function arkJson<T>(prefix: string, response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${prefix}响应不是有效 JSON`);
  }
}

/** b64_json 不携带 MIME，按文件头判断实际格式，避免把 JPEG 当 PNG 落盘。 */
function detectImageMime(base64: string): string {
  const bytes = Buffer.from(base64.slice(0, 24), "base64");
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (/^GIF8[79]a/.test(bytes.toString("ascii"))) return "image/gif";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "image/png";
}

function wait(signal: AbortSignal, ms: number): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function pollArkVideo(
  context: ProviderContext,
  baseUrl: string,
  apiKey: string,
  taskId: string,
  signal: AbortSignal,
): Promise<string> {
  while (true) {
    const response = await context.tool.fetch(`${baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
    if (!response.ok) throw await arkHttpError("查询任务失败", response);
    const data = await arkJson<{ status?: string; content?: { video_url?: string } }>("查询任务", response);
    const status = data?.status;
    if (typeof status !== "string") throw new Error("查询任务响应缺少状态");
    if (status === "succeeded") {
      const url = data.content?.video_url;
      if (!url) throw new Error("视频生成成功但未返回视频地址");
      return url;
    }
    if (status === "failed" || status === "cancelled" || status === "expired") {
      throw Object.assign(new Error(context.tool.errorMessage?.(data) || "视频生成失败"), { code: "MEDIA_TASK_FAILED" });
    }
    if (status !== undefined && status !== "queued" && status !== "running" && status !== "pending") {
      throw new Error(`视频任务返回了未知状态：${String(status)}`);
    }
    await wait(signal, 3000);
  }
}

/** Ark Seedance 用 @图片1 / @视频1 / @音频1 指代参考素材，首尾帧写作「首帧」「尾帧」。 */
function videoPrompt(request: ReferencedVideoRequest, mode: VideoMode): string {
  return request.prompt.replace(/\{\{ref (\d+)\}\}/g, (marker, number: string) => {
    const reference = request.referenceOrder?.[Number(number) - 1];
    if (!reference) throw new Error(`引用标记 ${marker} 缺少素材映射，请更新视频节点或提供 referenceOrder`);
    if (reference.type === "text") return `参考 ${Number(number)}`;
    const isFrames = mode === "startEndRequired" || mode === "endFrameOptional" || mode === "startFrameOptional";
    if (reference.type === "firstFrame" || reference.type === "lastFrame") {
      if (!isFrames || !request[reference.type]) throw new Error(`引用标记 ${marker} 对应的首尾帧未提交`);
      return reference.type === "firstFrame" ? "首帧" : "尾帧";
    }
    if (!("index" in reference)) throw new Error(`引用标记 ${marker} 的素材类型无效`);
    const media = { image: request.images, video: request.videos, audio: request.audios };
    const included = Array.isArray(mode) || (reference.type === "image" && mode === "singleImage");
    if (!included || !Number.isSafeInteger(reference.index) || reference.index < 0 || !media[reference.type]?.[reference.index]) {
      throw new Error(`引用标记 ${marker} 对应的素材未提交，请重新选择引用`);
    }
    const labels = { image: "@图片", video: "@视频", audio: "@音频" } as const;
    return `${labels[reference.type]}${reference.index + 1}`;
  });
}

function videoContent(request: ReferencedVideoRequest): Record<string, unknown>[] {
  const mode = request.mode ?? (request.firstFrame || request.lastFrame ? "startFrameOptional" : request.images?.length ? "singleImage" : "text");
  const content: Record<string, unknown>[] = [{ type: "text", text: videoPrompt(request, mode).trim() }];
  const images = request.images ?? [];
  const videos = request.videos ?? [];
  const audios = request.audios ?? [];
  const isFrames = mode === "startEndRequired" || mode === "endFrameOptional" || mode === "startFrameOptional";
  const isReference = Array.isArray(mode);

  if (isReference) {
    for (const image of images) content.push({ type: "image_url", image_url: { url: mediaUrl(image) }, role: "reference_image" });
    for (const video of videos) content.push({ type: "video_url", video_url: { url: mediaUrl(video) }, role: "reference_video" });
    for (const audio of audios) content.push({ type: "audio_url", audio_url: { url: mediaUrl(audio) }, role: "reference_audio" });
  } else if (isFrames) {
    if (request.firstFrame) content.push({ type: "image_url", image_url: { url: mediaUrl(request.firstFrame) }, role: "first_frame" });
    if (request.lastFrame) content.push({ type: "image_url", image_url: { url: mediaUrl(request.lastFrame) }, role: "last_frame" });
  } else if (mode === "singleImage") {
    const first = request.firstFrame ?? images[0];
    if (first) content.push({ type: "image_url", image_url: { url: mediaUrl(first) }, role: "first_frame" });
  }
  return content;
}

function normalizeArkRatio(mode: VideoMode | undefined, ratio: string | undefined): string {
  const isFrames = mode === "startEndRequired" || mode === "endFrameOptional" || mode === "startFrameOptional";
  if (isFrames) return "adaptive";
  return ratio?.trim() || "16:9";
}

function normalizeArkResolution(resolution: string | undefined): string {
  const value = resolution?.trim().toLowerCase();
  if (value === "4k") return "4k";
  return value || "720p";
}

function normalizeArkDuration(model: string, duration: number | undefined): number {
  const value = Math.round(duration ?? 5);
  const max = model.toLowerCase().includes("seedance-2-5") ? 30 : 15;
  return Math.max(4, Math.min(max, value));
}

export default {
  id: "volcengine",
  label: "火山方舟（Seedream + Seedance）",
  icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI0ZGMzcwMCIgZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01ek0yIDE3bDEwIDUgMTAtNU0yIDEybDEwIDUgMTAtNSIvPjwvc3ZnPg==",
  version,
  readme: `## 火山方舟（Volcengine Ark）

官方 Seedream 图片 + Seedance 视频接入。

- **图片**：Seedream 5.0 Pro / 5.0，支持文生图、多参考图。
- **视频**：Seedance 2.5 / 2.0 / 2.0 fast / 2.0 mini，支持文生视频、首帧/首尾帧、参考素材。

**API Key 获取**：[火山方舟控制台](https://console.volcengine.com/ark)

**注意**：官方 API 与中转站（APIMart / 优云智算等）的 wire format 不同，不能混用 Key。

**限制**：单次请求体（含 Base64 参考素材）不超过 64 MB；较大参考视频/音频建议改用公网 URL。
`,
  rules,
  models: [
    {
      id: "doubao-seedream-5-0-pro-260628",
      label: "Seedream 5.0 Pro",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
      imageSizes: ["1K", "1.5K", "2K"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "doubao-seedream-5-0-260128",
      label: "Seedream 5.0",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
      imageSizes: ["2K", "3K", "4K"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "doubao-seedance-2-5-260628",
      label: "Seedance 2.5",
      type: "video",
      mode: ["text", "singleImage", "startEndRequired", "endFrameOptional", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      imageRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], resolution: ["480p", "720p", "1080p"] }],
    },
    {
      id: "doubao-seedance-2-0-260128",
      label: "Seedance 2.0",
      type: "video",
      mode: ["text", "singleImage", "startEndRequired", "endFrameOptional", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      imageRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p", "1080p", "4k"] }],
    },
    {
      id: "doubao-seedance-2-0-fast-260128",
      label: "Seedance 2.0 fast",
      type: "video",
      mode: ["text", "singleImage", "startEndRequired", "endFrameOptional", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      imageRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
    },
    {
      id: "doubao-seedance-2-0-mini-260615",
      label: "Seedance 2.0 mini",
      type: "video",
      mode: ["text", "singleImage", "startEndRequired", "endFrameOptional", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      imageRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
    },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    const apiKey = this.config.imageApiKey?.trim() || this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写图片 API Key");
    const baseUrl = (this.config.baseUrl?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
    const signal = AbortSignal.any([AbortSignal.timeout(5 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const size = normalizeSeedreamSize(request.model, request.size, request.ratio);
    const body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt,
      response_format: "b64_json",
      watermark: false,
      size,
    };
    // 官方 Seedream 接口无 n 字段；非 Pro 模型需显式关闭组图与流式输出。
    if (!request.model.toLowerCase().includes("seedream-5-0-pro")) {
      body.stream = false;
      body.sequential_image_generation = "disabled";
    }
    if (request.images?.length) {
      body.image = request.images.length === 1 ? mediaUrl(request.images[0]!) : request.images.map(mediaUrl);
    }
    const response = await this.tool.fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: payload(body, "图片生成"),
      signal,
    });
    if (!response.ok) throw await arkHttpError("图片生成失败", response);
    const data = await arkJson<{ data?: Array<{ b64_json?: string; url?: string }> }>("图片生成", response);
    const item = data.data?.[0];
    if (item?.b64_json) {
      // 少数网关会返回带 data URI 前缀的 b64_json，这里统一剥离并识别真实格式。
      const match = /^data:([^;]+);base64,(.*)$/s.exec(item.b64_json);
      const raw = match?.[2] ?? item.b64_json;
      return [{ mediaType: "image", type: "base64", data: raw, mimeType: match?.[1] ?? detectImageMime(raw) }];
    }
    if (item?.url) return [{ mediaType: "image", type: "url", url: item.url }];
    throw new Error("接口未返回生成结果");
  },
  async generateVideo(request: ReferencedVideoRequest): Promise<MediaAsset[]> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 API Key");
    const baseUrl = (this.config.baseUrl?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
    const deadline = Date.now() + 10 * 60_000;
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const content = videoContent(request);
    const body: Record<string, unknown> = {
      model: request.model,
      content,
      ratio: normalizeArkRatio(request.mode, request.ratio),
      resolution: normalizeArkResolution(request.resolution),
      duration: normalizeArkDuration(request.model, request.duration),
      generate_audio: request.generateAudio ?? true,
      watermark: request.watermark ?? false,
    };
    const submitResponse = await this.tool.fetch(`${baseUrl}/contents/generations/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: payload(body, "视频生成"),
      signal,
    });
    if (!submitResponse.ok) throw await arkHttpError("提交任务失败", submitResponse);
    const submitData = await arkJson<{ id?: string }>("提交任务", submitResponse);
    const taskId = submitData?.id;
    if (typeof taskId !== "string" || !taskId) throw new Error("提交任务未返回任务 ID");
    await this.saveTaskData?.({ kind: "arkVideo", taskId, model: request.model, baseUrlHash: String(this.tool.hash(baseUrl)), deadline });
    const videoUrl = await pollArkVideo(this, baseUrl, apiKey, taskId, signal);
    return [{ mediaType: "video", type: "url", url: videoUrl }];
  },
  async resumeTask(data: ProviderTaskData): Promise<MediaAsset[]> {
    const baseUrl = (this.config.baseUrl?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
    if (data.kind !== "arkVideo" || typeof data.taskId !== "string" || !data.taskId || typeof data.model !== "string"
      || data.baseUrlHash !== String(this.tool.hash(baseUrl)) || typeof data.deadline !== "number" || !Number.isFinite(data.deadline)) {
      throw new Error("视频任务恢复数据无效或请求地址已变更");
    }
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 API Key");
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const url = await pollArkVideo(this, baseUrl, apiKey, data.taskId, signal);
    return [{ mediaType: "video", type: "url", url }];
  },
} satisfies ProviderDefinition<typeof rules>;
