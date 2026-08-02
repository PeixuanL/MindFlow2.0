# MindFlow Interaction Spec

更新时间：2026-08-01

## 0. 当前确认结论

本交互规格承接 `docs/spec.md` 中的第一版 PRD，并吸收 2026-08-01 对待确认问题的产品决策。

已确认：

- 第一版登录方式：简单用户名登录。
- 第一版持久化：本地后端数据库，数据必须保存到后端；后续上云时再决定云端数据库方案。
- 登录前使用策略：第一版先登录再使用，不做未登录试用转存。
- 事项信息架构：一个事项管理页 + 一个事项详情页。用户不需要理解技术路由。
- 保存完成入口文案：`去看看`。
- 首页推荐动作：`看一下` 先进入首页内 focus 状态，并提供进入详情编辑的入口。
- 用户可见优先级：`High / Medium / Low`，不使用“优先级 1/2/3”。
- Parking candidate：P0 做简单完整版本。
- 完成后的动作文案：`再看一件` / `先休息一下`。
- 删除撤销：固定 5 秒；点击撤销后短暂显示 `已撤销`。
- Steps：小步骤支持增删改。
- Parking reason：由 AI 提供，用来告诉用户为什么这件事先放到 Parking。
- AI 推荐 reason：第一版保留短解释，不做长展开。
- Prompt version / AI meta：第一版保存，用于后续作品集和 AI PM 迭代记录。
- Reminders：暂缓，不进第一版。
- WeChat Mini Program：暂缓，先完成 Web MVP 和本地后端闭环。
- P1 功能：搜索、状态筛选、优先级筛选需要做；merge/split 放在 P1 后段；duplicate detection 放到更后面。

当前项目实际状态：

- 已有移动优先 Web 原型：`src/prototype/index.html`、`src/prototype/app.js`、`src/prototype/organizer.mjs`。
- 已有 AI 编排层雏形：`src/prototype/ai-organizer.mjs`，但当前页面尚未接入。
- 当前原型能完成：输入 -> 本地规则整理 -> 推荐卡 -> `看一下` focus / `先不管`切换下一条。
- 当前原型不能完成：登录、后端保存、事项页、详情编辑、Parking/Done 管理、删除撤销、刷新恢复、真实 loading 和保存反馈。

## 1. 交互设计目标

MindFlow 第一版交互目标不是让用户管理更多任务，而是让注意力分散的用户可以先把脑子里的混乱内容倒出来，并相信这些内容不会丢。

用户应该如何理解产品：

- MindFlow 是一个低压力 thought-to-action 产品。
- 用户只负责输入杂乱想法，不需要先分类、排优先级、拆步骤。
- AI 负责把想法分开，生成事项、小步骤、短理由、Parking reason 和初始优先级。
- 用户拥有最终控制权，可以编辑、停车、恢复、完成、删除。
- 首页只推荐一件当前可以看的事，不展示完整任务墙。

用户应该如何开始核心任务：

- 打开产品后先输入简单用户名登录。
- 进入首页后，在底部输入框写下任何杂乱想法。
- 点击 `帮我捋一捋`。
- 系统显示整理/保存状态。
- 保存完成后显示 toast：`已经帮你保存好了` + `去看看`。

用户如何知道自己进行到哪一步：

- 登录页：知道当前需要输入用户名才能进入个人数据空间。
- 首页初始：看到 `先不用想清楚` 和输入区，知道可以先记录。
- 整理中：按钮 disabled，文案变为整理中，知道系统正在处理。
- 保存完成：看到保存 toast 和 `去看看`，知道内容已经进入系统。
- 首页推荐：看到一个 recommendation card，知道现在只需要看一件。
- Focus 状态：看到 `只看这一件`，知道正在面对当前事项。
- 事项页：通过 Active / Parking / Done 分区知道每件事所在位置。
- 详情页：通过编辑字段和保存反馈知道修改是否生效。

用户如何知道任务已经成功完成：

- 捕获成功：toast 明确说明已保存，并能通过 `去看看` 在事项页看到事项。
- 推荐成功：首页显示来自后端已保存 active items 的一条推荐。
- 管理成功：事项状态变化后，分区立即更新。
- 完成成功：显示轻反馈 `这件完成了`，并给出 `再看一件` / `先休息一下`。
- 删除成功：事项从当前列表移除，5 秒内显示可撤销 toast。

用户遇到错误或中断时如何恢复：

- 空输入：不提交，输入框获得焦点，提示 `想到什么都可以先放在这里。`
- AI 失败：保留原始输入，允许重试；可使用 fallback organizer。
- 保存失败：不清空输入，不显示已保存；提示用户重试。
- 重复点击：整理/保存中禁用提交按钮，避免重复创建事项。
- 刷新页面：已保存数据从本地后端数据库恢复。
- 删除误触：5 秒内点击撤销，恢复原事项并短暂显示 `已撤销`。

## 2. 页面与模块清单

