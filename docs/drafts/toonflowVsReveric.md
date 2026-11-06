# Toonflow vs Reveric：AI 创作工作台对比研究

> 研究性质：只读代码与文档比对，不代表对任一项目成熟度、商业价值或代码质量的最终评价。
>
> 对比基线：
> - Toonflow-app：`research` 分支，基线提交 `6086cdf`（创建研究分支时的 `master`）。
> - Reveric：`/Users/yangjiefeng/Documents/wubuku/reveric`，`research` 分支，提交 `4354c8e`。
>
> 核查原则：产品能力优先以当前源码和运行入口为准；Reveric 的 `CONTEXT.md`、`docs/adr/` 和 `docs/solutions/` 中明确标注为规划、预留或未连接的内容，不当作已实现能力。

## 1. 结论摘要

Toonflow 和 Reveric 都覆盖 AI 辅助的短剧／漫剧生产，但产品起点和核心架构不同：

- **Toonflow 是平台化、画布优先的 AI 制片工具**。核心内容单元是无限画布上的节点，围绕节点组织剧本、角色、场景、图片、视频和音频，并通过插件市场、MCP、A2A 与多租户服务做平台化扩展。
- **Reveric 是本地优先、故事领域优先的创作工作台**。核心内容单元是“作品”，先有小说／剧本的章节、人物、伏笔、关系、季集场等结构，再把画布、3D 导演台和多轨剪辑作为作品的制作阶段。

一句话判断：

> **Toonflow 更像“平台化的 AI 制片工厂”，Reveric 更像“作家的 AI 工作室 + 完整后期工具链”。**

两者不是直接替代关系。Toonflow 的优势在服务端平台化、开放插件生态和多端部署；Reveric 的优势在故事数据模型、Agent 创作协作、本地数据主权和从文字到成片的完整链路。

## 2. 产品定位与主流程

### 2.1 Toonflow

Toonflow 的根 `package.json` 将其描述为“AI 短剧漫剧工具”，README 的定位是面向短剧、漫剧与短视频制作的开源 AI 创作平台，把剧本、资产与视频片段整合进同一张无限画布。

典型流程：

1. 创建或打开项目／工作区。
2. 在无限画布上创建文本节点，编写剧本、人物设定和镜头描述。
3. 通过图片生成节点制作角色、场景和分镜图。
4. 通过视频生成节点生成镜头，或使用 3D 导演台节点预演运镜。
5. 在画布上预览、整理、下载素材，或交给 Agent 操作画布和节点。

Toonflow 的内容层以**工作区文件 + Canvas JSON + 节点**为主。仓库中没有检出 Reveric 那种把章节、人物、伏笔、剧本季／集／场拆成独立关系表的领域模型；小说和剧本内容主要由文本节点及工作区文件承载。

### 2.2 Reveric

Reveric 的 README 将其定位为“AI Native 桌面创作工作台”，覆盖长篇小说、剧本改编与短剧／漫剧制片，强调 Local-First 和 BYOK。

典型流程：

1. 在作品库中创建小说或剧本作品。
2. 在小说编辑器中维护卷、章、大纲、人物、势力、地点、物品、伏笔、地图和实体关系。
3. 在剧本编辑器中维护季、集、场、节拍、角色和场景元素。
4. 将剧本转为画布分镜，生成图片、音频和视频素材。
5. 进入 3D 导演台布置机位与运镜。
6. 在 6 轨剪辑台完成素材上轨、分割、字幕、音频处理和成片导出。

### 2.3 产品对比

| 维度 | Toonflow | Reveric |
| --- | --- | --- |
| 核心入口 | 项目／工作区 → 无限画布 | 作品库 → 小说／剧本编辑器 |
| 核心内容单元 | 节点与连线 | 作品、章节、角色、剧本场次等故事实体 |
| 主要用户 | 短剧、漫剧、短视频制作团队 | 长篇小说作者、编剧、独立创作者 |
| 内容组织 | 画布自由编排 | 强结构化的故事资产 + 画布／分镜 |
| 制作链路 | 素材生成、节点预览、节点级媒体处理 | 小说 → 剧本 → 分镜 → 3D 预演 → 多轨剪辑 |
| 扩展方式 | 插件市场、MCP、A2A、Agent Team | Agent Skills、插件 SDK、MCP、多 Agent 模式 |
| 数据主权 | 可本地或服务器部署 | 默认全部在本地设备 |

