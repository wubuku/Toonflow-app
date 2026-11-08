# 画布提示词 `@` 引用语义调研（研究留档）

> 目的：说明 Toonflow 画布提示词输入框里 `@` 引用素材时，系统到底做了什么、提交生成时请求体长什么样，以及被引用的文本节点是否会被「就地展开」。
>
> 基线：`upstream/master` 的 v2.0.10（`6086cdf`）。本文所涉前端代码在本仓库 research 分支中**与上游完全一致**（`apps/web`、`packages/nodeShared`、`packages/nodeScaffold` 相对上游 diff 为 0 个文件），因此以下行为即上游行为。

## 1. 结论

- **不是 inline 展开**。被引用的文本节点内容不会替换到 `@` 所在的句子位置。
- 输入框里的 `@` 引用会变成一个不可编辑的**标签（chip）**，只显示短名（`参考 1`、`参考 2`、音频节点名等）。
- 该标签真正的语义值是 `{{ref N}}`（N 为引用序位），**不含文本内容**。
- 提交生成时，文本节点的内容会被**整段追加到 prompt 末尾**，以 `参考 N：` 作为小标题；主 prompt 中只保留 `{{ref N}}` 这个编号锚点。
- 图片 / 视频 / 音频三个生成节点的处理方式一致（三处代码同构）。

## 2. 编辑器侧：chip 里存的是什么

`@` 选择引用后，编辑器中插入的 HTML 由 `referenceHtml()` 生成（`packages/nodeShared/src/components/promptInput.vue:145`）：

```html
<span class="imageReference" data-reference-id="..." data-value="{{ref 1}}">
  <img src="..." />参考 1
</span>
```

- `data-reference-id`：稳定引用键，用于提交时反查最新引用（避免依赖编辑器挂载与异步入队顺序）。
- `data-value`：`{{ref N}}`，即该引用在 `referenceOrder` 中的序位。
- 可见文本：`reference.label || reference.name`，只是给人看的短名。

引用键与序位的定义在 `packages/nodeShared/src/useNodeReferences.ts`：

- 序位来源：`node.data.referenceOrder?.[handleId]`，键为 `encodeURIComponent(JSON.stringify([source, sourceHandle]))`（见该文件末尾的 `referenceKey()`）。
- 每个引用项的 `value` 固定为 `` `{{ref ${index + 1}}}` ``（`useNodeReferences.ts:52`）。
- 支持的类型：`IMAGE`、`VIDEO`、`AUDIO`、`STRING`、`FILE`（`STRING` 即文本节点）。
- 未列入 `referenceOrder` 的入边按连线顺序排在后面。

## 3. 提交时的序列化：chip → `{{ref N}}`

`getPromptText()`（`packages/nodeShared/src/promptText.ts:3`）把编辑器模型还原成纯文本：

- `Write` 节点：原样返回文本。
- `Custom` 节点（引用 chip）：解析 HTML，把 `.imageReference[data-value]` 元素替换为 `resolveReference(id)` 的返回值。
- 若引用已失效（`resolveReference` 返回 `undefined`），调用方会抛错，而不是静默丢弃。

视频节点 `startGeneration()`（`packages/nodes/videoGenerationNode/src/index.vue:361`）就是这样做的：

```ts
const prompt = data.value.promptModel.length ? getPromptText(data.value.promptModel, referenceId => {
  const value = references.find(reference => reference.id === referenceId)?.value;
  if (value === undefined) throw new Error("提示词引用的素材已失效，请重新选择引用");
  return value;
}) : data.value.prompt;
```

所以 `@` 位置在最终 prompt 里**只剩 `{{ref N}}` 这几个字符**。

## 4. 文本节点内容：整段追加到末尾

三个生成节点各自有一份同构的 `getGenerationPrompt()`，负责把 STRING 引用的内容拼进 prompt：

| 节点 | 位置 | 函数 |
| --- | --- | --- |
| 视频 | `packages/nodes/videoGenerationNode/src/index.vue:224` | `getGenerationPrompt()` |
| 图片 | `packages/nodes/imageGenerationNode/src/index.vue:204` | `generationPrompt` computed |
| 音频 | `packages/nodes/audioGenerationNode/src/index.vue:135` | `generationPrompt` computed |

三处逻辑相同：

```ts
[
  prompt.trim(),
  ...refList.value.flatMap((item, index) =>
    item.dataType === "STRING" && item.value?.trim()
      ? [`参考 ${index + 1}：\n${item.value.trim()}`]
      : []),
].filter(Boolean).join("\n\n");
```

输入：

```
一个穿 {{ref 1}} 的女孩在雨中奔跑，{{ref 1}} 是她的服装设定
```

实际发给模型的 prompt：

```
一个穿 {{ref 1}} 的女孩在雨中奔跑，{{ref 1}} 是她的服装设定

参考 1：
（文本节点的完整内容，原样，含换行）
```

注意：