| 页面/模块 | 入口 | 主要职责 | 展示内容 | 可执行操作 | 依赖数据 | 输出结果 | 当前实现状态 | 对应 PRD |
|---|---|---|---|---|---|---|---|---|
| 登录页 | 首次打开产品或 session 失效 | 建立简单用户身份 | 产品名、用户名输入框、进入按钮 | 输入用户名、登录 | 用户名、本地 session | 创建/恢复用户 session | 缺失 | P0 用户登录 |
| 首页 Home | 登录后进入；从事项页返回 | 捕获想法；展示一个当前推荐或 Parking candidate | 顶栏、推荐卡/candidate/focus、状态提示、底部输入区 | 输入、整理、看一下、先不管、去详情、处理 candidate | 当前用户、active items、parking items、skip 状态 | recommendation/focus/candidate 状态变化 | 部分完成 | Flow 1/2/4 |
| Capture 输入区 | 首页底部 | 接收杂乱 thought dump | textarea、`帮我捋一捋` | 输入、提交 | raw text、当前用户 | thought batch + items | 部分完成 | Flow 1 |
| 整理与保存状态 | 点击整理后 | 告知用户系统正在 AI 整理与保存 | loading 文案、disabled 按钮 | 等待、失败后重试 | raw input、AI response、后端保存状态 | 成功 toast 或错误提示 | 缺失 | Flow 1 |
| 保存 toast | AI 保存成功后 | 明确反馈已保存并提供下一步 | `已经帮你保存好了`、`去看看` | 点击去看看、等待自动消失 | saved batch/items | 进入事项页或留在首页 | 缺失 | Flow 1 |
| Recommendation card | 首页，有 active items 时 | 只展示一件当前推荐 | label、priority、title、reason、tiny next step、动作按钮 | 看一下、先不管 | saved active items、lastSkippedAt | current/focus 或下一推荐 | 部分完成 | Flow 2 |
| Focus 状态 | 点击 `看一下` 后 | 让用户只看当前事项 | `只看这一件`、title、steps、编辑入口、完成入口 | 编辑、完成、返回推荐、继续记录 | current item | detail navigation 或 done 状态 | 部分完成 | Flow 2/3 |
| Parking candidate prompt | active 无合适推荐或 parked item 相关时 | 温和提示一个 parked item 可重新看 | candidate title、AI parking reason 或 resurface reason、`放到现在`、`继续放着` | 放到现在、继续放着 | parking items、timeHint、priority、snoozedUntil | status active 或 snooze | 缺失 | Flow 4 |
| 事项管理页 | 点击 `去看看`；首页入口 | 让用户确认内容真实存在并管理事项 | Active、Parking、Done 分区 | 新增、查看详情、park、restore、complete、delete | 后端 items | 列表分区更新 | 缺失 | Flow 3 |
| Active 分区 | 事项管理页 | 当前注意力窗口 | active item cards，title、High/Medium/Low、2-3 steps preview | 看详情、park、complete、delete、改 priority | active items | item 更新 | 缺失 | Flow 3 |
| Parking 分区 | 事项管理页 | 安全存放暂时不看的事项 | parked item cards，title、High/Medium/Low、AI parking reason | restore、看详情、delete | parking items | status 更新 | 缺失 | Flow 3/4 |
| Done 分区 | 事项管理页 | 轻量归档 | done item rows/cards | 看详情、restore 可选 | done items | archive/restore | 缺失 | Flow 3 |
| 事项详情页 | 点击事项卡片或 focus 的编辑入口 | 编辑单个事项 | title、priority、status、steps、reason、parkingReason、操作区 | 保存、增删改 steps、park、restore、complete、delete | item detail | item 更新并回显 | 缺失 | Flow 3 |
| 删除撤销 toast | 删除 item 后 | 防误删 | 删除反馈、撤销按钮、倒计时语义 | 撤销 | soft-deleted item | 恢复或保持 deleted | 缺失 | Flow 3 |
| AI 编排层 | Capture 提交后 | 生成稳定结构化结果，失败时 fallback | 不直接展示 | 被系统调用 | raw text、promptVersion、AI response | normalized items / fallback result | 部分完成但未接 UI | Flow 1 |

## 3. 主流程交互路径

### 主流程 1：Capture To Saved Items

#### 3.1.1 流程起点

- 用户完成简单用户名登录后进入首页。
- 首屏应看到 `先不用想清楚`、说明文案、底部输入框和 `帮我捋一捋`。
- 如果已有 active items，首页仍保留底部输入区，同时显示一条推荐。
- 当前项目已经实现首页输入和本地推荐，但没有登录、loading、后端保存和保存 toast。

#### 3.1.2 步骤拆解

| 步骤 | 用户动作 | 页面/模块 | 系统反馈 | 数据变化 | 下一步 | 当前实现状态 | 缺口 |
|---|---|---|---|---|---|---|---|
| 1 | 输入简单用户名并进入 | 登录页 | 登录成功，进入首页 | 创建/恢复 user session | 开始记录 | 缺失 | 需要登录页和 session |
| 2 | 在首页输入杂乱想法 | Capture | 文本实时回显 | textarea draft | 点击整理 | 已完成 | 草稿刷新恢复未实现 |
| 3 | 点击 `帮我捋一捋` | Capture | 按钮 disabled，显示整理中 | raw input 暂存 | AI 整理 | 部分完成 | 当前无 loading/disabled |
| 4 | 系统 AI 整理 | AI 编排层 | 可显示 `正在帮你分开这些想法` | 生成 semanticUnits、items、recommendedNow、coverageCheck，并归一化为 UI 兼容 suggestions/savedItems | 后端保存 | 部分完成 | `ai-organizer` 已支持语义 schema；页面仍用兼容字段 |
| 5 | 系统保存结果 | 后端数据库 | 保存中/保存完成 | 创建 thought batch、items、steps，绑定 userId | 显示 toast | 缺失 | 本地后端数据库未实现 |
| 6 | 保存完成 | Toast | `已经帮你保存好了` + `去看看` | 无新增 | 用户选择是否查看 | 缺失 | 当前只有安全感文案 |
| 7 | 用户点击 `去看看` | Toast | 打开事项管理页 | 读取保存结果 | 管理事项 | 缺失 | 事项页缺失 |
| 8 | 用户不点击 toast | Toast/Home | toast 几秒后消失，首页保留推荐/输入 | 已保存数据保留 | 继续记录或看推荐 | 缺失 | 自动消失机制缺失 |