**关键差异**：Toonflow 允许用户从空白画布自由搭建流程，灵活度高；Reveric 先提供强约束的故事领域，再由 Agent 和画布辅助创作，连续性、可追溯性和专业编辑体验更强。

## 3. 技术架构

### 3.1 Toonflow

Toonflow 是 Bun + TypeScript 的 monorepo：

- `apps/web`：Vue 3 + Vite 前端。
- `apps/server`：Express 5 + TypeScript 业务服务，导出 `createApp`。
- `apps/desktop`：Electrobun 桌面壳，内嵌同一套 Server。
- `apps/mobile`：Android 壳，内置 Bun 服务，也可连接桌面或远程后端。
- `apps/updateServer`：更新服务。
- `packages/*`：节点、工具、扩展、团队、多租户等可复用包。

前端使用 Vue 3、Vite、Pinia、Vue Flow、Element Plus、TDesign 和 Three.js；服务端使用 Express 5、Zod，以及 Pi Agent SDK（`@earendil-works/pi-coding-agent`）。

Toonflow 的桌面端和 Android 端并不是各自重写业务后端，而是分别启动或连接 `@toonflow/server/app` 的 `createApp`。这使 Web、桌面和移动端共享同一套服务端业务逻辑。

### 3.2 Reveric

Reveric 是单体的 Flutter 应用：

- 桌面与移动端共享 `lib/shared`，UI 分别位于 `lib/desktop` 和 `lib/mobile`。
- 状态层混用 Riverpod、flutter_hooks、MobX 和 Provider。
- 数据层使用 Drift／SQLite。
- 原生能力通过 `flutter_rust_bridge`、FJS／QuickJS、FFmpeg、`flutter_scene` 等接入。
- AI 请求由客户端直接连接模型供应商，符合 BYOK 模式。

### 3.3 架构对比

| 维度 | Toonflow | Reveric |
| --- | --- | --- |
| 主语言 | TypeScript | Dart |
| UI | Vue 3 + Vite | Flutter |
| 业务运行位置 | Node／Bun Server | Flutter 客户端进程 |
| 桌面壳 | Electrobun | Flutter 原生桌面 |
| 服务端 | Express 5，独立可部署 | 无独立业务服务端 |
| 数据库 | 工作区文件 + 多租户 SQL（SQLite／MySQL） | 应用 SQLite + 每作品独立 SQLite |
| 原生能力 | Three.js、FFmpeg、Bun 原生能力 | Rust／QuickJS、FFmpeg、Flutter Scene |
| 部署 | Web、Docker、服务器、桌面、Android | Windows、macOS、Android 客户端 |
| 多用户 | 多租户代码已存在，设置入口仍显示“正在开发” | 本地 Profile，无租户体系 |

## 4. 数据模型

### 4.1 Toonflow：文件优先，SQL 辅助平台能力

Toonflow 的项目内容主要保存在工作区：

- 画布以带 `toonflowCanvas` 标记的 JSON 文件保存。
- 文本节点正文保存为 Markdown 文件。
- 图片、视频、音频等素材保存在工作区 `assets/` 等目录。
- Agent 会话、插件配置、MCP、团队等工作区级数据由文件和服务配置管理。

多租户 SQL 则独立承载平台数据，`packages/multiTenant/db/schema.ts` 同时定义 SQLite 和 MySQL 表，覆盖管理员、用户、Web Session、设置、来源映射、模型路由、钱包和计费账本。

这种模型的优点是：

- 工作区可直接复制、迁移和备份。
- 画布节点结构自由，适合插件扩展。
- 项目数据不依赖固定业务表，新增节点类型成本低。

代价是：

