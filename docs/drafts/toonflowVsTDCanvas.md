# Toonflow vs TDCanvas：AI 无限画布与桌面创作工具对比研究

> 研究性质：只读代码、文档与构建配置比对；不代表对任一项目成熟度、商业价值或代码质量的最终评价。
>
> 对比基线：
> - Toonflow-app：`research` 分支，提交 `cb6fa8e`（对比报告提交；业务代码与 `91efcb6` 一致）。
> - TDCanvas：`/Users/yangjiefeng/Documents/AICoderTudou/TDCanvas`，`main` 分支，提交 `c2f2045`，版本 `v0.14.0`。
>
> 证据口径：TDCanvas 的 README、代码和 CHANGELOG 比部分功能文档更新；本文优先采用当前代码与可执行入口，文档漂移处单独标注。

## 1. 结论摘要

Toonflow 和 TDCanvas 都是“AI 无限画布 + 多模态生成 + 本地优先”的创作工具，但侧重点不同：

- **Toonflow 是面向短剧／漫剧的 AI 制片工具**。它在通用画布之外，增加了 3D 导演台、逐帧拉片、分镜团队、角色与场景资产、Agent Team、MCP／A2A、插件市场、Android 和多语言。
- **TDCanvas 是面向图片／视频创作者的桌面 AI 画布**。它把 AI 土豆的 55 项生成操作和 123 个媒体模型做深，配合本地 ComfyUI、图像编辑工具、提示词库、素材库、WebDAV 和本地 Codex／Claude Agent，形成一条“桌面安装即可创作”的路径。

一句话判断：

> **Toonflow 更像“短剧制片工作室”，TDCanvas 更像“装在电脑里的 AI 视觉创作画布”。**

两者在“无限画布、文本／图片／视频／音频生成、节点连线、本地数据、插件扩展”上高度重叠；真正的差异在影视领域深度、模型接入方式、Agent 形态、平台覆盖和许可证。

最重要的三个差异：

1. **领域深度**：Toonflow 有 3D 导演、逐帧拉片、分镜团队和短剧工作流；TDCanvas 没有这些，主要靠文本节点和通用生成节点。
2. **模型策略**：TDCanvas 把 AI 土豆一个渠道做深，操作和模型目录非常完整；Toonflow 内置 provider 较少，但更强调自定义模型、ComfyUI 和插件市场。
3. **许可证**：Toonflow 是 MIT；TDCanvas 是 AGPL-3.0-only。闭源商用或私有化交付时，这是决定性差异，不能直接搬运 TDCanvas 代码。

## 2. 产品定位与用户

| 维度 | Toonflow | TDCanvas |
| --- | --- | --- |
| 核心定位 | AI 短剧、漫剧与短视频创作工具 | TDTV 打造的 AI 无限画布 |
| 第一入口 | 项目／工作区 → 无限画布 | 我的画布 → 无限画布 |
| 主要用户 | 短剧／漫剧创作者、小型工作室 | 图片／视频创作者、AI 绘画与 ComfyUI 用户 |
| 内容单元 | 画布、节点、连线、工作区文件 | CanvasProject、节点、连线、素材 |
| 领域资产 | 角色、场景、道具、分镜团队、3D 导演、拉片 | 图片、视频、音频、文本、生成配置、素材库 |
| 默认运行 | 桌面、Android、Web／Server | Tauri 2 桌面；浏览器仅开发／预览 |
| 数据位置 | 本地工作区或服务器 | WebView 本地存储 + 系统应用数据目录 |
| 商业化 | 开源 + 多租户／计费代码（入口未开放） | 开源 + AI 土豆 API 计费 |

TDCanvas README 明确写的是“AI 无限画布”，并把图片与视频能力收进画布节点，“不再提供单独的生图工作台或视频创作台”。Toonflow README 则强调“短剧、漫剧和短视频”“从小说到剧本、图片和视频”。

**判断**：TDCanvas 更偏“通用视觉创作桌面”，Toonflow 更偏“影视内容生产工具”。如果用户目标是做短剧，Toonflow 的领域匹配度更高；如果目标是做图片、短视频素材和 ComfyUI 工作流，TDCanvas 更聚焦。

## 3. 功能矩阵