#### 3.1.3 成功终点

- 用户看到保存成功 toast。
- 用户能点击 `去看看`，在事项管理页看到刚才拆出来的事项。
- 其他想法必须真的保存在后端数据库里，而不是只显示 `其他想法都还在`。
- 保存后的首页推荐应来自后端 active items。
- 当前实现不闭环，因为数据只存在浏览器内存里。

#### 3.1.4 中断与恢复

- AI 失败：保留 raw input，提示可重试；fallback 成功时仍要标记 `aiMeta.modelBehavior = fallback`。
- 保存失败：不清空输入，不显示保存成功 toast。
- 用户刷新：已保存内容从本地后端数据库恢复；未提交草稿可以重置，第一版不强制保留。
- 用户重复点击：提交按钮在 AI/保存过程中 disabled。
- 用户输入为空：不调用 AI/保存，focus 回输入框。

### 主流程 2：Homepage Recommendation To Action

#### 3.2.1 流程起点

- 用户登录后打开首页。
- 如果存在 active items，系统从后端保存事项中选择一条推荐。
- 首页不展示完整任务墙，只显示一条 recommendation card。
- 当前项目只有本次输入后生成的内存推荐，不会从保存数据恢复。

#### 3.2.2 步骤拆解

| 步骤 | 用户动作 | 页面/模块 | 系统反馈 | 数据变化 | 下一步 | 当前实现状态 | 缺口 |
|---|---|---|---|---|---|---|---|
| 1 | 打开首页 | 首页 | 显示一条 saved active recommendation | 读取 active items、lastSkippedAt | 查看推荐 | 缺失 | 当前初始无保存推荐 |
| 2 | 查看推荐 | Recommendation card | 显示 title、High/Medium/Low、短 reason、tiny next step | 无 | 看一下或先不管 | 部分完成 | 当前 priority 是数字 |
| 3 | 点击 `看一下` | Recommendation card | 进入首页内 focus 状态，显示 `只看这一件` | 可记录 current item 或 session focus | 看 steps、编辑或完成 | 部分完成 | 缺编辑/完成入口 |
| 4 | 点击编辑入口 | Focus | 打开事项详情页 | 读取 item detail | 编辑事项 | 缺失 | 详情页缺失 |
| 5 | 点击 `先不管` | Recommendation card | 当前推荐被暂时跳过，显示下一条或 capture-only | 更新 `lastSkippedAt`，status 仍是 active | 查看下一条 | 部分完成 | 当前只改内存 index |
| 6 | 单条 active 被跳过 | Recommendation card | 不应立刻显示同一项；可显示 capture-only 或 Parking candidate | 写 skip 状态 | 捕获新想法或处理 candidate | 缺失 | 当前会循环回同一条 |

#### 3.2.3 成功终点

- 用户能在首页只面对一件事。
- `看一下` 后进入 focus，不需要先进入完整列表。
- `先不管` 不等于 park，只是暂时换一个推荐。
- 用户从 focus 可以进入详情编辑，也可以完成事项。

#### 3.2.4 中断与恢复

- 刷新后：推荐从后端 active items 重新计算。
- 被跳过的 item：短时间内不应立即再次推荐。
- 当前 item 被删除/完成：首页应重新计算推荐。
- 没有 active recommendation：显示 Parking candidate 或 capture-only。

### 主流程 3：Active And Parking Management

#### 3.3.1 流程起点

- 用户点击保存 toast 的 `去看看`，或从首页进入事项管理页。
- 页面应显示 Active / Parking / Done 三个分区。
- Active 是当前注意力窗口，不是全部未完成任务。
- 当前项目没有事项管理页。

#### 3.3.2 步骤拆解

| 步骤 | 用户动作 | 页面/模块 | 系统反馈 | 数据变化 | 下一步 | 当前实现状态 | 缺口 |
|---|---|---|---|---|---|---|---|
| 1 | 点击 `去看看` | Toast | 进入事项管理页 | 读取 user items | 查看分区 | 缺失 | 无事项页 |
| 2 | 查看 Active | Active 分区 | 显示 top active items，含 title、priority、steps preview | 无 | 编辑/park/complete/delete | 缺失 | 无 active cards |
| 3 | 查看 Parking | Parking 分区 | 显示 parked items，含 AI parking reason | 无 | restore/编辑/delete | 缺失 | 无 parking cards |
| 4 | 查看 Done | Done 分区 | 轻量显示完成归档 | 无 | 查看/可选 restore | 缺失 | 无 done archive |
| 5 | 修改 priority | Card/Detail | UI 显示 High/Medium/Low 变化 | 更新 item.priority | 推荐排序更新 | 缺失 | 无 selector |
| 6 | 编辑 steps | Detail | 小步骤可增删改 | 更新 steps | 保存/返回 | 缺失 | 无 steps 编辑 |
| 7 | Park item | Active/Detail | item 从 Active 移到 Parking | status active -> parking，保存 AI parkingReason | 查看 Parking | 缺失 | 无 park 操作 |
| 8 | Restore item | Parking/Detail | item 从 Parking 移回 Active | status parking -> active | 回 Active 或首页推荐 | 缺失 | 无 restore 操作 |
| 9 | Complete item | Active/Detail/Focus | 显示完成反馈 | status -> done，completedAt 写入 | `再看一件` / `先休息一下` | 缺失 | 无 complete 操作 |
| 10 | Delete item | Card/Detail | item 隐藏，出现 5 秒 undo toast | status -> deleted，deletedAt 写入 | 撤销或结束 | 缺失 | 无 soft delete |
| 11 | Undo delete | Undo toast | item 恢复，短暂显示 `已撤销` | 恢复原 status，清 deletedAt | 继续管理 | 缺失 | 无 undo |
| 12 | Manual add | Item Page | 新 item 出现在 Active 或指定分区 | 创建 item | 继续编辑/管理 | 缺失 | 无手动添加 |