- 故事实体之间没有数据库级关系约束。
- 章节、人物、伏笔等跨节点检索要依赖文件扫描或额外索引。
- 数据一致性主要靠应用层校验，而不是 schema。

### 4.2 Reveric：强关系型领域模型

Reveric 把数据拆成两层 SQLite：

- **应用数据库**：作品库、集合、设置、模型供应商、AI 会话、Agent、技能、插件、资产、生成任务等。源码中约 37 张表。
- **作品内容数据库**：每个作品独立一个 SQLite 文件，保存章节、角色、大纲、伏笔、文档、画布、实体关系、剧本季／集／场、地图、制作片段、剪辑文档等。源码中约 33 张表。

`Novels.contentDatabasePath` 指向作品内容库路径，`NovelContentDatabase` 按作品打开并缓存数据库连接。此设计的优点是：

- 单作品数据边界清晰，便于单独备份、导出和迁移。
- 强类型表和索引适合复杂故事关系与连续性查询。
- 单个作品损坏时，不会直接污染其他作品。

代价是：

- 跨作品查询需要额外打开多个数据库。
- 作品数量多时，数据库连接管理和迁移成本更高。
- 每新增一种故事资源，都要同步 DAO、Service、Provider、AI 工具和 UI，开发成本较高。

### 4.3 数据模型对比

| 维度 | Toonflow | Reveric |
| --- | --- | --- |
| 内容真源 | 工作区文件／Canvas JSON | 每作品 SQLite |
| 平台数据 | 多租户 SQL | 应用 SQLite |
| 结构约束 | 以 JSON 结构和应用校验为主 | 强类型表、索引、迁移 |
| 跨作品查询 | 文件级操作较直接 | 需跨数据库打开 |
| 扩展新节点 | 低门槛 | 需改数据库和领域层 |
| 长篇连续性 | 依赖文本与 Agent 维护 | 内建章节、关系、伏笔、状态等模型 |

## 5. Agent 与 AI 能力

### 5.1 Toonflow

Toonflow 的 Agent 运行在服务端，核心能力包括：

- 基于 Pi Agent SDK 的工具调用循环。
- 画布桥接：读取画布、增删节点、连线、移动节点、调用节点函数。
- 工具系统：工作区文件、资产库、浏览器、FFmpeg、联网搜索、网页读取、提问器等。
- MCP：连接外部工具与服务。
- Agent Team 与 A2A 1.0：支持本地团队、子 Agent、远端 Agent 协作。
- 服务端统一模型网关、供应商路由和多租户计费。

Toonflow 的强项是“Agent 能直接操作画布和节点”，适合把生成、排版、媒体处理串成可执行流程。

### 5.2 Reveric

Reveric 的 Agent 运行在 Flutter 客户端，核心能力包括：

- 单一 Chat Orchestrator，用户不需要选择主 Agent。
- Chat Subagent、Spawn Session、后台委派和异步完成唤醒。
- 会话级运行时，多个聊天会话可并行运行。
- 上下文压缩、Session Handoff、按需读取历史。
- Codemode：模型在受限 JavaScript 运行时中组合多个数据工具。
- 多种专用会话模式：议事厅、独白、剧场、角色扮演。
- 面向小说／剧本资源的细粒度工具：Read、Write、Edit、Replace、GraphSearch、Canvas、Screenplay 等。
- MCP 客户端和 WeChat 远程助手。

### 5.3 Agent 对比

| 维度 | Toonflow | Reveric |
| --- | --- | --- |
| 运行位置 | Server | Flutter 客户端 |
| 主 Agent 模型 | 主会话 Agent + 子 Agent／团队 | Chat Orchestrator + Chat Subagent |
| 画布操作 | 强，直接操作节点和节点函数 | 强，通过 Canvas 工具操作当前画布 |
| 工作区操作 | 文件工具为主 | 结构化资源工具为主 |
| 多 Agent 协议 | A2A 1.0、Agent Team | 子 Agent、后台委派、专用会话模式 |
| 上下文管理 | 会话与团队运行时 | 会话运行时、压缩、Handoff、按需历史 |
| 模型计费 | 多租户网关与钱包 | BYOK，本地用量统计 |
| 远程入口 | Web／移动端／A2A | WeChat 远程助手、MCP |