| 能力 | Toonflow | TDCanvas | 判断 |
| --- | --- | --- | --- |
| 无限画布 | Vue Flow 节点画布 | 自研 React 画布 | 两者都是核心能力 |
| 多画布标签 | 以工作区／项目切换为主 | 支持同一工作区多项目标签 | TDCanvas 的桌面多标签体验更明确 |
| 文本节点 | 有 | 有 | 接近 |
| 图片节点／生成 | 有，含局部重绘、打光、多角度、宫格切分、全景 | 有，含裁剪、切图、局部编辑、角度、放大 | 两者都强，侧重点不同 |
| 视频节点／生成 | 有，含截取、提取音轨、分离音视频、截帧 | 有生成、播放、下载与参考输入 | Toonflow 的视频后期工具更完整 |
| 音频生成 | 有 | 有，含 Suno 相关操作 | TDCanvas 的音频操作面更宽 |
| 结构化分镜 | 分镜团队 Skill／画布表格 | 无专用分镜模型 | Toonflow 领先 |
| 3D 导演／预演 | 有 `director3dNode` | 无 | Toonflow 领先 |
| 逐帧拉片 | 有 `frameAnalysisNode` | 未检出 | Toonflow 领先 |
| 项目级多轨时间线 | 无 | 无 | 两者都缺 |
| ComfyUI | 通过自定义 provider／工作流适配接入 | 原生本地 ComfyUI 环境、导入向导、宏节点、队列 | TDCanvas 明显领先 |
| 本地 Agent | 内置 Agent、工具、Team、MCP／A2A | 独立 `canvas-agent` + Codex／Claude + MCP + Skill | Toonflow 开箱即用；TDCanvas 更贴近 Codex 生态 |
| 插件市场 | 节点、工具、扩展、技能、团队 | 画布节点插件 SDK、URL 安装、官方注册表 | Toonflow 市场成熟度更高 |
| 提示词库／素材库 | 有 | 有，且提示词中心和素材库做得更细 | TDCanvas 略强 |
| WebDAV 同步 | 未见同等的内置 WebDAV 方案 | 有 | TDCanvas 领先 |
| 多语言 | 21 种 | 中／英 | Toonflow 领先 |
| Android | 有 ARM64 APK | 无 | Toonflow 领先 |
| Web／Server | 有 | 静态 Web／Docker，无业务后端 | Toonflow 领先 |
| 多租户／计费 | 代码存在，设置入口仍“正在开发” | 无账号、无云端 | Toonflow 领先 |

## 4. 技术架构

### 4.1 Toonflow

- Bun + TypeScript monorepo。
- `apps/web`：Vue 3 + Vite。
- `apps/server`：Express 5 + TypeScript。
- `apps/desktop`：Electrobun 桌面壳。
- `apps/mobile`：Android 壳 + Bun 服务。
- `packages/*`：节点、工具、插件、团队、多租户、MCP。
- 前端：Pinia、Vue Flow、Element Plus、TDesign、Three.js。
- 后端：Zod、Pi Agent SDK、Drizzle ORM（多租户）。

桌面与 Android 复用 `@toonflow/server/app` 的 `createApp`。它更像“把完整应用打包到桌面／手机”，服务端能力是内建的。

### 4.2 TDCanvas

- `web/`：React 19 + Vite 7 + TypeScript。
- `web/src-tauri/`：Tauri 2 + Rust 原生层。
- 前端：Ant Design 6、Tailwind 4、Zustand、TanStack Query、react-i18next。
- 本地 Agent：`canvas-agent/`，Node.js + Express + MCP + Codex app-server／Claude CLI。
- ComfyUI：`modules/comfyui-local/`，含 contracts、core、frontend、Tauri 插件。
- 数据：localForage／IndexedDB + Tauri AppLocalData。
- 无业务服务端：正式用户入口是 Tauri 桌面，浏览器只用于开发和预览。

TDCanvas 的调用链更“前端直连”：

```text
React UI
  → 直接请求 AI 土豆或其他配置的 API
  → Tauri 原生 HTTP／文件／媒体缓存

React UI
  → 本机 canvas-agent（127.0.0.1）
  → Codex app-server / Claude CLI
  → MCP 工具调用回到当前画布
```

### 4.3 架构对比