#### 3.3.3 成功终点

- 用户能确认所有保存的想法都在事项页里。
- 用户能控制事项处于 Active、Parking 或 Done。
- 用户能编辑 AI 生成的 title、priority、status、steps。
- 用户能删除并在 5 秒内撤销。
- 完成事项后不会自动强推下一件事。

#### 3.3.4 中断与恢复

- 返回首页：最新 active/parking/done 状态应影响首页推荐。
- 刷新事项页：所有分区从后端恢复。
- 保存详情失败：保留用户正在编辑的内容，并提示重试。
- 重复点击状态按钮：保存中禁用该操作，避免重复写入。

### 主流程 4：Parking Resurface

#### 3.4.1 流程起点

- 用户打开首页。
- 系统发现没有合适 active recommendation，或某个 parked item 由于 timeHint/high priority 变得适合轻轻提示。
- 首页显示一个 Parking candidate prompt。
- 当前项目没有该功能。

#### 3.4.2 步骤拆解

| 步骤 | 用户动作 | 页面/模块 | 系统反馈 | 数据变化 | 下一步 | 当前实现状态 | 缺口 |
|---|---|---|---|---|---|---|---|
| 1 | 打开首页 | 首页 | 系统判断 active 是否有合适推荐 | 读取 active/parking items | 推荐或 candidate | 缺失 | 无候选算法 |
| 2 | 查看 candidate | Parking candidate | 显示一个 parked item 和温和提示 | 无 | 放到现在/继续放着 | 缺失 | 无 UI |
| 3 | 点击 `放到现在` | Candidate | item 进入 Active，可成为当前推荐 | status parking -> active | 看一下或管理 | 缺失 | 无状态更新 |
| 4 | 点击 `继续放着` | Candidate | prompt 消失，同一 item 不立即重复出现 | 写 snoozedUntil 或 lastSkippedAt | 回到首页 | 缺失 | snooze 规则待技术实现 |
| 5 | 没有 candidate | 首页 | 显示 capture-only 状态 | 无 | 输入新想法 | 缺失 | 无空态 |

#### 3.4.3 成功终点

- Parking 不会沉没，但系统一次只提示一个事项。
- 用户必须主动选择，系统不能自动批量把 Parking 移到 Active。
- `继续放着` 后同一事项不应立即再次出现。

#### 3.4.4 中断与恢复

- 刷新后：candidate 根据后端状态重新判断。
- candidate 已完成/删除：不再显示。
- `放到现在` 保存失败：保持 parked，提示重试。

## 4. 关键交互元素规格

