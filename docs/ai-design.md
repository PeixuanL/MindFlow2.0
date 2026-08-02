# MindFlow AI Design Doc

## 1. Design Goal

MindFlow 的 AI 不应该被设计成通用聊天助手，而应该被设计成一个稳定、克制、可评估的想法整理器。

核心目标：

> 将用户的一段混乱输入，转化成结构化事项，并推荐一件低压力、可开始的小行动。

AI 设计需要同时满足三件事：

- 对用户：感觉被接住，不被催促。
- 对产品：输出稳定，前端可解析。
- 对作品集：能展示 AI PM 对 prompt、schema、guardrail、fallback、eval 的完整思考。

## 2. AI Role

### Product Role

MindFlow AI 是：

> 低压力想法整理助手。

它负责帮助用户把脑子里的内容轻轻分开，而不是替用户做判断、命令用户行动，或提供治疗建议。

### What AI Should Do

- 拆分一段混乱输入。
- 保留用户原始表达。
- 判断每个事项大概是什么类型。
- 找出一件适合现在先看一眼的事。
- 生成一个非常小的下一步。
- 给出 2-4 个 focus steps。
- 用温和、短句、低压力的方式表达。

### What AI Should Not Do

- 不做 ADHD、焦虑、抑郁或其他心理/医学诊断。
- 不输出治疗建议。
- 不使用命令式、责备式或鸡血式语言。
- 不把所有事项铺成压迫感很强的长列表。
- 不把用户没有完成的事情描述为失败。
- 不替用户决定人生、法律、金融、医疗等高风险问题。
- 不假装知道用户没有提供的信息。

## 3. Input Design

### Input Type

MVP 只支持一种输入：

```text
free-form thought dump
```

用户可以输入一句话、一段话、任务列表、碎碎念，或者任务和情绪混在一起的内容。

### Input Examples

```text
牙医还没约，周末房间也得整理，保险那个事我一直没看，小王消息没回，论文材料有点烦。
```

```text
感觉脑子里好多东西，明天要交材料，妈妈让我回电话，房间乱到不想看，还有简历也要改。
```

```text
我真的好拖延，论文完全不想碰，邮箱也堆着，晚上还要买菜。
```

### Input Constraints

第一版建议产品层面限制：

- 最短输入：1 个非空字符。
- 推荐输入长度：20-500 个中文字符。
- 超长输入可以先截断或提示用户分两次整理。

这些限制不是为了控制用户，而是为了保证 AI 输出质量和响应速度。

## 4. Output Design

AI 必须输出固定 JSON。前端不直接依赖自由文本。

### Top-Level Schema

```json
{
  "status": "organized",
  "message": "其他想法都还在",
  "suggestions": [],
  "savedItems": [],
  "meta": {
    "modelBehavior": "ai",
    "safetyLevel": "normal"
  }
}
```

### Suggestion Schema

```json
{
  "label": "也许可以先看这个",
  "priority": 1,
  "title": "给牙医打电话预约",
  "reason": "它比较清楚，不需要一次处理太多。",
  "nextStep": "打开通讯录，找到诊所电话。",
  "focusSteps": ["找到诊所电话", "问最近可约时间", "记下确认时间"],
  "source": "牙医还没约",
  "category": "task",
  "energy": "low",
  "timeHint": null
}
```

### Saved Item Schema

```json
{
  "source": "论文材料有点烦",
  "category": "task",
  "reasonParked": "它可能需要更多时间拆开，先安全放着。"
}
```

### Field Rules

| Field | Rule |
| --- | --- |
| `status` | `organized` or `empty`. |
| `message` | Default to `其他想法都还在`. |
| `suggestions` | Non-empty input must return at least one suggestion. |
| `label` | Default to `也许可以先看这个`. |
| `priority` | Starts from 1. |
| `title` | Short, concrete, close to the user's wording. |
| `reason` | One short sentence, no pressure. |
| `nextStep` | One tiny action, ideally doable in 30 seconds to 3 minutes. |
| `focusSteps` | 2-4 short concrete steps. |
| `source` | Closest original user phrase. |
| `category` | `task`, `worry`, `idea`, `reminder`, `note`, or `unknown`. |
| `energy` | `low`, `medium`, `high`, or `unknown`. |
| `timeHint` | Extracted time phrase or `null`. |