**判断**：Toonflow 更偏“平台执行与外部协作”，Reveric 更偏“长文本创作中的上下文管理与多 Agent 协作”。

## 6. 插件与扩展体系

### 6.1 Toonflow

Toonflow 有较完整的插件市场：

- 节点插件：文本、图片、视频、音频、3D 导演台、逐帧拉片等。
- 工具插件：工作区、资产库、画布、浏览器、FFmpeg、联网搜索、网页读取、提问器等。
- 扩展插件：画布节点菜单、图片、Markdown、媒体、文本等。
- 团队／Agent 包：通过 A2A 或本地团队安装。
- 插件市场有搜索、安装、配置、版本和更新流程；其中 Agent 分类入口仍标注为测试关闭状态。

插件使用 TypeScript／Vue 和 Vite 构建，开发体验接近前端工程；代价是插件运行在宿主进程，安全边界主要依赖宿主校验和信任模型。

### 6.2 Reveric

Reveric 的插件体系更偏“受控运行时”：

- 插件使用 TypeScript／TSX 开发。
- 逻辑运行在 FJS／QuickJS，页面使用 A2UI 描述并由宿主 Catalog 渲染。
- Manifest 声明 capability 权限，宿主按调用校验。
- 插件不能直接访问 Drift、Riverpod、文件系统、任意网络或 Flutter BuildContext。
- 有插件 API 版本、资源限制、安装包校验、插件私有数据库等机制。
- SDK `reveric-plugin-sdk` 单独以 MIT 发布，主仓库为 AGPL-3.0。

Reveric 的 Agent Skill 另有独立体系：Bundled Control Skill、Official Skill、Novel Local Skill、Private Agent Skill 和 Novel Installation。其 Skill Marketplace 在 `CONTEXT.md` 中明确标注为“预留、未连接”，当前不能视为已上线市场。

### 6.3 插件对比

| 维度 | Toonflow | Reveric |
| --- | --- | --- |
| 插件形态 | Node、Tool、Ext、Skill、Team | Plugin（逻辑 + A2UI 页面）、Agent Skill |
| UI 技术 | Vue／TSX 组件运行在 WebView | TSX 编译到 JS，A2UI 由 Flutter 渲染 |
| 运行时 | Bun／Node 宿主 | FJS／QuickJS + Flutter |
| 生态状态 | 有插件市场 | 本地导入／安装为主，Skill 市场预留 |
| 安全边界 | 宿主权限校验，插件处于应用进程 | capability 白名单，QuickJS 隔离 |
| 开发门槛 | 接近普通 Vue 插件开发 | 需遵守 SDK、A2UI Catalog 与 capability 契约 |

**判断**：Toonflow 的插件生态更开放、更接近商业化市场；Reveric 的插件架构更受控，适合对权限和跨平台 UI 一致性要求高的场景。

## 7. 制作链路与媒体能力

### 7.1 Toonflow

内置节点覆盖：

- 文本、图片、视频、音频素材节点。
- 图片生成、视频生成、音频生成。
- 3D 导演台：场景、人物、机位、运镜、关键帧导出。
- 逐帧拉片：关键帧、分镜视频、原音轨、AI 辅助分析。
- 视频节点：裁剪片段、提取音轨、分离音视频。
- 音频节点：波形、分割、粘合、撤销／重做。

这些能力以节点为中心，适合“生成一个镜头、处理一个素材、再连到下一个节点”的制作方式。

### 7.2 Reveric

Reveric 覆盖更完整的创作和后期链路：

- 小说编辑：章节、大纲、人物、势力、伏笔、地图、关系图谱、历史版本。
- 剧本编辑：季、集、场、节拍、角色、对白、动作、转场。
- 画布：分镜节点、角色定妆、参考图、音视频资产。
- 3D 导演台：布景、角色摆位、机位、运镜、时间轴预演。
- 6 轨剪辑：字幕、叠加、主视频、对白、音效、音乐；支持分割、波纹删除、吸附、字幕、音频分离和成片导出。
- 其他：封面工作室、地图、旁白、阅读、角色扮演、剧场等。