| 元素 | 所在模块 | 默认状态 | hover/focus/active/disabled | 行为 | 成功反馈 | 错误反馈 | 是否影响数据 | 当前实现状态 | 补齐细节 |
|---|---|---|---|---|---|---|---|---|---|
| 用户名输入框 | 登录页 | 空 | focus 清晰；提交中 disabled | 输入用户名 | 登录成功进入首页 | 空用户名提示 | 是 | 缺失 | 简单 session 规则 |
| 登录按钮 | 登录页 | 可点击 | 提交中 disabled | 创建/恢复用户 | 进入首页 | 登录失败提示 | 是 | 缺失 | 不做复杂账号体系 |
| 更多按钮 | 首页顶栏 | 圆形三点 | 当前无明确状态 | 当前无行为 | 无 | 无 | 否 | 部分完成 | 若无菜单则隐藏或禁用 |
| thought textarea | Capture | 空，显示示例 | focus 已实现；错误态缺失 | 输入 raw text | 文本回显 | 空输入提示 | 提交后影响数据 | 部分完成 | 长度提示、错误位置 |
| `帮我捋一捋` | Capture | 可点击 | loading 时 disabled | 触发 AI 整理和保存 | 保存 toast | AI/保存失败提示 | 是 | 部分完成 | loading、防重复、接后端 |
| 保存 toast | 首页 | 隐藏 | `去看看` 可 focus | 保存成功后出现，自动消失 | `已经帮你保存好了` | 保存失败不显示成功 toast | 否 | 缺失 | 文案和时长 |
| `去看看` | Toast | 保存成功后出现 | focus 清晰 | 打开事项管理页 | 列表显示 saved items | 路由失败提示 | 读数据 | 缺失 | 中文文案已确认 |
| Recommendation card | 首页 | 有 active 推荐时显示 | 卡片本身不可点击，按钮可 focus | 展示一条推荐 | 信息清楚 | 无推荐时不显示 | 读数据 | 部分完成 | priority 改 High/Medium/Low |
| `看一下` | 推荐卡 | 可点击 | 点击后 active/disabled 短暂状态 | 进入 focus | 显示 `只看这一件` | item 不存在时刷新 | 可写 current | 部分完成 | 加编辑/完成入口 |
| `先不管` | 推荐卡 | 可点击 | 保存 skip 时 disabled | 暂时跳过当前推荐 | 下一推荐或 capture-only | 无下一条时给轻提示 | 是 | 部分完成 | 写 lastSkippedAt |
| Focus 编辑入口 | Focus | 可点击 | focus 清晰 | 打开详情页 | 详情加载 | 加载失败提示 | 读数据 | 缺失 | 第一版必须有 |
| Focus 完成入口 | Focus | 可点击 | 保存中 disabled | 完成当前 item | 完成反馈 | 保存失败提示 | 是 | 缺失 | 文案：再看一件/先休息一下 |
| Active card | 事项页 | 显示 item 摘要 | hover/focus 表明可打开 | 打开详情或快捷操作 | 详情/状态更新 | 保存失败提示 | 是 | 缺失 | 不展示过多 cards |
| Parking card | 事项页 | 轻量显示 | 同上 | restore/详情/delete | 移回 Active | 保存失败提示 | 是 | 缺失 | 展示 AI parking reason |
| Done row/card | 事项页 | 轻量归档 | 同上 | 查看/restore | 恢复或保持 done | 保存失败提示 | 是 | 缺失 | 视觉不能压迫 |
| Priority selector | 详情/卡片 | High/Medium/Low | focus/active/disabled | 改优先级 | chip 更新 | 保存失败提示 | 是 | 缺失 | 不再用数字优先级 |
| Status actions | 详情/卡片 | 按当前 status 展示可用动作 | 不可用动作 disabled/隐藏 | park/restore/complete | 分区移动 | 保存失败提示 | 是 | 缺失 | 防重复点击 |
| Steps editor | 详情 | 显示步骤列表 | 单项 focus；保存中 disabled | 增删改步骤 | steps 回显 | 空步骤处理提示 | 是 | 缺失 | 数量可增加 |
| Delete button | 详情/卡片 | 次要危险操作 | 点击后保存中 disabled | soft delete | undo toast | 失败保留 item | 是 | 缺失 | 低压但明确 |
| Undo toast | 全局 | 删除后 5 秒显示 | undo 可 focus | 撤销删除 | `已撤销` 短反馈 | 撤销失败提示 | 是 | 缺失 | 固定 5 秒 |
| Parking candidate actions | 首页 | 有候选时显示 | 保存中 disabled | 放到现在/继续放着 | prompt 更新 | 保存失败提示 | 是 | 缺失 | P0 简单版 |

## 5. 表单与输入规则

| 字段 | 输入类型 | 必填 | 默认值 | 合法格式 | 空值提示 | 范围 | 提交前校验 | 提交后反馈 | 当前实现 |
|---|---|---|---|---|---|---|---|---|---|
| username | text | 是 | 空 | 非空短文本 | `先输入一个名字。` | 待技术规格定长度 | trim 后非空 | 进入首页 | 缺失 |
| thought dump | textarea | 是 | 空 | 任意非空文本 | `想到什么都可以先放在这里。` | 建议 1-500 中文字符，超长可提示分次 | trim 后非空 | loading -> toast | 部分完成 |
| item title | text | 是 | AI 生成 | 非空文本 | `标题不能为空。` | 建议 1-80 字 | 非空 | 详情和列表回显 | 缺失 |
| priority | select/segmented | 是 | AI 生成或 Medium | High / Medium / Low | 不允许空 | 3 个固定值 | 属于允许值 | 推荐排序和 chip 更新 | 缺失 |
| status | action/select | 是 | active 或 parking | active / parking / done | 不允许空 | 固定值 | 属于允许值 | 分区移动 | 缺失 |
| steps | list editor | 否 | AI 生成 | 每步为短文本 | 空步骤可删除或忽略 | 支持增加数量 | 清理空步骤 | focus/detail 回显 | 缺失 |
| reason | AI short reason | 否 | AI 生成 | 短句 | 可用默认 reason | 建议一行内 | 缺失时 fallback | 推荐卡显示 | 部分完成 |
| parkingReason | AI reason | parking item 建议必有 | AI 生成 | 温和说明为什么先放着 | 缺失时用 `先安全放着。` | 短句 | 缺失时 fallback | Parking card 显示 | 缺失 |
| manual item title | text | 是 | 空 | 非空文本 | `先写下这件事。` | 建议 1-80 字 | 非空 | 新 item 出现在列表 | 缺失 |

隐性输入：

- `看一下`：用户选择当前推荐，进入 focus。
- `先不管`：用户暂时跳过推荐，写入 skip 状态。
- `放到现在`：用户把 parked item 恢复为 active。
- `继续放着`：用户保留 parked item，并暂时不再提示。
- `完成`：用户完成 whole item，不做 step-level completion。
- `删除/撤销`：用户 soft delete 或恢复 item。

## 6. 状态规格

