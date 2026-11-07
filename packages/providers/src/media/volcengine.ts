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
  return data.startsWith("data:") ? data : `data:${input.mimeType};base64,${data}`;
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
    if (!response.ok) throw new Error(`查询任务失败：HTTP ${response.status}`);
    const data = (await response.json()) as { status?: string; content?: { video_url?: string } };
    const status = data?.status;
    if (status === "succeeded") {
      const url = data.content?.video_url;
      if (!url) throw new Error("视频生成成功但未返回视频地址");
      return url;
    }
    if (status === "failed" || status === "cancelled" || status === "expired") {
      throw Object.assign(new Error(context.tool.errorMessage?.(data) || "视频生成失败"), { code: "MEDIA_TASK_FAILED" });
    }
    await wait(signal, 3000);
  }
}

function videoContent(request: ReferencedVideoRequest): Record<string, unknown>[] {
  const content: Record<string, unknown>[] = [{ type: "text", text: request.prompt.trim() }];
  const images = request.images ?? [];
  const videos = request.videos ?? [];
  const audios = request.audios ?? [];
  const mode = request.mode ?? (request.firstFrame || request.lastFrame ? "startFrameOptional" : images.length ? "singleImage" : "text");
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

function normalizeArkDuration(duration: number | undefined): number {
  const value = Math.round(duration ?? 5);
  return Math.max(4, Math.min(30, value));
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
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], resolution: ["480p", "720p"] }],
    },
    {
      id: "doubao-seedance-2-0-260128",
      label: "Seedance 2.0",
      type: "video",
      mode: ["text", "singleImage", "startEndRequired", "endFrameOptional", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      imageRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p", "1080p"] }],
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
    const apiKey = (this.config.imageApiKey || this.config.apiKey)?.trim();
    if (!apiKey) throw new Error("请填写图片 API Key");
    const baseUrl = (this.config.baseUrl?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
    const signal = AbortSignal.any([AbortSignal.timeout(5 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const size = normalizeSeedreamSize(request.model, request.size, request.ratio);
    const body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt,
      n: 1,
      response_format: "b64_json",
      watermark: false,
      size,
    };
    if (request.images?.length) {
      body.image = request.images.length === 1 ? mediaUrl(request.images[0]!) : request.images.map(mediaUrl);
    }
    const response = await this.tool.fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) throw new Error(`请求失败：HTTP ${response.status}`);
    const data = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = data.data?.[0];
    if (item?.b64_json) return [{ mediaType: "image", type: "base64", data: item.b64_json, mimeType: "image/png" }];
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
      duration: normalizeArkDuration(request.duration),
      generate_audio: request.generateAudio ?? true,
      watermark: request.watermark ?? false,
    };
    const submitResponse = await this.tool.fetch(`${baseUrl}/contents/generations/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!submitResponse.ok) throw new Error(`提交任务失败：HTTP ${submitResponse.status}`);
    const submitData = (await submitResponse.json()) as { id?: string };
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