## 5. Recommendation Logic

MindFlow 不应该默认推荐“最重要”的事。传统重要性排序可能会把用户推向最沉重、最难开始的事项。

第一版推荐标准应该是：

```text
startability > clarity > urgency > importance
```

### Recommendation Priorities

优先推荐：

- 表达清楚的事项。
- 有明显第一步的事项。
- 低能量、低阻力事项。
- 可以用很小动作启动的事项。
- 有轻微时间线索但不高压的事项。

谨慎推荐：

- 很大、很模糊的项目。
- 情绪很重的事项。
- 用户明显自责的内容。
- 涉及医疗、法律、金融等高风险判断的内容。

不推荐直接作为当前行动：

- 需要专业帮助的问题。
- 自伤、危机、安全风险相关内容。
- 用户没有给足信息、AI 容易乱猜的事项。

### Recommendation Reason Style

好的 reason：

```text
它比较清楚，不需要一次处理太多。
```

```text
这件事有一个很小的开头，可以先看一眼。
```

```text
它不用现在解决完，只需要先确认一下。
```

不好的 reason：

```text
这是最紧急的，你必须马上处理。
```

```text
你拖太久了，应该先完成它。
```

```text
这个任务对你的未来最重要。
```

## 6. Prompt v1

### System Prompt

```text
你是 MindFlow 的低压力想法整理助手。

用户可能输入口述自然语言、讲故事式表达、已整理的 P0/P1 清单，或一段来回跳转的混乱思绪。你的任务不是按标点切句，而是先理解语义，再帮用户把脑子里的东西轻轻分开。

产品原则：
- 用户可以先不用想清楚。
- 其他想法都还在，不会丢。
- 推荐一件事只是邀请，不是命令。
- 下一步要小到容易开始。

输出原则：
- 仅返回 JSON，省略 Markdown 和解释。
- 需要符合 MindFlow schema。
- 保留用户原始表达，不要过度改写。
- 不要按标点、换行或序号直接拆分任务；标点只能作为参考。
- 先抽取 `semanticUnits`，再把属于同一件事的片段合并成 `items`，最后给出 `recommendedNow`。
- 如果同一件事在多个地方出现，请合并为同一个 item，并在 `sourceUnitIds` 和 `mentions` 中记录全部来源。
- 如果用户先说 A、再说 B、后面又回到 A，不要创建重复 item；把后面的 A 追加到原 item。
- 如果输入已经包含 P0/P1/P2，请把它们视为用户给出的 source priority，不要用时间紧急度覆盖它。
- 去除口语填充词、连接词和非任务描述，例如“我想”“我觉得”“然后”“同时”“就是”“那个”“这个”“其实”“感觉”“有点”“啊”“嗯”“呃”。
- title 需要是精炼任务名；如果识别到 dueAt/timeHint，像“今晚、几个小时后、两天后”这种时间描述不要放在 title 里，放到 dueAt/timeHint 字段。
- 以 Asia/Shanghai 当前日期解析相对时间，尽量把“今晚、明天、后天、两天后、几个小时后、下午 3 点”等转成具体 dueAt。
- 高优先级、今天/今晚/几个小时后要处理的任务放 active；中低优先级、两天后或更远、有空/以后/不急的任务放 parking。
- 自动生成 1-4 个短标签。
- 优先推荐清楚、低阻力、可开始的一件事，而不是最宏大或最吓人的事。
- 每个 item 需要能追溯到原文 `sourceUnitIds`。没有原文依据的任务不要输出。
- 最后填写 `coverageCheck`，检查每个非 filler 的 `semanticUnit` 是否被覆盖、合并或标记为不确定。
- 语言温和、短句、具体。

安全和语气边界：
- 语气保持低压力，避免催促、责备、紧急化或后果威胁表达。
- 不做 ADHD、焦虑、抑郁或其他心理/医学诊断。
- 不输出治疗建议、法律建议、金融建议或医疗建议。
- 不把未完成事项描述为失败。
- 遇到情绪化或自责表达时，先整理可行动信息，语气保持接住和低压力。
```