| 状态 | 触发条件 | 页面表现 | 用户可操作项 | 系统反馈 | 数据变化 | 当前实现状态 | 缺口 |
|---|---|---|---|---|---|---|---|
| 初始未登录 | 首次进入或 session 失效 | 登录页 | 输入用户名 | 空值提示 | 创建/恢复 user | 缺失 | 需要登录页 |
| 首页初始 | 登录后且无推荐 | `先不用想清楚` + capture | 输入 thought dump | placeholder 引导 | 无 | 部分完成 | 未接登录/数据 |
| 首页推荐 | 有 active recommendation | 显示一条推荐 | 看一下/先不管/继续输入 | 推荐信息 | 读取 active items | 部分完成 | 来源不是后端 |
| 整理中 | 提交非空输入 | 按钮 disabled，loading 文案 | 等待 | aria-live 提示 | 暂存 raw input | 缺失 | 无 loading |
| 保存成功 | AI 和后端保存成功 | toast + 去看看 | 去看看/继续输入 | 已保存反馈 | items 已写入 | 缺失 | 无后端/toast |
| 空输入 | 空白提交 | 输入区提示，focus 回 textarea | 继续输入 | 温和提示 | 无 | 部分完成 | 提示位置需靠近输入 |
| Focus | 点击看一下 | `只看这一件` + steps | 编辑/完成/继续记录 | 状态切换 | 可写 current | 部分完成 | 缺编辑/完成 |
| 事项管理 | 进入事项页 | Active/Parking/Done | 管理事项 | 分区变化 | 读写 items | 缺失 | 页面缺失 |
| 编辑中 | 详情字段修改 | 表单显示未保存变化 | 保存/取消 | 保存中提示 | 保存后写 item | 缺失 | 详情缺失 |
| 完成 | 点击完成 | 轻反馈 + 两个动作 | 再看一件/先休息一下 | `这件完成了` | status=done | 缺失 | 完成动作缺失 |
| 删除待撤销 | 点击删除 | item 隐藏，undo toast 5 秒 | 撤销 | 删除反馈 | status=deleted | 缺失 | undo 缺失 |
| 已撤销 | 点击 undo | 短暂显示 `已撤销` | 继续管理 | 恢复确认 | 恢复原状态 | 缺失 | 二次反馈缺失 |
| 错误 | AI/保存/读取失败 | 温和错误文案 | 重试 | 不丢输入 | 失败不假写 | 缺失 | 错误状态缺失 |
| 刷新/返回 | 浏览器刷新或返回 | 从后端恢复页面 | 继续操作 | 加载/恢复 | 无额外变化 | 缺失 | 持久化缺失 |

## 7. 数据流与反馈

| 用户动作 | 触发模块 | 读取数据 | 写入/更新数据 | 页面反馈 | 是否持久化 | 刷新后表现 | 当前缺口 |
|---|---|---|---|---|---|---|---|
| 登录 | 登录页 | username | user/session | 进入首页 | 是 | 保持登录或可恢复 | 缺失 |
| 打开首页 | Home | session、active、parking、skip | 无 | recommendation/candidate/capture-only | 读取后端 | 恢复状态 | 缺失 |
| 输入想法 | Capture | 无 | textarea draft | 文本回显 | 否 | 可重置 | 已有 |
| 点击整理 | Capture | raw text | processing state | loading | 否 | 不适用 | loading 缺失 |
| AI 整理 | AI 编排层 | raw text、promptVersion | normalized AI result | loading 继续 | 否 | 不适用 | UI 未接入 |
| 保存 AI 结果 | 后端 | AI result、userId | batch/items/steps/aiMeta | success toast | 是 | items 可恢复 | 缺失 |
| 点击去看看 | Toast | saved items | 无 | 事项页分区 | 是 | 保持 | 缺失 |
| 看一下 | Recommendation | current item | current/focus state | focus 出现 | 可 session 化 | 后端可恢复 item | 部分完成 |
| 先不管 | Recommendation | current item | lastSkippedAt | 下一推荐 | 是或 session 持久 | 不立即重复 | 部分完成 |
| Park | Item | item | status=parking、parkingReason | 移到 Parking | 是 | 保持 parked | 缺失 |
| Restore | Item | item | status=active | 移到 Active | 是 | 保持 active | 缺失 |
| Complete | Item | item | status=done、completedAt | 完成反馈 | 是 | 保持 done | 缺失 |
| Delete | Item | item | status=deleted、deletedAt | undo toast | 是 | 保持删除，除非 undo | 缺失 |
| Undo | Toast | deleted item | 恢复原 status | `已撤销` | 是 | item 恢复 | 缺失 |
| Add step | Detail | item | steps append | 新步骤出现 | 保存后是 | steps 保持 | 缺失 |
| Remove step | Detail | item | steps remove | 步骤消失 | 保存后是 | steps 保持 | 缺失 |
| Move candidate to now | Candidate | parked item | status=active | prompt 变推荐/消失 | 是 | active 保持 | 缺失 |
| Keep candidate parked | Candidate | parked item | snoozedUntil/lastSkippedAt | prompt 消失 | 是 | 短期不提示 | 缺失 |

## 8. 异常与边界情况

