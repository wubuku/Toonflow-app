# Toonflow vs 影策：AI 影视创作平台对比研究

> 研究性质：只读代码、文档与构建配置比对；不代表对任一项目成熟度、商业价值或代码质量的最终评价。
>
> 对比基线：
> - Toonflow-app：`research` 分支，提交 `91efcb6`。
> - 影策：`/Users/yangjiefeng/Documents/wubuku/open-ai-canvas`，`research` 分支，提交 `3722b01f`。
>
> 证据口径：优先以当前源码和可执行入口为准。影策文档中明确标注“待真实页面验收”“真实环境能力以验收清单为准”的能力，不当作已经完成生产验收。

## 1. 结论摘要

Toonflow 和影策都面向 AI 短剧、漫剧与影视创作，但产品形态不同：

- **Toonflow 是画布优先、跨端分发的 AI 创作工具**。用户从项目／工作区进入无限画布，用文本、图片、视频、音频和 3D 导演台节点完成创作；桌面端、Android 和 Web／Server 共用一套 Bun 服务，强调本地部署、自由接入模型、插件市场、MCP 与 A2A。
- **影策是项目优先、服务端化的 AI 影视制片平台**。用户从作品库进入小说／短剧项目，经过章节、资产、结构化分镜、3D 预演、镜头视频和多轨剪辑完成交付；Go 后端统一管理账号、任务、模型渠道、计费、资源、权限和 Agent 控制面。

一句话判断：

> **Toonflow 更像“装在自己电脑上的 AI 制片工作室”，影策更像“部署在服务器上的短剧生产管理系统 + 创作工作台”。**

两者都覆盖“剧本 → 资产 → 分镜 → 图片／视频 → 成片”，但 Toonflow 把流程放在画布、节点和 Agent Skill 里，影策把流程固化为项目、章节、镜头、版本、产物和工作流步骤。前者更自由，后者更可管理。

## 2. 产品定位与用户

| 维度 | Toonflow | 影策 |
| --- | --- | --- |
| 核心定位 | AI 短剧、漫剧与短视频创作工具 | AI 影视、短剧与视觉预演工作台 |
| 第一入口 | 项目／工作区 → 无限画布 | 作品库 → 小说／短剧项目 |
| 主要用户 | 个人创作者、小型工作室、需要桌面／移动端的团队 | 中文短剧团队、需要账号、计费和多用户管理的部署方 |
| 核心内容单元 | Canvas JSON、节点、连线、工作区文件 | 作品、章节、资产、镜头、分镜版本、产物、时间线 |
| 流程组织 | 画布自由编排 + Agent Skill／Team | 结构化项目 + 六阶段制作工作流 |
| 默认部署 | 桌面／Android 本地，或 Web／Server | 浏览器 + Go 服务端，本地 SQLite 或生产 PostgreSQL |
| 国际化 | 21 种界面语言 | 中文界面 |

Toonflow 的根 `package.json` 将其描述为“AI 短剧漫剧工具”，README 强调“把剧本、资产与视频片段整合进同一张无限画布”。影策 README 则把自己定义为“AI 影视与短剧创作工作台”，并明确“用结构化工作流管理剧本、角色、场景和分镜”。

## 3. 功能矩阵

