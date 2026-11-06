# Toonflow 上游差异说明（research 分支）

> 目的：记录本仓库相对上游的改动，区分“新增文件”与“修改上游文件”，便于升级上游和向上游提交补丁。
>
> 基线：`upstream/master` 提交 `6086cdf`（v2.0.10）。截至 `f17bf75`，`research` 领先 6 个提交、落后 0 个提交。

## 1. 结论

- 共 9 个文件、+2358 / -3 行；其中 6 个是新文件，占 2350 行（本文件不计入）。
- 真正的上游源码改动只有 `apps/server/src/utils/fileHttp.ts`（+7 / -3）。
- 其余两处：`.gitignore` 加一行 `/.local/`；`packages/mcp/src/stdio.ts` 仅文件权限位 100644 → 100755（该文件是 MCP 的 bin 入口）。

## 2. 文件清单

| 文件 | 状态 | 行数 | 说明 |
| --- | --- | --- | --- |
| `scripts/dev.sh` | 新增 | +194 | 本地 dev 一键启动 |
| `scripts/dev-seed.ts` | 新增 | +465 | 测试数据与模型 seed |
| `scripts/dev.env.example` | 新增 | +59 | seed 配置模板 |
| `docs/drafts/toonflowVsReveric.md` | 新增 | +474 | 对比研究 |
| `docs/drafts/toonflowVsTDCanvas.md` | 新增 | +580 | 对比研究 |
| `docs/drafts/toonflowVsYingce.md` | 新增 | +578 | 对比研究 |
| `.gitignore` | 修改 | +1 | 忽略 `/.local/` |
| `apps/server/src/utils/fileHttp.ts` | 修改 | +7 / -3 | Bun 下 sendFile 404 修复 |
| `packages/mcp/src/stdio.ts` | 权限 | 0 | 100644 → 100755 |

## 3. 唯一的上游补丁：`fileHttp.ts`

- 问题：Bun 运行时下，Express `res.sendFile` 会把绝对路径与 `root` 再次拼接，返回 404。
- 现状：4 个调用点（`routes/nodes/files.ts`、`routes/ext/read.ts`、`routes/workspaces/files/read.ts`、`routes/assets/read.ts`）都传绝对路径且不带 `root`。
- 改法：取 `dirname` 作 `root`、`basename` 作相对路径传给 `sendFile`；文件访问校验仍使用原始绝对路径。
- 影响面：仅修正 Bun 下的 404，Node 下行为不变。
- 上游化建议：可作为独立 PR 提交；建议附一条 Bun 运行时的回归用例。

## 4. 一键脚本与 apiKey 覆盖

- `scripts/dev.sh`、`scripts/dev-seed.ts`、`scripts/dev.env.example` 均为新增文件，不修改上游代码。
- `dev-seed.ts` 在多租户模式下，对同 `kind + id` 的供应商改为**覆盖**（原逻辑为只补缺），因此更新 `.env.dev.local` 后重跑 `./scripts/dev.sh` 会把新的 `apiKey` 同步到 `settings.json` 与 `multiTenant` 的加密供应商配置。
- 未在 env 中声明的供应商、以及通过管理界面新增的供应商不受影响。

## 5. 升级上游

```bash
git fetch upstream
git rebase upstream/master
```

预计冲突点：`.gitignore`（`/.local/` 一行）、`apps/server/src/utils/fileHttp.ts`。`scripts/` 与 `docs/drafts/` 均为新增文件，一般不冲突。

## 6. 已知遗留

- `dev-seed.ts` 不会清理从 env 中移除的模型路由；换 key 场景不受影响。
- 密钥仍存在两份副本：`settings.json` 的 `customProviders` 与 `multiTenant` 的 `providerCipher`，由 seed 同时写入。