| 维度 | Toonflow | TDCanvas |
| --- | --- | --- |
| 主语言 | TypeScript | TypeScript + Rust |
| 前端 | Vue 3 | React 19 |
| 桌面壳 | Electrobun | Tauri 2 |
| 业务后端 | Bun + Express | 无；仅静态 Web + 本地 Agent |
| 本地推理管理 | 内建媒体 provider | ComfyUI 本地进程管理 |
| 数据层 | 工作区文件 + 多租户 SQL | localForage／IndexedDB + AppLocalData |
| 扩展方式 | 节点／工具／扩展／技能／团队 | ESM 画布节点插件 |
| 多用户 | 多租户代码存在，入口未开放 | 单机单用户 |
| 部署 | 桌面、Android、Web、Docker、服务器 | Windows／macOS 桌面；静态 Web |

**判断**：Toonflow 的后端是“应用的一部分”；TDCanvas 的后端是“可选的本地 Agent + 外部 API”，更多计算和状态在客户端。

## 5. 数据模型与存储

### 5.1 Toonflow

Toonflow 的项目内容主要是：

- 画布 JSON：带 `toonflowCanvas` 标记。
- 文本节点：Markdown 文件。
- 图片、视频、音频：工作区 `assets/`。
- Agent 会话、插件、MCP、团队：工作区配置。
- 多租户 SQL：管理员、用户、会话、模型路由、钱包、计费账本。

优点：

- 工作区可复制、备份、迁移。
- 节点结构自由，新增节点不依赖数据库迁移。
- 桌面、Android、服务器共享同一工作区语义。

不足：

- 章节、角色、分镜、镜头之间没有数据库级关系。
- 跨节点检索和连续性检查依赖 Agent 或额外索引。
- 数据一致性主要靠应用层。

### 5.2 TDCanvas

TDCanvas 的核心是 `CanvasProject`：

```ts
type CanvasProject = {
  id: string;
  title: string;
  nodes: CanvasNodeData[];
  connections: CanvasConnection[];
  chatSessions: CanvasAssistantSession[];
  activeChatId: string | null;
  backgroundMode: "lines" | "dots" | "blank";
  viewport: { x: number; y: number; k: number };
};
```

节点状态存在 `CanvasNodeData.metadata`：

- `content`：当前展示 URL。
- `storageKey`：稳定的本地媒体引用。
- `naturalWidth`／`naturalHeight`／`bytes`／`mimeType`：媒体元信息。
- `providerTask`、`providerResult`：AI 土豆任务与结果。
- `imageHistory`、`references`、`objectReferences`：图片历史、参考图和对象引用。

媒体分层：

- 画布 JSON、素材 JSON：localForage `app_state`。
- 图片 Blob：localForage `image_files`。
- 视频／音频／文件 Blob：localForage `media_files`。
- 桌面媒体缓存：Tauri `AppLocalData/media-cache`。
- 配置与 API Key：Zustand 持久化的客户端配置。
- WebDAV：按 `canvas` 与 `assets` 两个 domain 合并 JSON 和文件清单。

**判断**：TDCanvas 的媒体引用和本地缓存设计比 Toonflow 更细；Toonflow 的工作区语义更统一，且有服务器／多租户数据层。两者都没有影策那样的章节、镜头、分镜版本和产物版本关系模型。

## 6. 画布与节点

### 6.1 Toonflow

Toonflow 的节点包有 9 类：

- 文本、图片、图片生成。
- 视频、视频生成、音频、音频生成。
- 3D 导演台。
- 逐帧拉片。

节点统一由 Vue Flow 渲染，插件可以贡献节点、工具、扩展、技能和团队。画布能力偏“内容生产节点 + 影视专用节点”。

### 6.2 TDCanvas

TDCanvas 的用户可见内置节点有 6 类：

- 文本。
- 图片。
- 视频。
- 音频。
- 生成配置。
- 组。

官方画布插件提供 Markdown、SVG、HTML、3D 全景、便利贴等节点；插件通过 `@tdtv/plugin-sdk` 独立构建，以 ESM 加载。画布支持：

- 多项目标签。
- 拖拽、缩放、小地图、框选、复制粘贴、撤销重做。
- 节点智能对齐与磁吸。
- 连线模式／无线模式。
- 图片裁剪、切图、局部编辑、角度、放大。
- 图片组、批量生成、参考图 @ 引用。
- 画布导入／导出、素材拖入、下载到本地。