| 能力 | Toonflow | 影策 | 判断 |
| --- | --- | --- | --- |
| 无限画布 | 核心能力，Vue Flow 节点画布 | 核心能力，自研画布 + 18 类内置节点 | 影策节点种类更多，Toonflow 更轻、更统一 |
| 小说／章节编辑 | 文本节点／工作区文件为主 | 项目章节、正文、字数、章节 AI 分析 | 影策明显更完整 |
| 角色／场景／道具资产 | 画布资产库与角色节点 | 项目资产库、候选确认、版本、角色卡、声音绑定 | 影策更接近制片资产管理 |
| 结构化分镜 | 分镜团队 Skill 与画布表格，不是一等数据模型 | 19 列分镜表、镜头版本、资产绑定、产物版本 | 影策领先 |
| 图片生成 | 有 | 有，含多角度、宫格、局部编辑等 | 影策画布工具更丰富 |
| 视频生成 | 有 | 有，含首尾帧、运镜、续写、局部修改、批量 | 影策更偏生产流水线 |
| 音频生成 | 有 | 有 | 接近 |
| 3D 导演／预演 | `director3dNode`，AI 局部编辑、关键帧导出 | 完整 Previs 工作台，场景／骨骼／灯光／相机／多输出 | 影策代码规模更深；Toonflow 更节点化 |
| 逐帧拉片 | 独立 `frameAnalysisNode`，本地检测 + AI 报告 | 未检出同等的独立拉片节点 | Toonflow 领先 |
| 多轨剪辑 | 只有节点内裁剪、音频分割等局部工具 | 项目级时间线编辑器，动态轨道、字幕、服务端渲染 | 影策领先 |
| 任务中心 | 有画布任务与节点状态 | 有独立任务中心、日志、重试、取消、任务详情 | 影策更平台化 |
| 素材库 | 工作区资产 | 用户素材库、项目资产、引用保护、回收站 | 影策更完整 |
| 分享 | 画布／项目分享能力需按当前入口确认 | 公开画布分享 `/share/canvas/:token` | 影策有明确公开分享路由 |
| 管理后台 | 多租户代码存在，设置入口仍显示“正在开发” | 用户、渠道、模型、支付、存储、公告、日志等完整后台 | 影策明显更成熟 |

## 4. 技术架构

### 4.1 Toonflow

- Bun + TypeScript monorepo。
- `apps/web`：Vue 3 + Vite。
- `apps/server`：Express 5 + TypeScript。
- `apps/desktop`：Electrobun 桌面壳。
- `apps/mobile`：Android 壳，内置 Bun 服务。
- `packages/*`：节点、工具、插件、团队、多租户、MCP。
- 前端使用 Pinia、Vue Flow、Element Plus、TDesign、Three.js。
- 后端使用 Zod、Pi Agent SDK、Drizzle ORM（多租户包）。

桌面端和 Android 复用 `@toonflow/server/app` 的 `createApp`，不是各端重写业务后端。这个架构的优点是跨端一致、开发效率高；代价是桌面壳、移动壳和 WebView 兼容性需要额外维护。

### 4.2 影策

- `web/`：React 19 + Vite + TypeScript。
- `backend/`：Go 1.25 + Gin + GORM。
- 数据：SQLite（本地）或 PostgreSQL（部署）+ Redis（协调）。
- 前端：Ant Design 6、Tailwind 4、Zustand、TanStack Query、Three.js／React Three Fiber。
- 多媒体：FFmpeg、whisper.cpp、浏览器 MediaRecorder。
- Agent：Go 控制面 + Node／Pi runtime，可内嵌或独立 `yingce-agent` 容器。

影策的调用链是 `HTTP → handler → service → app → domain → repository/model → database/storage`，并在生产 Compose 中拆出 PostgreSQL、Redis、migrate、backend、yingce-agent、web 六个角色。它是明确的服务端多用户架构，而不是“把桌面应用搬到浏览器”。

### 4.3 架构对比

| 维度 | Toonflow | 影策 |
| --- | --- | --- |
| 主语言 | TypeScript | TypeScript + Go |
| 前端 | Vue 3 + Vite | React 19 + Vite |
| 后端 | Bun + Express 5 | Go + Gin |
| 桌面 | Electrobun | 无原生桌面壳 |
| 移动 | Android ARM64 | 响应式 Web，无原生 App |
| 数据库 | 工作区文件 + 多租户 SQLite／MySQL | SQLite／PostgreSQL + Redis |
| 部署 | 桌面、Android、Web、Docker、服务器 | 浏览器 + Docker Compose（Postgres／Redis） |
| 多用户 | 多租户代码已存在，入口未开放 | 账号、角色、额度、支付、管理后台完整 |
| 扩展语言 | TypeScript／Vue | TypeScript／React + Go 插件协议 |