Reveric 的 6 轨剪辑在源码中有明确的 `EditingDocument.empty` 默认轨道定义，不是 README 宣传语。

### 7.3 制作能力对比

| 能力 | Toonflow | Reveric |
| --- | --- | --- |
| 小说章节编辑 | 以文本节点／文件为主 | 专业章节与故事资产模型 |
| 剧本编辑 | 文本节点 | 季／集／场／节拍专业结构 |
| 无限画布 | 核心能力 | 作品内的一种工作区 |
| 图片生成 | 有 | 有 |
| 视频生成 | 有 | 有 |
| 音频生成 | 有 | 有 |
| 3D 导演台 | 有节点插件 | 有独立导演台 |
| 逐帧拉片 | 有 | 有分镜与抽帧能力 |
| 节点级视频裁剪 | 有 | 有 |
| 多轨 NLE | 未检出应用级多轨剪辑模块 | 有 6 轨剪辑台 |
| 成片导出 | 依赖节点／外部工具 | 内建时间线导出 |

## 8. 部署、平台与商业化

### 8.1 Toonflow

Toonflow 支持 Windows x64／ARM64、macOS Intel／Apple Silicon、Linux x64／ARM64、Android ARM64，以及 Web／Server／Docker 部署。

它的商业化基础更完整：

- 多租户账号、用户管理和管理后台。
- 模型路由、统一网关、钱包和计费账本。
- 插件市场和企业定制入口。
- 21 种界面语言。

但需要注意：多租户设置在 UI 中仍显示“正在开发”，说明代码能力和公开产品化程度不是同一件事。

### 8.2 Reveric

Reveric 官方支持 Windows、macOS、Android，数据默认保存在本地，提供自动备份和 WebDAV 备份能力。

- 没有账号、租户、钱包或平台计费。
- 模型由用户自行配置，BYOK。
- 适合离线、隐私敏感、单用户创作。
- 中英文两种界面语言。

### 8.3 对比

| 维度 | Toonflow | Reveric |
| --- | --- | --- |
| 客户端平台 | Windows、macOS、Linux、Android | Windows、macOS、Android |
| Web／Server | 支持 | 不支持独立部署 |
| Docker | 支持 | 无 |
| 多租户 | 代码已具备，公开入口未开放 | 无 |
| 计费 | 钱包与模型计费代码 | 无平台计费，BYOK |
| 语言 | 21 种 | 中、英 |
| 数据位置 | 本地或服务器 | 默认本地 |
| 备份 | 依赖工作区／数据目录 | 自动备份、WebDAV |

## 9. 工程质量、文档与验证

### 9.1 Toonflow

- `AGENTS.md` 对目录、命名、构建、发布和多租户有详细约束。
- 仓库明确要求“不新增测试模块”，软件测试由测试人员负责；因此仓库内没有 `.test.ts`／`.spec.ts` 文件。
- 代码规范强调类型检查、构建验证和人工验证，但不以自动化测试为主要质量门禁。
- 多租户、插件、A2A、更新器等模块都有较完整的实现和开发文档。

### 9.2 Reveric

- `AGENTS.md`、`CONTEXT.md`、`DESIGN.md`、`PRODUCT.md` 和 `docs/adr/`、`docs/solutions/` 构成完整的设计与决策记录。
- `test`、`integration_test`、`patrol_test` 合计约 862 个 Dart 测试相关文件、约 25.4 万行。
- 数据库迁移、生成代码、FVM 版本、i18n、文件头规范都有硬性规则。
- 代码规模更大：`lib` 约 49.4 万行 Dart（不含 `lib/third` 和生成文件）。

### 9.3 对比