**判断**：Toonflow 的节点种类更贴影视；TDCanvas 的桌面画布细节和图像工具更成熟。TDCanvas 的 6 个内置节点比 Toonflow 的 9 个少，但插件可以扩展。

## 7. 图像、视频与音频生成

### 7.1 Toonflow

- 内置 provider：DeepSeek、ApiMart、Metaso、Compshare。
- 支持自定义 OpenAI、Anthropic、OpenAI Responses、ComfyUI、自定义媒体供应商。
- 图片节点有局部重绘、打光、多角度、宫格切分、全景图。
- 视频节点有截取片段、提取音轨、分离音视频、截帧。
- 音频生成与 ASR 能力在 packages 内。

Toonflow 的强项是“生成 + 影视后期小工具 + 3D 导演 + 拉片”的组合，模型接入更自由，但内置模型目录较小。

### 7.2 TDCanvas

TDCanvas 的 AI 能力主要围绕 AI 土豆：

- 55 项操作：通用生成／上传／钱包／转写，16 项 Midjourney，31 项 Suno。
- 123 个媒体模型，外加 Kimi、Whisper、Suno。
- 图片、视频、音频、文本四类原生节点。
- 模型参数、比例、分辨率、数量、参考输入按模型能力校验。
- 价格显示与预估费用。
- 异步任务多 Task ID、部分成功、进度、停止、恢复轮询。
- 结果自动转存到本地媒体目录。

代码保留了 OpenAI、Gemini、Ark、Aitudou 等协议类型，但 `useConfigStore` 的持久化会把配置收敛为官方 AI 土豆 channel。因此，**不能仅凭类型定义说 TDCanvas 已经等价支持多家 provider**；它的产品主路径是 AI 土豆聚合 API。

**判断**：

- 如果要“一个 API Key 用很多国内图片／视频／音频模型”，TDCanvas 更省事。
- 如果要接自己的 OpenAI／Anthropic／ComfyUI 或做 provider 插件，Toonflow 更开放。
- TDCanvas 的模型覆盖是“单渠道的深度”，Toonflow 的模型覆盖是“多渠道的广度”。

## 8. ComfyUI

这是 TDCanvas 相对 Toonflow 最明显的优势。

TDCanvas 的 `modules/comfyui-local` 包含：

- Windows portable、源码 venv、系统 Python 环境识别。
- 本机回环随机端口启动／停止 ComfyUI 进程。
- 进程所有权、日志、状态、依赖探测、进程树清理。
- API Format JSON 导入向导。
- 结合 `/object_info` 检查依赖、选择输入输出。
- 工作流宏节点、具名类型端口、参数面板。
- `/prompt` 提交、`/history` 轮询、停止队列、结果节点回填。
- 跨画布任务持有、重复运行保留历史结果。

Toonflow 的 ComfyUI 路径更像“自定义媒体 provider”：

- README 说明可以配置语言模型与媒体模型，也可通过自定义供应商适配接入已有 ComfyUI 工作流。
- 有面向普通用户的 provider 适配提示词，帮助生成 `.ts` 供应商文件。
- 但没有 TDCanvas 这种本地 ComfyUI 环境管理器、五步导入向导和宏节点体系。

**判断**：如果用户的核心是本地 ComfyUI 工作流，TDCanvas 明显更强；如果只是偶尔通过 API 调 ComfyUI，Toonflow 的自定义 provider 也够用。

## 9. Agent、MCP 与 Skill

### 9.1 Toonflow

Toonflow 的 Agent 运行在服务端，特点：

- Pi Agent SDK 工具循环。
- 画布读写、节点增删、连线、移动、调用节点函数。
- 工作区文件、资产库、浏览器、FFmpeg、联网搜索、网页读取、提问器、沙箱。
- 11 个内置工具方向，另有 MCP 客户端／服务端。
- Agent Team、A2A 1.0、本地团队和远端 Agent。
- 技能菜单、技能编辑器、技能插件。

它是“内建的通用创作 Agent + 团队协作层”。

### 9.2 TDCanvas

TDCanvas 的 Agent 是独立的本地 Node 进程：

- `canvas-agent` 默认监听 `127.0.0.1:17371`。
- 通过 Codex app-server 或 Claude CLI 进行推理。
- 向 Codex／Claude 暴露 30 个 MCP 工具。
- 画布写入先在侧边栏展示工具调用，用户确认后执行。
- 支持线程、历史、模型、reasoning effort、权限模式、审批、诊断日志。
- 支持 Codex 原生 Skill 的选择、启停、创建、编辑、删除，以及从对话／画布生成 Skill 草稿。
- 多标签页有画布会话隔离和焦点回退。