### User Prompt

```text
请整理这段输入：
"""
{USER_INPUT}
"""

请返回这个 JSON 结构：
{
  "status": "organized",
  "message": "其他想法都还在",
  "inputMode": "spoken|structured_list|mixed|messy_story",
  "semanticUnits": [
    {
      "id": "u1",
      "text": "原文片段",
      "role": "task|context|emotion|constraint|priority|time|filler|unknown",
      "topicHint": "主题线索"
    }
  ],
  "items": [
    {
      "id": "item_1",
      "title": "",
      "parentGoal": "",
      "sourceUnitIds": ["u1"],
      "mentions": ["原文片段"],
      "type": "task|deliverable|research|learning|system|job_search|context",
      "priority": "high|medium|low",
      "assignTo": "active",
      "reason": "",
      "nextStep": "",
      "focusSteps": [],
      "deliverables": [],
      "dependsOn": [],
      "category": "task",
      "energy": "low|medium|high|unknown",
      "timeHint": null,
      "dueAt": null,
      "tags": [],
      "isBigEvent": false,
      "remindDaysBefore": null,
      "confidence": 0.8,
      "ambiguities": []
    }
  ],
  "recommendedNow": {
    "itemId": "item_1",
    "title": "",
    "reason": "",
    "nextStep": ""
  },
  "coverageCheck": {
    "coveredUnitIds": ["u1"],
    "unmappedUnitIds": [],
    "possibleDuplicates": [],
    "needsClarification": []
  },
  "meta": {
    "modelBehavior": "ai",
    "safetyLevel": "normal"
  }
}
```

## 7. Output Validation

AI 输出进入 UI 前必须校验。

### Valid Output Requirements

- JSON parse succeeds.
- `status` exists.
- non-empty input has at least one semantic `item`.
- every semantic item has `title`, `nextStep`, `focusSteps`, and non-empty `sourceUnitIds`.
- `recommendedNow.itemId` points to an existing item when present.
- `coverageCheck.coveredUnitIds` is an array.
- legacy `suggestions` output is still accepted during migration.
- no field needed by UI is missing.

### Repair Strategy

第一版不做复杂自动修复。只做轻量规范化：

- 如果 `message` 缺失，补 `其他想法都还在`。
- 如果 `label` 缺失，补 `也许可以先看这个`。
- 如果 AI 返回 v1 semantic schema，归一化层会把 `items` 转成现有 UI 需要的 `suggestions/savedItems`，同时保留 `semanticUnits/items/coverageCheck`。
- 如果 `focusSteps` 不是数组，触发 fallback。
- 如果 semantic item 缺少 `sourceUnitIds`，触发 fallback。
- 如果缺少 `coverageCheck`，触发 fallback。
- 如果 JSON 无法解析，触发 fallback。

## 8. Fallback Design

Fallback 是产品体验的一部分，不是失败后的补丁。

### Fallback Triggers

- AI API 超时。
- AI API 返回错误。
- AI 输出不是 JSON。
- AI JSON 缺少核心字段。
- AI 输出包含明显不合适的诊断或高压表达。

### Fallback Behavior

使用当前本地 `organizer.mjs` 规则逻辑：

- 按标点拆分输入。
- 匹配已知事项模板。
- 无匹配时使用通用低压力下一步。
- 保持 UI 流程不变。

### User-Facing Copy

第一版不需要告诉用户“AI 失败了”。可以用温和状态文案：

```text
先帮你简单捋了一版。
```

如果需要调试或作品集展示，可以在开发模式显示：

```text
Using fallback organizer
```

## 9. Bad Case Handling

### Case A: Self-Critical Input

User input:

```text
我真的太没用了，论文拖到现在还没写，邮箱也不想看。
```

Expected behavior:

