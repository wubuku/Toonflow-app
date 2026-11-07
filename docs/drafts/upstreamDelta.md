# Toonflow 上游差异说明（research 分支）

> 目的：记录本仓库相对上游的改动，区分"新增文件"与"修改上游文件"，便于升级上游和向上游提交补丁。
>
> 基线：`upstream/master` 提交 `6086cdf`（v2.0.10）。截至本次提交，`research` 领先 11 个提交、落后 0 个提交。

## 1. 结论

- 除本文件外共 15 个文件、+2881 / -8 行；其中 7 个是新文件，占 2866 行。
- 真正的上游源码改动有五处：
  - `apps/server/src/utils/fileHttp.ts`（+7 / -3）— Bun 下 sendFile 404 修复
  - `apps/server/src/app.ts`（+1）— 将 `volcengine.ts` 加入内置媒体供应商自动安装列表
  - `apps/server/src/utils/media/generation.ts`（+1 / -1）— 视频 `referenceOrder` 白名单加入 `volcengine`
  - `apps/server/src/utils/multiTenant/modelAdapters.ts`（+1 / -1）— 平台媒体模型允许 `adaptive` 比例
  - `packages/providers/index.ts`、`packages/providers/package.json`（各 +2 / -1）— 导出并暴露新供应商模块
- 其余：`.gitignore` 加一行 `/.local/`；`packages/mcp/src/stdio.ts` 仅文件权限位 100644 → 100755（该文件是 MCP 的 bin 入口）。

## 2. 文件清单

| 文件 | 状态 | 行数 | 说明 |
| --- | --- | --- | --- |
| `scripts/dev.sh` | 新增 | +213 | 本地 dev 一键启动 |
| `scripts/dev-seed.ts` | 新增 | +495 | 测试数据与模型 seed（含 volcengine 支持，写入 `$DATA_DIR/providers/volcengine.ts`） |
| `scripts/dev.env.example` | 新增 | +81 | 火山方舟三 Key 配置模板（豆包 Seed LLM / Seedream / Seedance） |
| `docs/drafts/toonflowVsReveric.md` | 新增 | +474 | 对比研究 |
| `docs/drafts/toonflowVsTDCanvas.md` | 新增 | +580 | 对比研究 |
| `docs/drafts/toonflowVsYingce.md` | 新增 | +578 | 对比研究 |
| `packages/providers/src/media/volcengine.ts` | 新增 | +445 | 火山方舟官方 Seedream + Seedance 供应商 |
| `.gitignore` | 修改 | +1 | 忽略 `/.local/` |
| `apps/server/src/utils/fileHttp.ts` | 修改 | +7 / -3 | Bun 下 sendFile 404 修复 |
| `apps/server/src/app.ts` | 修改 | +1 | 内置媒体供应商列表加入 volcengine.ts |
| `apps/server/src/utils/media/generation.ts` | 修改 | +1 / -1 | referenceOrder 白名单加入 volcengine |
| `apps/server/src/utils/multiTenant/modelAdapters.ts` | 修改 | +1 / -1 | 平台媒体模型允许 `adaptive` 比例 |
| `packages/providers/index.ts` | 修改 | +2 / -1 | 导出 volcengine |
| `packages/providers/package.json` | 修改 | +2 / -1 | exports 增加 volcengine |
| `packages/mcp/src/stdio.ts` | 权限 | 0 | 100644 → 100755 |

## 3. 上游补丁：`fileHttp.ts`

- 问题：Bun 运行时下，Express `res.sendFile` 会把绝对路径与 `root` 再次拼接，返回 404。
- 现状：4 个调用点（`routes/nodes/files.ts`、`routes/ext/read.ts`、`routes/workspaces/files/read.ts`、`routes/assets/read.ts`）都传绝对路径且不带 `root`。
- 改法：取 `dirname` 作 `root`、`basename` 作相对路径传给 `sendFile`；文件访问校验仍使用原始绝对路径。
- 影响面：仅修正 Bun 下的 404，Node 下行为不变。
- 上游化建议：可作为独立 PR 提交；建议附一条 Bun 运行时的回归用例。

## 4. 火山方舟（Volcengine Ark）官方供应商