但它是**可选的本机进程**：

- 桌面安装包不自动打包 `canvas-agent`。
- 用户需要单独构建／启动 Agent，填写 URL 和 token。
- 没启动 Agent 时，右侧面板只能停留在连接／设置状态。
- 它是本地单用户控制面，不是多租户云 Agent。

### 9.3 对比

| 维度 | Toonflow | TDCanvas |
| --- | --- | --- |
| Agent 是否内建 | 是，随应用服务启动 | 否，独立本地进程 |
| 推理后端 | Pi Agent SDK + 配置的模型 | Codex app-server／Claude CLI |
| MCP | 客户端 + 服务端 | 服务端（30 个画布工具） |
| 外部 MCP | 支持 | 主要作为 MCP Server；未走 Toonflow 式外部 MCP 客户端 |
| Agent Team／A2A | 支持 | 无产品级团队／A2A |
| Skill | 技能菜单、编辑器、插件 | Codex 原生 Skill 管理 + 草稿生成 |
| 工具范围 | 画布、文件、浏览器、Web、FFmpeg、沙箱、插件开发 | 画布、生成、任务、素材、提示词 |
| 开箱体验 | 好 | 需要另起 Agent，门槛更高 |
| 安全边界 | 服务端工具与工作区权限 | 本地回环、token、Origin、审批 |

**判断**：Toonflow 的 Agent 更完整、更开箱即用，工具范围更广；TDCanvas 的 Agent 更贴近 Codex／Claude 原生能力，适合已经使用 Codex 的开发者，但不是普通用户的零配置功能。

## 10. 插件系统

### 10.1 Toonflow

- 插件类型：节点、工具、扩展、技能、团队。
- 插件市场有安装、更新、卸载、编辑和上传入口。
- 插件可以用 TypeScript／Vue 修改画布 UI 和节点行为。
- MCP 可连接外部工具。
- 插件市场是产品级入口，生态更成熟。

### 10.2 TDCanvas

- 画布节点插件 SDK：`@tdtv/plugin-sdk`。
- 插件是独立 ESM 包，可托管到任意静态地址，通过 URL 安装。
- 官方插件：Markdown、SVG、HTML、3D 全景、便利贴。
- 有官方插件注册表构建脚本，但仓库内没有固定远程发布地址；公开市场成熟度低于 Toonflow。
- 插件代码在画布页面内直接执行，可访问页面数据和 AI API Key；README 明确要求只安装可信来源。

**判断**：Toonflow 的插件市场更完整；TDCanvas 的插件开发体验更轻，适合单节点扩展，但安全和分发体系还在早期。

## 11. 平台、部署与国际化

### 11.1 Toonflow

- Windows x64／ARM64。
- macOS Intel／Apple Silicon。
- Linux x64／ARM64。
- Android ARM64 APK。
- Web／Server、Docker。
- 21 种界面语言。

### 11.2 TDCanvas

- Windows NSIS 安装包。
- macOS 通用 `.app`／`.dmg`。
- 浏览器仅用于开发／预览；Docker 是 Nginx 静态前端，不含业务后端。
- 中文、英文两种界面。

**判断**：Toonflow 的平台覆盖明显更广，尤其 Android、Linux、服务器和多语言；TDCanvas 的 Windows／macOS 桌面安装体验更专注。

## 12. 账号、协作与商业化

TDCanvas 当前是**单机单用户**产品：

- 无账号系统。
- 无云端项目同步（WebDAV 是用户自备）。
- 无多租户、权限、计费后台。
- API Key 保存在本机，AI 请求由 WebView／Tauri 直接发送。

Toonflow：

- 有多租户、钱包、计费账本、模型路由代码。
- 但设置入口仍显示“正在开发”，桌面版主要是单用户本地工作区。
- Web 页面和接口本身是管理端，远程部署需要反向代理认证或私有网络保护。

**判断**：如果要做面向公众的 SaaS、团队协作或私有化多用户平台，Toonflow 的架构基础更好，但仍需补齐产品化；TDCanvas 不适合直接做多用户平台。

## 13. 工程质量与文档