**判断**：Toonflow 的架构更适合“单机优先、跨端分发”；影策的架构更适合“服务器部署、多账号运营”。两者不是同一类工程取舍。

## 5. 数据模型

### 5.1 Toonflow：工作区文件 + Canvas JSON

Toonflow 的项目内容主要是：

- 画布：带 `toonflowCanvas` 标记的 JSON。
- 文本节点：Markdown 文件。
- 图片、视频、音频：工作区 `assets/` 下的素材。
- Agent 会话、插件配置、MCP、团队：工作区级文件与配置。

多租户 SQL 独立承载平台数据，包括管理员、用户、会话、设置、模型路由、钱包和计费账本。

优点：

- 工作区可直接复制、备份、迁移。
- 节点结构自由，新增节点类型不依赖数据库迁移。
- 桌面、Android 和服务器可以使用同一套工作区语义。

代价：

- 章节、人物、分镜、镜头之间没有数据库级关系。
- 跨节点检索和连续性检查依赖 Agent 或额外索引。
- 数据一致性主要靠应用层校验。

### 5.2 影策：强关系型影视领域模型

影策的数据模型明显更接近“制片 ERP”：

- `Project`：项目聚合根。
- `ProjectUnit`：章节／集。
- `Asset`、`AssetVersion`、`AssetRepresentation`：资产与版本。
- `Shot`、`ShotRevision`、`ShotArtifact`：镜头、分镜版本、产物版本。
- `ShotAssetReference`：镜头绑定到具体资产版本。
- `WorkflowTemplateVersion`、`WorkflowInstance`、`WorkflowStepInstance`：六阶段制作流程。
- `ProductionTaskLink`：任务与项目、画布、章节、镜头、步骤的关联。
- `TimelineProject`：项目级时间线快照。
- Agent 运行、审批、事件、记忆、预算、计费、支付、资源引用均有独立表。

当前数据库 schema 版本为 47，`backend/internal/model` 下约 118 个结构体。源码中明确区分“分镜脚本版本”“镜头产物版本”和“资产版本”，修改上游只让相关下游产物变 `stale`，不会静默覆盖历史。

优点：

- 长篇项目、上千章、上万镜头可按章节和镜头分页读取。
- 资产、镜头、产物和任务之间有明确归属与版本关系。
- 适合多人、多项目、可审计的生产管理。

代价：

- 领域模型重，新增一种资源要同步表、DAO、Service、Provider、工具和 UI。
- 部署需要数据库迁移，SQLite 与 PostgreSQL 都要兼容。
- 对个人用户的“打开即用”门槛高于 Toonflow。

### 5.3 数据模型对比

| 维度 | Toonflow | 影策 |
| --- | --- | --- |
| 内容真源 | 工作区文件／Canvas JSON | 关系型数据库 |
| 章节／镜头结构 | 以文本节点和 Agent Skill 为主 | 一等领域表 |
| 版本模型 | 画布与文件级 | 资产版本、分镜版本、产物版本、画布 revision |
| 跨项目查询 | 文件级 | SQL 查询与索引 |
| 可移植性 | 强，复制工作区即可 | 依赖数据库备份与资源存储 |
| 生产管理 | 弱 | 强 |

## 6. 画布与节点

### 6.1 Toonflow

Toonflow 的节点包包括：

- 文本节点
- 图片节点
- 图片生成节点
- 视频节点
- 视频生成节点
- 音频节点
- 音频生成节点
- 3D 导演台节点
- 逐帧拉片节点

画布交互以 Vue Flow 为基础，节点是主要的内容和操作单元。优势是结构统一、插件开发门槛低；不足是复杂表格、时间线和项目级状态不适合全部塞进节点。

### 6.2 影策

影策的内置节点类型包括：

- 图片、文本、绘图、分镜脚本
- 技能、配置、视频、音频、画框
- Markdown、SVG、HTML、全景图
- 对比、图表、调色、媒体转换、批量创作表

此外还有插件贡献的节点。画布不是简单节点图，还包含：