| 维度 | Toonflow | Reveric |
| --- | --- | --- |
| 架构文档 | 有，偏工程规范 | 非常完整，含 ADR／方案／术语 |
| 自动化测试 | 仓库不保留测试模块 | 大量单元、集成、Patrol 测试 |
| 质量门禁 | 类型检查、构建、人工验证 | 测试、静态分析、迁移与代码生成规范 |
| 代码规模（粗略） | 约 10.5 万行 TS／TSX／Vue | 约 49.4 万行 Dart（不含 third） |
| 主要风险 | 测试自动化弱，跨端行为依赖人工验证 | 代码和领域模型重，维护成本高 |

代码行数只作为规模参考，不代表质量高低。Reveric 的行数包含大量领域 UI、测试和注释；Toonflow 的 TS／Vue 代码更集中。

## 10. 主要相似点与差异

### 相似点

1. 都以 AI Agent 为核心交互入口。
2. 都有无限画布和节点式素材组织。
3. 都支持图片、视频、音频生成与 3D 导演预演。
4. 都支持插件／工具扩展和 MCP。
5. 都强调本地部署或数据可控。

### 核心差异

| 差异 | Toonflow | Reveric |
| --- | --- | --- |
| 产品起点 | 画布 | 小说／剧本作品 |
| 内容模型 | 文件 + 节点 | 强关系型故事数据库 |
| 运行架构 | Server-first | Local-first |
| 多用户 | 多租户平台 | 单用户本地 |
| Agent 强项 | 画布操作、团队、A2A、网关 | 上下文、子 Agent、创作流程 |
| 插件强项 | 开放市场、Vue 生态 | 受控运行时、跨平台 A2UI |
| 后期强项 | 节点级媒体处理 | 6 轨 NLE |
| 语言 | 21 种 | 2 种 |

## 11. 可借鉴点

### 11.1 Toonflow 可借鉴 Reveric 的部分

1. **故事领域模型**
   - 章节、卷、人物、势力、地点、物品、伏笔、关系历史。
   - 剧本的季／集／场／节拍结构。
   - 这些可以补足 Toonflow 目前以文本节点承载故事内容的不足。

2. **Agent 会话运行时**
   - 按 `sessionId` 管理运行态，而不是绑定当前页面。
   - 后台子 Agent、异步完成唤醒、上下文接力。
   - 对长时间创作和多任务并行更有价值。

3. **Codemode**
   - 在受限 JavaScript 中组合多个数据工具，减少模型往返和上下文膨胀。
   - 与 Toonflow 现有工具系统可以形成互补。

4. **插件 capability 模型**
   - 对第三方插件增加能力白名单和资源限制。
   - 与 Toonflow 的开放插件市场结合，可降低不可信插件的风险。

5. **数据备份与可迁移性**
   - 作品级备份、自动备份、WebDAV 备份。
   - 对本地部署用户尤其有价值。

### 11.2 Reveric 可借鉴 Toonflow 的部分

1. **多租户与模型网关**
   - 账号、租户隔离、模型路由、钱包和计费。
   - 如果 Reveric 要做云端协作，这是必要的平台层。

2. **Web／Server 部署**
   - 同一套业务后端服务 Web、桌面和移动端。
   - 降低多端业务分叉。

3. **插件市场**
   - 插件的发现、安装、配置、版本和更新流程。
   - 比仅提供 SDK 和本地导入更利于生态扩张。

4. **多语言**
   - 21 种界面语言的国际化组织方式。

5. **A2A 与团队协作**
   - 标准 Agent Card、任务、消息和 Artifact 协议。
   - 对 Reveric 的远程助手和外部 Agent 协作有参考价值。

### 11.3 不建议直接照搬

- 不要把 Toonflow 的 Bun／Vue 技术栈直接搬到 Reveric；Flutter 的跨平台原生体验和 A2UI 插件体系是 Reveric 的既有优势。
- 不要把 Reveric 的每作品独立 SQLite 直接搬到 Toonflow 的云端多租户架构；两者数据边界和部署模型不同。
- 不要照搬 Reveric 的双语言方案到 Toonflow；Toonflow 已有 21 语言体系。
- 不要因为 Reveric 文档完整就认为所有能力都已实现；其 Skill Marketplace、Workflow 等仍有规划或预留成分。

## 12. 许可证与代码复用边界