### 13.1 Toonflow

- 约 10.6 万行 TypeScript／TSX／Vue。
- 仓库不保留测试模块，`AGENTS.md` 明确不新增测试模块。
- 质量主要靠类型检查、构建和人工验证。
- 文档偏工程规范、节点 README、发布说明。

### 13.2 TDCanvas

- 约 6.2 万行 TypeScript／TSX + Rust（不含插件和文档）。
- 53 个 TS 测试文件、约 7,700 行；ComfyUI 模块另有 2 个 `.mjs` 测试。
- 40 个中英文 MDX 文档页面，另有架构、PRD、ComfyUI 和 Agent 调研草稿。
- 但文档与实现存在漂移：`features.zh-CN.mdx` 仍写“三类节点／浏览器本地”，代码和 README 已迁移到 6 类内置节点 + Tauri 桌面。
- 大量 `pending-test.mdx` 条目说明功能仍需真实环境验收。

### 13.3 对比

| 维度 | Toonflow | TDCanvas |
| --- | --- | --- |
| 代码规模 | 约 10.6 万行 TS／Vue | 约 6.2 万行 TS + Rust |
| 自动化测试 | 无 | 53 个 TS 测试文件、约 7,700 行 |
| 文档 | 工程规范／节点文档 | 40 个 MDX + 多份草稿 |
| 主要风险 | 回归依赖人工，跨端行为难自动验证 | 文档漂移、待验收项多、插件安全边界弱 |

规模不等于质量。Toonflow 更轻、更容易二次开发；TDCanvas 测试和文档资产更多，但产品仍在快速迭代。

## 14. 许可证：最关键的非技术差异

| 项目 | 许可证 | 影响 |
| --- | --- | --- |
| Toonflow | MIT | 可用于闭源商业产品，保留版权与许可声明即可 |
| TDCanvas | AGPL-3.0-only | 修改后分发或提供网络服务，通常需要按 AGPL 公开对应源代码；项目文档明确表示“禁止闭源商用” |

TDCanvas 的 `LICENSE` 是 GNU Affero General Public License v3.0，`web/src-tauri/Cargo.toml` 标注 `AGPL-3.0-only`。其商务文档提供商业授权、私有化部署和定制开发沟通入口，但商业使用前必须确认授权方式。

对本项目的直接含义：

- **不能把 TDCanvas 的源码、组件、样式或插件直接复制进 MIT 的 Toonflow**，否则可能触发 AGPL 的开源义务。
- 可以研究其产品交互、数据组织、ComfyUI 流程和测试思路，再用独立实现落地；涉及实质性相似代码时建议做法律审查。
- 如果 Toonflow 未来要做闭源商业版，TDCanvas 只能作为“竞品研究”，不能作为代码来源。

## 15. 各自优势与短板

### 15.1 Toonflow 的优势

1. 短剧／漫剧领域更深：3D 导演、逐帧拉片、分镜团队、角色与场景资产。
2. 平台覆盖广：Windows、macOS、Linux、Android、Web／Server、Docker。
3. 21 种语言，国际化基础好。
4. Agent 内建，工具范围广，有 Team／A2A。
5. 插件市场成熟，支持节点、工具、扩展、技能、团队。
6. MIT 许可，商业友好。
7. 工作区文件可复制、迁移、备份。

### 15.2 Toonflow 的短板

1. 没有结构化章节／镜头／分镜版本模型。
2. 没有项目级多轨时间线和成片导出。
3. 内置模型 provider 较少，国内媒体模型覆盖不如 TDCanvas 的 AI 土豆目录。
4. 仓库没有自动化测试，跨端回归压力大。
5. 多租户和计费入口未完成，公开 Web 部署需要额外认证。
6. Agent 和服务端绑定较深，桌面、Android 与远程模式的行为差异需要持续维护。

### 15.3 TDCanvas 的优势

1. AI 土豆接入非常深：55 项操作、123 个媒体模型、价格预估和任务恢复。
2. 本地 ComfyUI 完整闭环：环境管理、导入向导、宏节点、队列、结果回填。
3. 桌面画布体验细：多标签、无线模式、智能对齐、图片裁剪／切图／放大／局部编辑。
4. 提示词中心、素材库、WebDAV 同步完整。
5. 本地 Codex／Claude Agent + 30 个 MCP 工具 + Skill 管理。
6. 53 个测试文件，工程质量意识更强。
7. Tauri 桌面安装包和原生媒体缓存路径清晰。