- 素材栏、节点栏、任务栏、历史栏。
- 批量创作表。
- 多角度 3D 取景。
- 宫格切分、多选框、框选、抓手。
- 画布版本记录与只读预览。
- 保存冲突检测、本地草稿、恢复历史。

**判断**：Toonflow 的画布更像“统一的节点工作台”；影策的画布更像“可承载多种专业编辑器的创作桌面”。影策的节点和交互面更宽，但也更重。

## 7. 小说、剧本与分镜

这是两者最大的产品差异。

### 7.1 Toonflow

Toonflow 没有影策那种 `ProjectUnit`、`Shot`、`ShotRevision` 领域表。它的剧本与分镜主要体现为：

- 画布文本节点。
- Agent Skill（如 `v118workflow`、`storyboardTeam`）。
- 分镜团队提示词与协作流程。
- 图片／视频节点和连线。

这适合“让 Agent 按方法论执行”，但分镜本身不是可查询、可版本化、可逐镜审批的业务实体。不同项目之间能否保持相同的镜头字段和状态，取决于 Skill 和 Agent 的执行质量。

### 7.2 影策

影策把短剧生产过程拆成六个服务端工作流步骤：

1. 剧情与章节
2. 资产拆分
3. 分镜脚本
4. 黑白动作预演
5. 视频生成
6. 交付与打包

分镜表包含镜头号、时长、剧情、对白、叙事意图、视角、表演调度、景别、情绪、光线、声音、相机、运动、时间节拍、图片提示词、视频提示词、资产绑定、连续性和负面提示词等列。镜头有稳定 ID、版本和多种产物（分镜图、动作预演、视频）。

**判断**：Toonflow 的分镜能力更依赖 Agent 的自律；影策的分镜能力由数据库和服务端状态机约束。前者灵活，后者可管理。

## 8. 3D 导演台与预演

### 8.1 Toonflow

`packages/nodes/director3dNode` 约 2,600 行，提供：

- 低多边形关节人偶。
- 场景、道具、机位、运镜。
- 关键帧与动画轨道。
- AI 局部编辑（`readDocument`／`editDocument`）。
- 关键帧导出 PNG、动画导出 MP4 到视频节点。

它的产品形态是“画布里的一个节点”，与生成节点、图片节点、视频节点直接相连，适合快速做镜头预演。

### 8.2 影策

影策的 Previs 工作台由 `web/src/components/canvas/previs` 与 `web/src/lib/canvas/previs` 组成，静态代码约 9,700 行，包含：

- 场景、物件、演员、模型、灯光、相机、镜头。
- 摆场、姿态、动画、摄影机四种工作模式。
- 骨骼、姿势、运动片段、关键帧、缓动、运动路径。
- clay／beauty／depth／normal／pose 多种视图。
- 浏览器 Three.js 预览、PNG 截帧、MediaRecorder 白膜视频。
- Agent 语义读写与浏览器预演请求。

影策的预演台在领域建模和动画编辑上明显更深；但其功能文档将当前版本标为“3D-BOX 核心 MVP（待真实页面验收）”，复杂场景编辑、Agent 语义写入和多镜头剪辑仍在后续阶段。

**判断**：如果只看代码深度，影策预演台更完整；如果看与生成链路的紧密度和节点化体验，Toonflow 更直接。两者都不应当在未做真实设备验收前宣称生产可用。

## 9. 时间线与成片

### 9.1 Toonflow

Toonflow 有节点内的视频裁剪、音轨提取、音频分割等媒体工具，但没有项目级多轨时间线。成片通常需要导出素材后在外部剪辑软件完成，或由 Agent 通过 FFmpeg 工具做局部处理。

### 9.2 影策

影策有独立的时间线编辑器：

- 动态轨道：视频、图片、文本、音频、字幕。
- 添加、删除、移动、修剪、拆分片段。
- 200 层撤销／重做。
- 字幕转写（whisper.cpp）与字幕轨。
- 服务端 FFmpeg 按渲染计划导出成片。
- AI 编辑助手：自然语言转命令，超过 3 条命令先预览差异。
- 编辑器预设插件化，命令执行有权限校验和失败关闭。