- Toonflow 当前仓库为 **MIT**。README 同时说明：v1.0.8 之前使用 AGPL-3.0，v1.0.8～v1.1.8 使用 Apache-2.0 及附加协议，旧版本不追溯。
- Reveric 主仓库为 **AGPL-3.0**；`plugins/sdk/package.json` 单独声明 **MIT**。

因此：

- 可以研究 Reveric 的产品设计、数据模型、交互和架构思路。
- 不能直接把 Reveric 的 AGPL 代码复制进 Toonflow。
- 若要复用具体实现，需要单独评估 AGPL 的衍生作品义务、网络分发条款和插件 SDK 的 MIT 边界。

## 13. 事实核查备注

以下结论已通过源码或仓库文档核对：

| 结论 | 核查依据 |
| --- | --- |
| Toonflow 使用 Bun + TypeScript + Express 5 + Vue 3 | 根 `package.json`、`apps/server/package.json`、`apps/web/package.json` |
| Toonflow 桌面端和 Android 复用 `createApp` | `apps/desktop/src/index.ts`、`apps/mobile/src/server.ts` |
| Toonflow 画布以带 `toonflowCanvas` 标记的 JSON 保存 | `apps/server/src/utils/workspace/files.ts` |
| Toonflow 多租户 SQL 同时支持 SQLite 和 MySQL | `packages/multiTenant/db/schema.ts`、`packages/multiTenant/db/mysql.ts` |
| Toonflow 多租户设置入口仍显示“正在开发” | `apps/web/src/components/settings/panels/multiTenant/developmentNotice.vue` |
| Toonflow 支持 21 种语言 | `README.md`、`packages/i18n/src/locales` |
| Toonflow 仓库不保留测试模块 | `AGENTS.md` 的“测试与检查边界”；仓库中 `.test.ts`／`.spec.ts` 数量为 0 |
| Toonflow 当前许可证为 MIT | 根 `package.json`、`LICENSE`、`README.md` |
| Reveric 使用 Flutter + Drift SQLite | `pubspec.yaml`、`lib/shared/database/app_database.dart` |
| Reveric 每个作品使用独立内容数据库 | `lib/shared/services/novel_content.dart`、`NovelContentDatabase` |
| Reveric 应用库约 37 张表、内容库约 33 张表 | `app_database.dart`、`novel_content_database.dart` 的 `extends Table` 统计 |
| Reveric 有 6 轨剪辑默认轨道 | `lib/shared/models/editing/document.dart` 的 `EditingDocument.empty` |
| Reveric Agent 有 Chat Orchestrator、Subagent、Codemode | `lib/shared/services/ai/chat_turn_runner.dart`、`spawn_agent_handler.dart`、`codemode/*` |
| Reveric 插件使用 FJS／QuickJS + A2UI + capability | `plugins/README.md`、`docs/adr/0007`、`docs/adr/0008` |
| Reveric Skill Marketplace 仍为预留 | `CONTEXT.md` 的 `Skill Marketplace` 定义 |
| Reveric 的 Workflow 未检出运行时代码 | `CONTEXT.md` 有术语定义；`lib/` 中未检出业务流程的 Workflow 实现 |
| Reveric 支持 Windows、macOS、Android | `AGENTS.md`、README 平台徽章 |
| Reveric 主许可证为 AGPL-3.0，插件 SDK 为 MIT | `LICENSE`、`plugins/sdk/package.json` |

### 规模统计口径

- Toonflow：统计 `apps/` 与 `packages/` 下 `.ts`、`.tsx`、`.vue` 文件，排除 `node_modules`、`build`、`dist`，约 10.5 万行。
- Reveric：统计 `lib/` 下 `.dart` 文件，排除 `lib/third`、`.g.dart`、`.drift.dart`、`.freezed.dart`，约 49.4 万行。
- 测试：统计 `test/`、`integration_test/`、`patrol_test/` 下 `.dart` 文件，约 862 个、25.4 万行。

以上为静态代码规模统计，不等同于有效业务代码量，也不用于评价项目质量。