### 15.4 TDCanvas 的短板

1. AGPL-3.0，闭源商用和私有化交付有强约束。
2. 无账号、云端协作、多租户和计费。
3. 影视领域能力弱：无结构化分镜、3D 导演、逐帧拉片、项目时间线。
4. Agent 不是开箱即用，需要单独启动本地进程。
5. 模型主路径绑定 AI 土豆，provider 自由度低于 Toonflow。
6. 插件在页面内执行，可接触 API Key，安全边界依赖用户信任。
7. 仅中／英两种语言，且文档与实现有漂移。

## 16. Toonflow 可以借鉴什么

### 16.1 产品与交互

1. **桌面安装体验**
   - Tauri 的原生标题栏、启动动画、系统媒体缓存和 Windows／macOS 打包流程。
   - Toonflow 已有 Electrobun 跨端方案，可借鉴 TDCanvas 的原生窗口细节，而不是替换技术栈。

2. **多项目标签**
   - 同一窗口打开多个画布，切换不丢状态，关闭标签不删除项目。

3. **智能对齐与无线模式**
   - 拖动节点时的轴线参考、磁吸、无线连线模式。
   - 这些是低成本、高感知的画布体验优化。

4. **图像工具栏**
   - 裁剪、切图、放大、局部编辑、角度调整。
   - 可与 Toonflow 已有的打光、多角度、全景、宫格切分互补。

5. **模型价格与参数前置**
   - 在生成按钮旁显示预估费用，按模型能力限制比例、分辨率、数量。

### 16.2 工程与生态

1. **ComfyUI 本地模式**
   - 环境发现、进程所有权、随机回环端口、工作流导入向导、宏节点、跨画布任务。
   - 这是 Toonflow 目前最值得补齐的能力之一，但必须独立实现，不能复制 AGPL 代码。

2. **本地 Agent 连接器**
   - 允许用户连接自己的 Codex／Claude，通过 MCP 操作画布。
   - Toonflow 已有 MCP Server／Client，可考虑增加“外部 Coding Agent 连接”作为可选模式。

3. **测试与验收清单**
   - TDCanvas 的 `pending-test` 清单适合参考，但 Toonflow 不应照搬其文档漂移问题。

4. **WebDAV 同步**
   - 对个人用户是低成本的跨设备方案；Toonflow 可用现有服务器／工作区能力做更完整的同步。

### 16.3 不建议照搬

- **不要复制 TDCanvas 代码**：AGPL-3.0 与 Toonflow 的 MIT 不兼容。
- **不要把模型主路径锁死在单一聚合 API**：Toonflow 的开放 provider 和插件市场是优势。
- **不要把 Agent 做成必须另起进程的附加组件**：Toonflow 的内建 Agent 是开箱体验优势。
- **不要为了通用画布放弃影视领域节点**：3D 导演、逐帧拉片、分镜团队是 Toonflow 的差异化。
- **不要把 TDCanvas 的文档当事实**：其功能文档明显落后于代码，必须以源码和 README 为准。

## 17. 选型建议

| 场景 | 更适合 |
| --- | --- |
| 个人创作者，做短剧／漫剧 | Toonflow |
| 需要 3D 导演、逐帧拉片、分镜团队 | Toonflow |
| 需要 Windows／macOS／Linux／Android 多端 | Toonflow |
| 需要 21 种语言或海外发行 | Toonflow |
| 需要插件市场、MCP／A2A、Agent Team | Toonflow |
| 需要闭源商用或 MIT 友好许可 | Toonflow |
| 主要做图片／短视频素材，使用 AI 土豆 | TDCanvas |
| 需要本地 ComfyUI 工作流和宏节点 | TDCanvas |
| 需要提示词中心、素材库、WebDAV | TDCanvas |
| 已经使用 Codex／Claude，想让 Agent 操作画布 | TDCanvas |
| 需要多账号、团队协作、云端 SaaS | 两者都不够，需额外平台层 |

## 18. 三个项目的一句话定位