| 异常 | 触发条件 | 当前表现 | 理想表现 | 用户如何恢复 | 是否影响闭环 | 优先级 |
|---|---|---|---|---|---|---|
| 未登录 | 打开产品 | 无登录页 | 要求简单用户名登录 | 输入用户名 | 是 | P0 |
| 用户名为空 | 点击登录 | 缺失 | 提示 `先输入一个名字。` | 输入后重试 | 是 | P0 |
| thought dump 为空 | 点击整理 | pill 文案变化，focus 输入 | 输入区附近提示 | 输入后重试 | 是 | P0 |
| 重复点击整理 | loading/save 中 | 可能重复执行本地逻辑 | 按钮 disabled | 等待完成 | 是 | P0 |
| AI timeout/failure | AI 调用失败 | UI 无异步失败 | 保留 raw input，允许重试/fallback | 重试 | 是 | P0 |
| AI JSON 无效 | schema 不合法 | AI 编排层可 fallback，UI 未接 | fallback，并标记 aiMeta | 继续或重试 | 是 | P0 |
| 保存失败 | 后端写入失败 | 缺失 | 不清空输入，不显示已保存 | 重试保存 | 是 | P0 |
| 无 active items | 首页打开 | 初始 capture-only | capture-only 或 Parking candidate | 输入/处理 candidate | 是 | P0 |
| 单条推荐被跳过 | 点击先不管 | 当前循环同一条 | 不立即重复，可显示 capture-only/candidate | 稍后再看 | 是 | P0 |
| Parking 为空 | 无 parked item | 缺失 | Parking 分区轻空态 | 无需操作 | 否 | P1 |
| Done 为空 | 无 done item | 缺失 | Done 分区轻空态 | 无需操作 | 否 | P1 |
| 删除误触 | 点击删除 | 缺失 | 5 秒 undo | 点击撤销 | 是 | P0 |
| 撤销失败 | undo 写入失败 | 缺失 | 提示失败，刷新列表 | 重试/刷新 | 是 | P0 |
| 内容过长 | title/reason/step 很长 | 未限制 | 换行、详情承载，不挤压按钮 | 编辑缩短 | 可能 | P1 |
| 移动端键盘遮挡 | 输入时键盘弹出 | 未验证 | 主按钮可滚动到达 | 滚动 | 可能 | P1 |
| 状态不一致 | item 已被删除仍被推荐 | 无后端状态 | 操作前校验，失败后刷新 | 刷新/重新选择 | 是 | P0 |
| Parking 自动回流过多 | 系统批量恢复 | 缺失 | 禁止批量，只提示一个 candidate | 用户决定 | 是 | P0 |

## 9. 响应式交互要求

移动端优先：

- 首页保持单列布局。
- 当前推荐、Parking candidate、Focus 三者同一时间只显示一种主状态。
- 底部 capture 输入始终容易找到，但不强制 fixed；键盘打开时必须可滚动到提交按钮。
- 推荐卡动作按钮必须留在卡片内部，避免用户误以为按钮属于输入区。
- 长标题、长步骤、长 reason 必须换行，不能遮挡按钮。
- 事项页可使用纵向分区：Active 在前，Parking 次之，Done 最轻。
- Active 最多突出 3-5 个，避免形成任务墙。

桌面端：

- 第一版可以继续使用移动宽度容器，作为 Web MVP 演示。
- 如果事项页在桌面展开，也仍然保持低压力分区，不做项目管理 dashboard。
- Hover 状态应提供轻反馈，但不能让页面显得像高压任务工具。

当前实现风险：

- 当前 CSS 有移动和桌面容器，但没有按钮 hover/active/disabled 状态。
- textarea 可 resize，真实移动端可能影响布局。
- 当前没有事项页，无法验证长列表响应式。

## 10. 可访问性与基础可用性

- 所有按钮必须有明确文本；纯图标按钮必须有 aria-label，并且有真实行为。
- 状态变化不能只依赖颜色，必须有文字反馈。
- 输入错误必须靠近对应输入区显示。
- loading、保存成功、错误提示应使用可被读屏感知的区域。
- textarea 已有隐藏 label，后续新增表单也必须有 label。
- 键盘用户必须能完成：登录、输入、提交、看一下、先不管、去看看、编辑、删除撤销。
- 删除是重要操作，必须有 undo，不做不可逆删除。
- 文案避免 `必须`、`赶紧`、`你应该`、排名、分数、streak、生产力压迫感。

## 11. 当前交互缺口清单

| 缺口 | 所属页面/模块 | 影响流程 | 严重程度 | 当前表现 | 理想表现 | 建议处理方式 |
|---|---|---|---|---|---|---|
| 简单用户名登录缺失 | 登录页 | 全部 P0 | P0 | 无登录 | 先登录再进入个人数据 | 新增登录页/session |
| 本地后端数据库缺失 | 数据层 | 全部 P0 | P0 | 数据在内存 | items 持久保存 | 建最小本地后端 DB |
| AI 编排层未接 UI | Capture | Flow 1 | P0 | 页面直接调本地 organizer | 使用 ai-organizer + fallback | 替换交互调用 |
| loading/disabled 缺失 | Capture | Flow 1 | P0 | 点击立即出结果 | 整理/保存中有反馈 | 增加状态机 |
| 保存 toast 缺失 | Toast | Flow 1 | P0 | 只有安全感 pill | `已经帮你保存好了` + `去看看` | 新增 toast |
| 事项管理页缺失 | Item Page | Flow 3 | P0 | 无处查看 saved items | Active/Parking/Done | 新增页面 |
| 详情编辑缺失 | Item Detail | Flow 3 | P0 | 不能编辑 AI 输出 | title/priority/status/steps 可编辑 | 新增详情页 |
| priority 展示需更新 | Recommendation | Flow 2/3 | P0 | `优先级 1` | High/Medium/Low | 更新数据和 UI |
| `先不管` 无持久 skip | Recommendation | Flow 2 | P0 | currentIndex 内存轮换 | 写 lastSkippedAt | 接后端 |
| 单条 skip 无反馈 | Recommendation | Flow 2 | P0 | 循环同一条 | capture-only/candidate | 增加边界状态 |
| Parking 管理缺失 | Parking | Flow 3/4 | P0 | 只有文案 | parked items 可见可恢复 | 新增分区和动作 |
| Parking candidate 缺失 | 首页 | Flow 4 | P0 | 无提示 | 简单完整 candidate | 新增候选逻辑 |
| 完成事项缺失 | Focus/Detail | Flow 3 | P0 | 无 complete | Done + 轻反馈 | 新增完成动作 |
| 删除撤销缺失 | Item | Flow 3 | P0 | 无 delete | soft delete + 5 秒 undo | 新增 undo toast |
| Steps 增删改缺失 | Detail | Flow 3 | P0 | 只显示 steps | 可编辑数量和文本 | 新增 steps editor |
| AI parking reason 未落地 | AI/Item | Flow 3/4 | P0 | 本地 savedItems 只有 reasonParked | Parking card 展示 AI reason | 保存字段并回显 |
| 刷新恢复缺失 | 全局 | 全部 P0 | P0 | 页面重置 | 从 DB 恢复 | 后端读取 |
| P1 搜索筛选未做 | Item Page | 管理效率 | P1 | 无 | 搜索、状态筛选、优先级筛选 | P1 实现 |