- 新增 `packages/providers/src/media/volcengine.ts`：官方 Ark 原生协议，支持 Seedream 5.0 Pro / 5.0 图片 + Seedance 2.5 / 2.0 / 2.0 fast / 2.0 mini 视频；图片与视频支持独立 API Key（`imageApiKey` 缺省回退 `apiKey`）。
- 图片走 `POST /api/v3/images/generations`（同步，b64_json），支持比例→像素映射。
- 视频走 `POST /api/v3/contents/generations/tasks`（异步，轮询），支持首帧/首尾帧/参考素材。
- 参考素材按 Ark 原生 `content[]` 组装（`first_frame` / `last_frame` / `reference_image` / `reference_video` / `reference_audio`），提示词 `{{ref N}}` 按 `referenceOrder` 改写为 `@图片N` / `@视频N` / `@音频N`。
- 异常路径：HTTP 错误读取 Ark `error.code/message` 并透出；任务 `failed/cancelled/expired` 映射 `MEDIA_TASK_FAILED`；非 JSON、缺任务 ID、缺视频地址、未知状态均有明确报错；请求体超过 64 MB 时本地拦截。
- `apps/server/src/app.ts` 的 `autoInstallProviders` 数组新增 `"volcengine.ts"`，确保构建时自动安装。
- `apps/server/src/utils/media/generation.ts` 将 `volcengine` 加入视频 `referenceOrder` 白名单。
- `apps/server/src/utils/multiTenant/modelAdapters.ts` 的媒体模型能力校验原本只接受 `W:H` 形式的 `imageRatios`，会拒绝 Seedance 的 `adaptive`（同时影响已有的 compshare MiniMax-H3），导致创作端 `/api/ai/media/models` 返回 503 "平台模型能力配置无效"；现改为允许 `adaptive`。
- `scripts/dev-seed.ts` 新增 `volcengine` / `ark` 别名支持，读取 `TOONFLOW_DEV_MEDIA_API_KEY`、可选 `TOONFLOW_DEV_MEDIA_IMAGE_API_KEY` 和 `TOONFLOW_DEV_MEDIA_BASE_URL`；seed 时把供应商源码写入 `$DATA_DIR/providers/volcengine.ts`；所有示例占位 Key 会在 seed 阶段直接报错，避免把 `REPLACE_WITH_...` 写进配置。

### 已知限制：参考素材使用 Base64 Data URI

- 当前实现将参考素材（首帧、尾帧、参考图/视频/音频）编码为 `data:<mime>;base64,<payload>` 直接放入请求体，与 `metaso`、`apiMart` 等现有供应商一致。
- 火山方舟官方 API 对请求体有 **64 MB** 上限，且官方建议单张图片 Base64 **< 10 MB**。Base64 编码会使体积增加约 33%，多张参考图或参考视频场景可能触发限制。
- **Seedream 图片生成**：参考图通常 1–5 MB，单张场景基本安全。
- **Seedance 视频生成**：首帧/尾帧/参考图通常 1–5 MB；**参考视频**（10–100 MB）使用 Base64 极可能超限。
- **后续迭代方向**：参考星幕（seedance-research）的 TOS 对象存储方案，在 Toonflow 中引入对象存储抽象，将素材上传至 TOS/S3 后传 URL 给火山方舟。当前 Toonflow 尚无对象存储基础设施，此项不在本次目标范围内。

## 5. 一键脚本与 apiKey 覆盖

- `scripts/dev.sh`、`scripts/dev-seed.ts`、`scripts/dev.env.example` 均为新增文件，不修改上游代码。
- `dev-seed.ts` 在多租户模式下，对同 `kind + id` 的供应商改为**覆盖**（原逻辑为只补缺），因此更新 `.env.dev.local` 后重跑 `./scripts/dev.sh` 会把新的 `apiKey` 同步到 `settings.json` 与 `multiTenant` 的加密供应商配置。
- 未在 env 中声明的供应商、以及通过管理界面新增的供应商不受影响。
- `dev.sh` 会将 `TOONFLOW_DEV_DATA_DIR`、`TOONFLOW_DEV_ENV_FILE` 的相对路径统一按仓库根目录解析，避免 seed 与后端从不同 cwd 解析出两个数据目录；`--rebuild` 可强制重建插件与 Web。

## 6. 升级上游

```bash
git fetch upstream
git rebase upstream/master
```

预计冲突点：`.gitignore`（`/.local/` 一行）、`apps/server/src/utils/fileHttp.ts`、`apps/server/src/app.ts`（autoInstallProviders 数组）。`scripts/` 与 `docs/drafts/` 均为新增文件，一般不冲突。

## 7. 已知遗留

- `dev-seed.ts` 不会清理从 env 中移除的模型路由；换 key 场景不受影响。
- 密钥仍存在两份副本：`settings.json` 的 `customProviders` 与 `multiTenant` 的 `providerCipher`，由 seed 同时写入。