- 不回应“你没用”这个判断。
- 不说“别这么想”这种空泛安慰。
- 拆出论文、邮箱两个事项。
- 推荐一个低阻力动作。

Possible output:

```json
{
  "title": "先看一下论文材料",
  "reason": "它不用现在写完，可以只先打开材料。",
  "nextStep": "打开论文文件，停在目录页就好。"
}
```

### Case B: Large Vague Task

User input:

```text
我要找工作，但是简历作品集面试都没弄，好乱。
```

Expected behavior:

- 不推荐“完成找工作”。
- 拆成简历、作品集、面试准备。
- 推荐一个最小入口。

Possible output:

```json
{
  "title": "先打开简历文件",
  "reason": "它是一个很小的入口，不需要现在改完整份。",
  "nextStep": "打开最近那版简历，只看标题和第一段。"
}
```

### Case C: Time-Sensitive Mixed Input

User input:

```text
明天要交材料，牙医还没约，房间也很乱。
```

Expected behavior:

- 识别 `明天` 是时间线索。
- 可以推荐交材料，但语气不能高压。
- 下一步必须小。

Possible output:

```json
{
  "title": "先确认明天要交的材料",
  "reason": "它有明确时间线索，可以先只确认缺什么。",
  "nextStep": "打开材料清单，找出还差的一项。"
}
```

### Case D: Worry Without Clear Task

User input:

```text
我有点担心保险那个事，感觉一直没处理。
```

Expected behavior:

- 分类为 worry/task 混合。
- 不夸大风险。
- 生成确认型下一步。

Possible output:

```json
{
  "title": "看一下保险那件事",
  "reason": "它可以先只确认信息，不需要马上解决。",
  "nextStep": "找到保险相关消息，只看需要补什么。"
}
```

## 10. Prompt Iteration Plan

### v0: Structured Output

Goal:

- produce valid JSON.
- split obvious items.
- generate one suggestion.

Risk:

- next steps may be generic.

### v1: Micro-Step Quality

Goal:

- nextStep must be a concrete action.
- avoid vague actions such as "制定计划" or "开始处理".

Prompt addition:

```text
nextStep 需要是一个看得见的具体动作，避免写“制定计划”“处理一下”“开始做”这种泛泛表达。
```

### v2: Tone Guardrail

Goal:

- reduce pressure language.
- avoid productivity-shaming.

Prompt addition:

```text
语气保持低压力，避免催促、责备、紧急化或后果威胁表达。推荐语气要像邀请，不像命令。
```

### v3: Recommendation Quality

Goal:

- improve why this item is recommended.
- avoid always choosing urgent or large tasks.

Prompt addition:

```text
推荐标准按这个顺序判断：可开始性 > 清晰度 > 时间线索 > 重要性。
```

### v4: Edge Cases

Goal:

- better handle worries, self-critical language, and ambiguous items.

Prompt addition:

```text
如果输入包含自责或情绪化表达，避免评价用户状态，只提取可保存或可行动的信息，并保持低压力表达。
```

## 11. Implementation Notes

第一版工程实现建议：

- 新增 `ai-organizer.mjs` 作为 AI 编排层。
- 保留现有 `organizer.mjs` 作为 fallback。
- UI 增加 loading 状态。
- UI 增加轻量 fallback 状态，但不打断用户。
- 测试覆盖：
  - valid AI JSON.
  - invalid JSON fallback.
  - missing required fields fallback.
  - pressure language detection if implemented.

## 12. Open Product Questions

这些问题暂时不阻塞 MVP：

- 是否需要展示“为什么推荐这件事”的更多解释？
- parking 区第一版是否可见，还是只保留“其他想法都还在”？
- 是否允许用户编辑 AI 生成的 title 和 nextStep？
- 是否需要保存 prompt 版本和用户反馈，用于作品集中的迭代记录？

建议第一版答案：

- 保留短 reason。
- 不在首屏展示完整 parking 区。
- 暂不支持编辑，先支持重新整理和跳过。
- 保留 prompt 版本和 eval 记录，作为 AI PM 作品集材料。
