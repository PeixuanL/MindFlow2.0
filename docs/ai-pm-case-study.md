# MindFlow AI Product Case Study

## 1. Portfolio Goal

MindFlow is designed as an AI Product Manager portfolio project, not only as a lightweight app prototype.

The project should demonstrate that the product owner can:

- identify a meaningful user problem.
- define where AI creates product value.
- translate an ambiguous user input into a structured AI workflow.
- design prompts, JSON outputs, guardrails, and fallback behavior.
- evaluate AI quality with product-facing metrics.
- ship a small working MVP and explain the iteration path.

The intended hiring narrative:

> I designed MindFlow as an AI-native thought-to-action product for attention-scattered users. The core product challenge is not building another todo list, but turning messy, emotionally loaded thoughts into one low-pressure, actionable next step. I designed the AI workflow, prompt strategy, structured output schema, safety boundaries, fallback logic, and evaluation framework to make LLM behavior reliable enough for a real product flow.

## 2. Product Positioning

MindFlow helps attention-scattered users unload mixed thoughts and gently turn them into one small next step.

The first version is not a productivity command center. It is a low-pressure organizing layer between messy thoughts and traditional tasks.

### Target Users

- users who often feel mentally crowded by many unfinished thoughts.
- ADHD users or users who identify as easily distracted.
- users who resist traditional todo tools because they feel pressuring.
- users who want to preserve ideas without seeing a long intimidating list.

### Core User Problem

The problem is not only "I forget tasks." The deeper problem is:

- I do not know where to start.
- I cannot organize thoughts before capturing them.
- large vague tasks feel hard to begin.
- after writing things down, I still worry they will sink forever.
- seeing all tasks at once can create more pressure.

### AI Opportunity

AI is useful because the user should not need to format, classify, prioritize, or break down thoughts manually.

The AI product value is:

> Convert messy natural-language thought dumps into structured, low-pressure action suggestions while preserving the user's original input.

## 3. MVP Scope

The MVP should focus on one product loop:

```text
Thought dump -> AI organizing -> one gentle recommendation -> micro steps -> parking
```

### In Scope

- a mobile-first web prototype.
- a free-form thought input.
- AI-assisted splitting of a messy paragraph into discrete items.
- one recommended item shown at a time.
- a short reason for the recommendation.
- one tiny next step.
- 2-4 focus steps after the user taps "看一下".
- parking behavior for other thoughts.
- fallback to deterministic local organizing logic if AI fails.
- an AI design and evaluation record that can be shown in a portfolio.

### Out of Scope for MVP

- medical diagnosis or ADHD treatment claims.
- full task management.
- calendar sync.
- reminders and notifications.
- login and multi-device sync.
- social features.
- complex priority matrices.
- productivity scores, streaks, or guilt-based motivation.

## 4. AI Workflow Design

The AI should be designed as a structured organizing engine, not as a general chatbot.

Working name:

> Thought Structuring Engine

### AI Modules

1. `thought_splitter`
   - breaks the raw user input into separate items.
   - preserves the user's original wording in `source`.

2. `item_classifier`
   - labels each item as task, worry, idea, reminder, note, or unknown.
   - does not diagnose emotional or mental health states.

3. `startability_ranker`
   - chooses which item is most suitable to look at now.
   - prioritizes clarity, low resistance, and concrete next action over generic importance.

4. `micro_step_generator`
   - turns a task into one tiny next step.
   - the next step should be doable without planning the whole task.

5. `tone_guardrail`
   - keeps copy warm, restrained, and non-pressuring.
   - avoids productivity-shaming language.

6. `fallback_handler`
   - returns a usable result when the AI response is invalid, slow, or unavailable.
   - preserves the main user flow even when model quality is imperfect.

## 5. Structured Output Schema

The frontend should not depend on free-form AI prose. The AI should return a strict JSON object.

```json
{
  "status": "organized",
  "message": "其他想法都还在",
  "suggestions": [
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
  ],
  "savedItems": [
    {
      "source": "论文材料有点烦",
      "category": "task",
      "reasonParked": "它可能需要更多时间拆开，先安全放着。"
    }
  ]
}
```

### Schema Rules

- `status` must be `organized` or `empty`.
- `suggestions` must contain at least one item when input is non-empty.
- `title`, `reason`, and `nextStep` must be short enough for mobile UI.
- `focusSteps` should contain 2-4 concrete steps.
- `source` should preserve the closest original user phrase.
- no medical diagnosis, treatment instructions, legal advice, financial advice, or emergency guidance.

## 6. Prompt Strategy

MindFlow should use a layered prompt strategy instead of one vague instruction.

### System Role