**判断**：影策在“从镜头到成片”的最后一公里明显领先；Toonflow 更适合把成片交给外部 NLE 或简单的节点级处理。

## 10. Agent 与 AI 控制面

### 10.1 Toonflow

Toonflow 的 Agent 运行在服务端，能力包括：

- Pi Agent SDK 工具循环。
- 画布读写、节点增删、连线、移动、调用节点函数。
- 工作区文件、资产库、浏览器、FFmpeg、联网搜索、网页读取、提问器。
- MCP 客户端与服务端。
- Agent Team、A2A 1.0、本地团队与远端 Agent。
- 技能、团队、插件和模型网关。

Toonflow 的 Agent 更像“可以操作整个工作区和外部工具的通用创作 Agent”。它不仅能改画布，还能读写文件、访问浏览器、调用外部 MCP 服务。

### 10.2 影策

影策的 Agent 是“Go 控制面 + Node Pi runtime”：

- 持久化运行、事件日志、SSE 重放、断线恢复。
- 运行中插话、计划、追问、审批、预算。
- 用户级、项目级、画布级偏好。
- 个人记忆：待审、按需召回、可导出、可压缩。
- Canvas 能力注册表：节点类型、字段、连线限制由服务端描述。
- 结构化分镜、批量表、预演场景的专用工具。
- 媒体生成走任务 admission、审批、额度和 Worker。

同时，影策明确没有开放：

- 任意 Shell。
- 任意文件系统读写。
- 浏览器或 Web 搜索工具。
- 外部 MCP。
- 绕过服务端任务的直接模型调用。

其云端 Agent 的写入与生成仍标注为“待真实环境验收”，所以应区分“代码能力”和“生产验收”。

### 10.3 对比

| 维度 | Toonflow | 影策 |
| --- | --- | --- |
| 运行位置 | Server | Go 控制面 + Node runtime |
| 通用工具 | 文件、浏览器、Web、FFmpeg、MCP | 画布、任务、分镜、预演、媒体、技能 |
| 外部 MCP | 支持 | 明确未开放 |
| A2A／团队 | 支持 | 未见产品级 A2A |
| 审批与预算 | 有 | 有，且是核心设计 |
| 持久化运行 | 会话／团队运行时 | 追加事件、快照、恢复、租约 |
| 记忆 | 个人化设置 | 用户审批记忆 + 按需召回 |
| 安全边界 | 工作区路径、MCP 凭证 | 服务端能力注册表、审批、预算、幂等 |

**判断**：Toonflow 的 Agent 更开放、更通用；影策的 Agent 更受控、更可审计，适合收费媒体生产。

## 11. 插件与模型生态

### 11.1 Toonflow

- 插件市场：节点、工具、扩展、技能、团队。
- 插件以 TypeScript／Vue 开发，可修改画布 UI 和节点行为。
- MCP 可连接外部工具。
- 内置模型 provider 较少，但支持 OpenAI、Anthropic、OpenAI Responses、DeepSeek、ComfyUI 和自定义媒体供应商。
- 强项是“插件市场 + 外部 Agent 生态”。

### 11.2 影策

- `plugin-packages/` 下约 103 个 `.yingce-plugin` 清单，覆盖 OpenAI、Anthropic、Gemini、Bedrock、Azure、Qwen、豆包、即梦、可灵、MiniMax、Runway、Luma、Pika、Replicate、Fal、RunningHub、ComfyUI、支付等。
- 插件以声明式 Manifest 为主，后端按协议执行。
- 有内置应用插件（Eagle、提示词优化器、AI 审美批改、媒体转换、编辑器预设）。
- 有插件权限、版本、安装包校验和沙箱演进方向。
- 但公开插件市场仍在演进，当前更偏“官方协议包 + 管理端安装”。

### 11.3 对比