| 项目 | 定位 |
| --- | --- |
| 影策 | 服务端化的 AI 影视制片平台：项目、章节、镜头、分镜版本、时间线、账号计费 |
| Toonflow | 跨端 AI 短剧／漫剧创作工具：画布、3D 导演、拉片、Agent Team、插件市场 |
| TDCanvas | 桌面 AI 视觉创作画布：AI 土豆、ComfyUI、图像工具、本地 Codex Agent |

如果按“影视生产完整度”排序：影策 > Toonflow > TDCanvas。
如果按“桌面画布与本地创作体验”排序：TDCanvas ≈ Toonflow > 影策。
如果按“跨端与国际化”排序：Toonflow > 影策 > TDCanvas。

## 19. 事实核查备注

| 结论 | 核查依据 |
| --- | --- |
| TDCanvas 正式入口是 Tauri 2 桌面 | `README.md`、`web/package.json`、`web/src-tauri/tauri.conf.json` |
| TDCanvas 浏览器仅开发／预览 | `README.md`、`docs/drafts/tdcanvas-technical-architecture.md` |
| TDCanvas Docker 是 Nginx 静态前端 | `Dockerfile`、`docker-compose.yml`、`render.yaml` |
| TDCanvas 数据存 localForage／AppLocalData | `web/src/stores/canvas/use-canvas-store.ts`、`web/src/services/image-storage.ts`、`web/src-tauri/src/media_cache.rs` |
| TDCanvas 内置 6 类节点 | `plugins/canvas/README.md`、`web/src/components/canvas/nodes/builtin-nodes.tsx` |
| TDCanvas 官方插件 5 个 | `plugins/canvas/markdown`、`svg`、`html`、`panorama`、`sticky-note` |
| TDCanvas Agent 是独立本地进程 | `canvas-agent/README.md`、`docs/drafts/tdcanvas-technical-architecture.md` |
| TDCanvas MCP 有 30 个工具 | `canvas-agent/src/canvas/schemas.ts` 的 `toolNames` |
| TDCanvas 支持 Codex Skill 管理 | `docs/content/docs/progress/pending-test.mdx`、`web/src/components/agent/agent-skills-view.tsx` |
| TDCanvas 有本地 ComfyUI 模块 | `modules/comfyui-local/README.md` |
| TDCanvas 有 WebDAV | `web/src/services/webdav-sync.ts`、`web/src/services/app-sync.ts` |
| TDCanvas 中／英两种语言 | `web/src/i18n/locales/zh-CN.ts`、`en-US.ts` |
| TDCanvas 有 53 个 TS 测试文件 | `find web/src canvas-agent/src web/server -name '*.test.ts' -o -name '*.test.tsx'` 计数 |
| TDCanvas 约 6.2 万行 TS + Rust | `web/src`、`web/server`、`canvas-agent/src`、`web/src-tauri/src`、`modules/comfyui-local` 静态统计 |
| TDCanvas 使用 AGPL-3.0-only | `LICENSE`、`web/src-tauri/Cargo.toml` |
| TDCanvas 文档存在漂移 | `docs/content/docs/overview/features.zh-CN.mdx` 仍写三类节点／浏览器本地，与 README／代码不一致 |
| Toonflow 有 9 类节点 | `packages/nodes` 目录 |
| Toonflow 有 21 种语言 | `packages/i18n/src/locales` 文件数 |
| Toonflow 有 11 个工具方向 | `packages/tools` 目录 |
| Toonflow 有 Agent Team／A2A | `apps/server/src/agent/a2a`、`apps/server/src/agent/teams` |
| Toonflow 多租户入口未开放 | `apps/web/src/components/settings/panels/multiTenant/developmentNotice.vue` |
| Toonflow 当前 MIT | 根 `package.json`、`LICENSE` |

### 规模统计口径

- Toonflow：`apps/` 与 `packages/` 下 `.ts`、`.tsx`、`.vue`，排除 `node_modules`、`build`、`dist`，约 10.6 万行。
- TDCanvas：`web/src`、`web/server`、`canvas-agent/src` 的 `.ts`／`.tsx` 约 5.76 万行；`web/src-tauri/src` 与 `modules/comfyui-local` 的 Rust／TS 约 0.43 万行；合计约 6.2 万行，不含插件和文档。
- TDCanvas 测试：53 个 `.test.ts`／`.test.tsx`，约 7,700 行；不含 `modules/comfyui-local/tests` 的 `.mjs` 测试。

这些是静态代码规模，不代表有效业务代码量或项目质量。