- 追加发生在**所有** STRING 引用上，与用户是否在正文里写 `{{ref 1}}` 无关；只要连了文本节点，内容就会出现在末尾。
- 编号顺序取自 `refList`（即 `referenceOrder`），与「参考 N：」的 N 一致，也和正文中的 `{{ref N}}` 对应。
- 空文本（`!item.value?.trim()`）不会追加，但视频节点会单独报错拦截（见第 6 节）。
- 追加是纯文本拼接，不转义、不截断。

## 5. 请求体里的 `referenceOrder`

视频节点 `getGenerationInput()`（`packages/nodes/videoGenerationNode/src/index.vue:235`）按引用类型分别收集并生成映射：

- IMAGE → `images[]`，`{ type: "image", index }`
- VIDEO → `videos[]`，`{ type: "video", index }`
- AUDIO → `audios[]`，`{ type: "audio", index }`
- STRING（及其他）→ `{ type: "text" }`

首尾帧模式（`startEndRequired` / `endFrameOptional` / `startFrameOptional`）下，图片映射会改写为 `firstFrame` / `lastFrame`：

- `startEndRequired` / `endFrameOptional`：第 1 张为首帧、第 2 张为尾帧。
- `startFrameOptional`：只有 1 张图时作为**尾帧**；2 张时按顺序作为首帧、尾帧。

服务端 schema 对此有明确说明（`apps/server/src/utils/media/schemas.ts:31`）：`referenceOrder[0]` 对应 `{{ref 1}}`；`text` 指「prompt 中已包含的同号参考 N 文本」。

服务端在 `prepareRequest()`（`apps/server/src/utils/media/generation.ts:163` 起）做两道校验：

1. `referenceOrder` 里每一项都必须指向真实存在的素材（`text` 除外）。
2. prompt 中出现的每个 `{{ref N}}` 都必须有对应的 `referenceOrder[N-1]`，否则报「引用标记 xxx 没有对应素材，请重新选择引用」。

## 6. 前端空值校验

视频节点在提交前额外检查 STRING 引用是否为空（`videoGenerationNode/src/index.vue:371` 起）：

```ts
for (const match of input.prompt.matchAll(/\{\{ref (\d+)\}\}/g)) {
  const reference = refList.value[Number(match[1]) - 1];
  if (reference?.dataType === "STRING" && !reference.value?.trim())
    throw new Error(`参考 ${match[1]} 的文本为空，请补充内容或移除提示词中的引用`);
}
```

即：正文写了 `{{ref N}}`，但对应文本节点为空时，直接报错而不是发一个空引用给模型。

## 7. 图片节点的额外映射：重绘

局部重绘（inpaint）时，图片节点会在 prompt 末尾再追加一段编号对应关系（`imageGenerationNode/src/index.vue:224` 起）：

```
当前节点参考编号对应关系：参考 1 / {{ref 1}} 对应第 N 张图；...
```

这是唯一会改写 `{{ref N}}` 语义映射的场景——因为重绘会把原图插到图片数组前面，导致「第几张图」与引用编号错位。普通图片生成不做这个追加。

## 8. 与 Agent 对话链路的差异

Agent 对话（非画布节点生成）走的是另一条路径，`apps/server/src/utils/ai/index.ts:124` 的 `referenceContent()`：

```ts
content.push(textPart(`{{ref ${referenceOffset + index + 1}}}${item.dataType === "STRING" ? `\n${item.value}` : ""}`));
```

这里文本内容**紧跟在** `{{ref N}}` 之后，属于同一内容块。但它依然不是「就地插进用户句子里」——用户消息中的 `{{ref N}}` 仍然是独立锚点，文本内容跟在锚点后，而不是替换锚点。

所以严格来说：

- 画布节点生成：锚点在正文，全文追加在**整个 prompt 末尾**。
- Agent 对话：锚点后紧跟该文本，仍在**锚点处**而非原句中间。

两者都不是「变量替换式 inline 展开」。

## 9. 实践影响

- 若把 `@` 放在句子中间、指望它像模板变量那样读成一句短语，实际模型看到的是「正文里的 `{{ref 1}}`」+「末尾的整段文本」。语义能连上，但语序分离。
- 文本节点很长时会稀释正文权重；越靠近末尾的内容通常对最终结果影响越大。
- 多个文本引用会按编号依次追加，顺序由 `referenceOrder` 决定。
- 想让文本真正「就地」参与行文，可行的做法是直接把它写进 prompt 正文，或改用 Agent 对话链路（锚点后紧跟文本）。

## 10. 相关缺陷

与本文同源的另一个上游既有问题是：输入 `@` 后引用菜单不会立即弹出，需再敲一个空格或退格才出现。根因与本文第 2–3 节涉及的编辑器时序相关，详见 `docs/drafts/upstreamDelta.md` 第 8.1 节。该问题在 `upstream/master` v2.0.10 中已存在，本分支未修复。