| 维度 | Toonflow | 影策 |
| --- | --- | --- |
| 插件重点 | UI／节点／工具／团队 | 模型协议／Provider／支付 |
| 公开市场 | 有插件市场入口 | 以官方包为主，公开市场未完成 |
| 模型覆盖 | 精选内置 + 自定义 | 103 个插件包（以模型／协议为主），覆盖面更广 |
| 第三方 UI 插件 | 支持 | 有 slot 机制，但公开生态较早 |
| MCP | 支持 | 未开放 |

**判断**：Toonflow 的插件更像“创作者可安装的应用”；影策的插件更像“模型与协议的适配层”。前者生态更开放，后者模型覆盖更广。

## 12. 账号、计费与运营

影策在这一维度明显更完整：

- 用户注册、登录、OAuth、邮箱验证码、密码找回。
- 管理员与普通用户角色。
- 系统渠道、用户自定义渠道、逻辑模型、价格档。
- 积分、充值、兑换码、签到、支付插件、对账。
- 存储配额、素材回收站、资源引用保护。
- 公告、常驻通知、站点外观、皮肤主题、SEO、ICP 备案。
- 任务、日志、请求记录、成本与销售金额。
- 管理后台用户、渠道、模型、支付、存储、公告、Agent 记忆。

Toonflow 也有多租户、钱包、计费账本和模型路由代码，但设置入口仍显示“正在开发”，桌面版主要是单用户本地工作区。其公开 Web 页面和接口本身是管理端，远程部署需要反向代理认证或私有网络保护。

**判断**：如果目标是做面向公众的 SaaS 或私有化多用户平台，影策的现成运营能力更强；如果目标是个人桌面工具或小团队本地部署，Toonflow 更合适。

## 13. 平台与部署

### 13.1 Toonflow

- Windows x64／ARM64
- macOS Intel／Apple Silicon
- Linux x64／ARM64
- Android ARM64
- Web／Server
- Docker

### 13.2 影策

- 浏览器（桌面与移动响应式）
- Docker Compose：web、backend、PostgreSQL、Redis、migrate、yingce-agent
- 无原生桌面或移动 App

**判断**：Toonflow 的“最后一公里安装体验”更好；影策的“服务器部署和多人访问”更好。

## 14. 工程质量与文档

### 14.1 Toonflow

- 代码规模约 10.6 万行 TypeScript／TSX／Vue。
- `AGENTS.md` 明确不新增测试模块，仓库内没有 `.test.ts`／`.spec.ts`。
- 质量主要靠类型检查、构建和人工验证。
- 文档偏工程规范、节点 README、发布说明。

### 14.2 影策

- 代码规模约 36.7 万行 TypeScript／Go（其中 `web/src` 约 17.6 万行，`backend` 约 19.2 万行，不含第三方）。
- `web/test` 与 `backend` 中约 642 个测试文件，`tests/canvas-contract` 另有 42 个 Go 合同测试文件；测试代码合计约 10 万行。
- `docs/` 下约 259 个 Markdown／MDX 文件，包含架构、ADR、功能、代码地图、数据库、待测试和深度调研。
- 数据库 schema 版本 47，有迁移、校验和回退边界说明。
- 仓库自身也明确区分“已实现”“代码意图”“静态推断”“待验证”。

### 14.3 对比

| 维度 | Toonflow | 影策 |
| --- | --- | --- |
| 代码规模 | 约 10.6 万行 TS／Vue | 约 36.7 万行 TS／Go |
| 自动化测试 | 仓库不保留测试模块 | 约 684 个测试文件、约 10 万行 |
| 文档 | 工程规范和节点文档 | 架构、ADR、数据库、功能、验收文档 |
| 主要风险 | 回归依赖人工，跨端行为难自动验证 | 代码和领域模型重，维护成本高 |

规模不等于质量。Toonflow 更轻、更容易理解和二次开发；影策更重，但生产治理和测试资产明显更多。

## 15. 许可证

- Toonflow 当前为 MIT。
- 影策当前为 MIT。