## 12. 交互验收标准

### 登录

- 当用户首次打开产品时，系统应该显示简单用户名登录页。
- 当用户输入非空用户名并提交时，系统应该进入首页。
- 如果用户名为空，系统应该提示用户先输入一个名字。

### Capture To Saved Items

- 当用户在首页输入非空 thought dump 并点击 `帮我捋一捋` 时，系统应该显示整理中状态并禁用重复提交。
- 当 AI 整理成功时，系统应该自动保存 thought batch、items、steps、priority、reason、parkingReason、aiMeta。
- 完成后，用户应该看到保存成功 toast 和 `去看看`。
- 当用户点击 `去看看` 时，系统应该显示事项管理页，并展示刚保存的 items。
- 如果 AI 或保存失败，系统应该保留原始输入，并允许重试。
- 刷新后，已保存 items 应该仍然存在。

### Homepage Recommendation To Action

- 当用户有 active items 时，首页应该只显示一条推荐。
- 推荐卡应该显示 title、High/Medium/Low、短 reason、tiny next step。
- 当用户点击 `看一下` 时，系统应该进入 `只看这一件` focus 状态。
- Focus 状态应该提供进入详情编辑和完成当前事项的入口。
- 当用户点击 `先不管` 时，系统应该暂时跳过当前 item，并避免立即重复推荐。
- 如果没有 active recommendation，系统应该显示 Parking candidate 或 capture-only 状态。

### Active And Parking Management

- 当用户进入事项管理页时，系统应该显示 Active、Parking、Done 分区。
- 当用户 park 一个 active item 时，该 item 应该移到 Parking，并展示 AI parking reason。
- 当用户 restore 一个 parked item 时，该 item 应该移回 Active。
- 当用户编辑 title、priority、status、steps 后保存，系统应该立即回显。
- 当用户完成一个 item 时，系统应该将其移到 Done，并显示 `再看一件` / `先休息一下`。
- 当用户删除 item 时，系统应该显示 5 秒 undo。
- 当用户点击 undo 时，系统应该恢复 item 并短暂显示 `已撤销`。

### Parking Resurface

- 当 active 没有合适推荐且存在 eligible parked item 时，首页应该只提示一个 Parking candidate。
- 当用户点击 `放到现在` 时，该 item 应该变为 active。
- 当用户点击 `继续放着` 时，该 item 应保持 parking，并短期内不再重复提示。
- 系统不能批量自动把 Parking items 移入 Active。

### P1 管理能力

- 当用户在事项页搜索时，系统应该按关键词过滤 items。
- 当用户按状态筛选时，系统应该显示对应状态 items。
- 当用户按 High/Medium/Low 筛选时，系统应该显示对应优先级 items。
- Merge/split 和 duplicate detection 不阻塞 P0，但应保留后续实现空间。

## 13. 后续待技术规格决定的问题

以下不是产品确认阻塞项，而是下一步技术规格需要决定的实现细节：

- 本地后端技术选型和启动方式。
- 本地数据库 schema 和迁移方式。
- session 存储方式。
- 页面路由实现方式。
- AI provider 接入时机和环境变量管理。
- `lastSkippedAt` 和 `snoozedUntil` 的具体时间窗口。
- Toast 自动消失时长，除 delete undo 固定 5 秒外，其余 toast 可在技术规格中定。
- P1 搜索/筛选的具体交互位置。

## 14. 版本边界

P0 必须完成：

- 简单用户名登录。
- 本地后端数据库持久化。
- 首页 capture + one recommendation + focus。
- AI organizing loading + fallback。
- 自动保存 + `去看看` toast。
- 事项管理页 Active / Parking / Done。
- 事项详情编辑 title / priority / status / steps。
- Parking reason 由 AI 提供并展示。
- Park / Restore / Complete / Delete with 5-second undo。
- Parking candidate 简单完整版本。
- 刷新后恢复已保存数据。

P1：

- 搜索。
- 状态筛选。
- High/Medium/Low 筛选。
- Merge/split AI-generated items。
- 更细的 Parking resurface 规则。
- 更详细的 AI recommendation explanation。

P2 / 暂缓：

- WeChat Mini Program。
- Active reminders。
- Calendar integration。
- Duplicate detection。
- Complex tags。
- Project hierarchy。
- Recurring items。