```text
你是 MindFlow 的低压力想法整理助手。

用户会输入一段杂乱、口语化、可能没有格式的想法。你的任务不是催促用户完成更多事情，而是帮用户把脑子里的东西轻轻分开，并找出一件现在最适合“看一眼”的事。

原则：
- 语言温和、短句、具体。
- 不使用催促、责备、打鸡血、效率至上或制造焦虑的表达。
- 不要把未完成事项描述成失败。
- 不要做医疗诊断、心理治疗、法律、金融或高风险建议。
- 保留用户原意，不要过度改写。
- 如果任务太大，拆成很小的第一步。
- 优先推荐清楚、低阻力、可开始的一件事，而不是最宏大或最吓人的事。

只返回 JSON，不要返回 Markdown，不要解释。
```

### User Prompt Template

```text
请整理这段输入：
"""
{USER_INPUT}
"""

请返回符合 MindFlow schema 的 JSON。
```

### Prompt Iteration Plan

- v0: get valid JSON and basic splitting.
- v1: improve micro-step specificity.
- v2: reduce pressure language.
- v3: improve recommendation reasoning.
- v4: add bad-case handling for worries, emotional notes, and ambiguous items.

## 7. AI Evaluation Framework

The portfolio should show that AI quality is evaluated, not assumed.

### Evaluation Dataset

Create 20-30 test inputs across common cases:

- simple task lists.
- mixed tasks and worries.
- vague large tasks.
- time-sensitive items.
- emotional or self-critical language.
- very short input.
- noisy long input.
- safety-sensitive input.

### Quality Metrics

1. Split Accuracy
   - Did the AI separate the user's thoughts into reasonable items?

2. Recommendation Fit
   - Did the AI choose a low-resistance item that is reasonable to look at now?

3. Micro-step Quality
   - Is the next step concrete, small, and immediately actionable?

4. Tone Safety
   - Does the output avoid guilt, urgency, productivity pressure, or diagnosis?

5. Schema Validity
   - Can the frontend parse the JSON without repair?

6. Preservation
   - Is the original user wording preserved enough to avoid losing meaning?

7. Fallback Readiness
   - If AI fails, can the product still complete the main flow?

### Scoring Rubric

Use a 1-3 score for each metric:

- 1 = fails the product need.
- 2 = usable but needs improvement.
- 3 = meets the MVP bar.

The MVP quality target:

- average score >= 2.5 across core metrics.
- schema validity >= 95%.
- no severe tone or safety failures in the test set.

## 8. Product Risks and Mitigations

### Risk: AI Output Feels Generic

Mitigation:

- require the next step to be observable and physical when possible.
- evaluate micro-step specificity.
- keep bad cases and prompt revisions documented.

### Risk: Product Feels Like Another Todo App

Mitigation:

- first screen stays focused on capture.
- show one recommendation, not a long list.
- avoid complex priority systems.

### Risk: AI Creates Pressure

Mitigation:

- ban urgency and guilt language in prompt.
- add tone evaluation.
- use copy principles from `docs/mvp-copy-direction.md`.

### Risk: Safety or Medical Boundary Confusion

Mitigation:

- position as thought organization, not treatment.
- avoid claims like "treat ADHD" or "diagnose attention issues."
- provide gentle fallback language for self-harm or crisis-like input in later safety design.

### Risk: API Cost or Availability

Mitigation:

- keep deterministic fallback.
- make AI provider configurable.
- start with web prototype before mini program deployment.

## 9. MVP Success Metrics

For an early portfolio/demo version:

- users can complete the capture-to-recommendation flow without instruction.
- at least 70% of test users say the recommendation feels reasonable.
- at least 70% say the next step feels easier than the original thought.
- AI output passes the schema validity target.
- the case study clearly shows prompt iteration and evaluation thinking.

## 10. Portfolio Deliverables

The final AI PM portfolio package should include:

- live web demo.
- product one-pager.
- PRD.
- AI design document.
- prompt versions.
- JSON schema.
- evaluation dataset and scoring table.
- selected bad cases and iterations.
- short case study page for recruiters.

## 11. Next Build Slice

The next implementation slice should be:

> Add an AI organizing interface around the current prototype while preserving the existing local organizer as fallback.

Expected files:

- `docs/ai-design.md` for detailed prompt and schema.
- `docs/eval-plan.md` for test cases and scoring.
- `src/prototype/ai-organizer.mjs` for AI/fallback orchestration.
- existing UI updated only enough to show loading, AI errors, and fallback results.

Completion criteria:

- current local flow still works.
- AI response can be simulated with mock data.
- invalid AI JSON falls back safely.
- tests cover schema validation and fallback.