两者都可以用于商业项目；但都需要继续核查第三方依赖、模型服务条款、素材版权和用户生成内容的合规边界。

## 16. 各自优势与短板

### 16.1 Toonflow 的优势

1. 桌面、Android、Web／Server 多端覆盖。
2. 21 种语言，国际化基础好。
3. 本地工作区可复制、迁移、备份。
4. 画布节点统一，插件开发门槛低。
5. MCP、A2A、Agent Team 生态开放。
6. 逐帧拉片、3D 导演台等节点与生成链路结合紧密。
7. 对个人创作者和小团队更轻。

### 16.2 Toonflow 的短板

1. 没有结构化项目、章节、镜头、分镜版本和产物版本模型。
2. 没有项目级多轨时间线和成片导出。
3. 生产管理、权限、计费和多用户入口不完整。
4. 仓库没有自动化测试，跨端回归压力大。
5. 分镜质量高度依赖 Agent 和 Skill。

### 16.3 影策的优势

1. 结构化小说／短剧项目与六阶段工作流。
2. 章节、资产、镜头、分镜版本、产物版本完整。
3. 项目级时间线、字幕、服务端渲染。
4. 3D 预演台领域模型和动画编辑更深。
5. 账号、积分、支付、管理后台、存储配额完整。
6. 103 个插件包（以模型／协议为主），国内外供应商覆盖广。
7. 测试和文档资产丰富。

### 16.4 影策的短板

1. 仅中文界面，国际化弱。
2. 只有浏览器，无原生桌面／移动 App。
3. 服务端部署和运维复杂，个人用户门槛高。
4. 代码和领域模型重，二次开发成本高。
5. 公开插件市场和第三方 UI 生态仍在早期。
6. 部分 Agent 写入、生成和 3D 预演仍待真实环境验收。
7. 外部 MCP、Shell、浏览器、Web 搜索等通用 Agent 能力未开放。

## 17. 可借鉴点

### 17.1 Toonflow 可借鉴影策

1. **项目／章节／镜头领域模型**
   - 把小说、章节、角色、场景、道具、镜头、分镜版本和产物版本做成一等数据。
   - 这能补足 Toonflow 目前以文本节点和 Skill 承载故事内容的不足。

2. **结构化分镜表**
   - 19 列分镜字段、镜头行 ID、资产绑定、版本和状态。
   - 比纯文本分镜更适合团队协作和逐镜生产。

3. **项目级时间线**
   - 动态轨道、字幕转写、FFmpeg 渲染、AI 编辑命令。
   - 补足 Toonflow 从镜头到成片的最后一公里。

4. **3D 预演的领域建模**
   - 场景、演员、骨骼、灯光、相机、镜头、关键帧、缓存的分离。
   - 尤其是“场景内容 / UI 状态 / 渲染资源 / 保存状态”四层拆分。

5. **任务与资源治理**
   - 任务 admission、租约、取消、重试、计费快照、资源引用保护。
   - 对 Toonflow 的插件和 Agent 生成链路有参考价值。

6. **服务端能力注册表**
   - Agent 可写字段、节点类型、连线限制由服务端描述。
   - 比让 Agent 直接操作任意 JSON 更安全。

### 17.2 影策可借鉴 Toonflow

1. **跨端分发**
   - 桌面壳、Android 壳和统一 Server。
   - 降低“必须在服务器上部署”的使用门槛。

2. **国际化**
   - 21 种语言的组织方式。

3. **MCP**
   - 把影策的画布、任务和资产能力暴露给外部 Agent。

4. **A2A 与团队**
   - 标准 Agent Card、任务、消息、Artifact。

5. **插件市场**
   - 发现、安装、配置、版本、更新的完整用户流程。

6. **逐帧拉片**
   - 本地镜头检测 + AI 分镜报告，与项目分镜链路可以互补。

7. **节点化 3D 导演台**
   - 把预演压缩成一个可直接连接的节点，降低普通用户的使用门槛。

### 17.3 不建议直接照搬

- 不要把影策的 Go + Postgres + Redis 架构直接搬进 Toonflow；Toonflow 的桌面和 Android 本地运行需要轻量数据层。
- 不要把 Toonflow 的 Vue + Bun 技术栈直接搬进影策；影策的 React + Go 已经形成稳定边界。
- 不要因为影策文档完整就认为所有能力都已生产验收；其自身明确标注了多项待验证。
- 不要为了“功能全”把 Toonflow 画布塞满表格、时间线和项目后台；应通过可选模块或独立工作台扩展。

## 18. 选型建议

| 场景 | 更适合 |
| --- | --- |
| 个人创作者，想装在自己电脑上 | Toonflow |
| 需要 Android 端或离线使用 | Toonflow |
| 需要 21 种语言或海外发行 | Toonflow |
| 需要 MCP／A2A／外部 Agent 协作 | Toonflow |
| 需要把小说批量做成短剧，强调章节、镜头、版本管理 | 影策 |
| 需要多账号、积分、支付、管理后台 | 影策 |
| 需要项目级时间线和成片导出 | 影策 |
| 需要深度 3D 预演和骨骼动画 | 影策（但需自行验收） |
| 需要大量国内外模型协议开箱即用 | 影策 |
| 需要轻量、可读、易二次开发的代码库 | Toonflow |

## 19. 事实核查备注

| 结论 | 核查依据 |
| --- | --- |
| 影策使用 React 19 + Vite + Ant Design + Tailwind | `web/package.json` |
| 影策使用 Go 1.25 + Gin + GORM | `backend/go.mod` |
| 影策生产部署使用 PostgreSQL + Redis | `docker-compose.deploy.yml` |
| 影策当前 schema 版本 47 | `backend/internal/database/migrations.go` |
| 影策内置 18 类画布节点 | `web/src/types/canvas.ts` 的 `CanvasNodeType` |
| 影策有约 103 个插件包 | `plugin-packages/*/manifest.json` 计数 |
| 影策六阶段短剧工作流 | `backend/internal/app/project_workflow.go` |
| 影策时间线 200 层历史 | `web/src/lib/timeline/editor-history.ts` |
| 影策预演台约 9,700 行 | `web/src/components/canvas/previs` + `web/src/lib/canvas/previs` 统计 |
| 影策测试约 684 个文件、10 万行 | `web/test`、`backend`、`tests/canvas-contract` 统计 |
| 影策中文界面 | `web/src/components/layout/app-providers.tsx` 使用 `zhCN` |
| 影策无原生桌面／移动壳 | 仓库无 Tauri、Electron、Capacitor 配置，仅 Web／Docker |
| 影策未开放外部 MCP | `docs/content/docs/overview/features.mdx` 明确“未开放外部 MCP” |
| 影策 Agent 写入／生成待验收 | 同文件“真实模型计费与浏览器联调仍待验收” |
| Toonflow 多端复用 `createApp` | `apps/desktop/src/index.ts`、`apps/mobile/src/server.ts` |
| Toonflow 有 MCP 与 A2A／团队 | `packages/mcp/README.md`、`packages/teamScaffold`、`packages/teams` |
| Toonflow 有 21 种语言 | `README.md`、`packages/i18n/src/locales` |
| Toonflow 仓库不保留测试模块 | `AGENTS.md`；`.test.ts`／`.spec.ts` 计数为 0 |
| Toonflow 当前 MIT | 根 `package.json`、`LICENSE` |
| 影策当前 MIT | `LICENSE` |

### 规模统计口径

- Toonflow：`apps/` 与 `packages/` 下 `.ts`、`.tsx`、`.vue`，排除 `node_modules`、`build`、`dist`，约 10.6 万行。
- 影策：`web/src` 下 `.ts`、`.tsx` 约 17.6 万行；`backend` 下 `.go` 约 19.2 万行（不含 `third_party`）。
- 影策测试：`web/test` 与 `backend` 约 642 个，`tests/canvas-contract` 42 个，合计约 684 个；测试代码约 10 万行。

这些是静态代码规模，不代表有效业务代码量或项目质量。
