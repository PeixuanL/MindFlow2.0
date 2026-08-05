# AI PM Session 01: Optimizing Natural-Language Organizing

## Session Goal

Use MindFlow's natural-language organizing flow as a real AI Product Manager case study.

The goal is not to "make the prompt sound smarter." The goal is to learn a repeatable product loop:

```text
User input -> Expected behavior -> Evaluation case -> Failure label -> Fix decision -> Verification
```

## Product Question

When a user writes a messy, life-like paragraph, can MindFlow turn it into useful, low-pressure action items?

Good output should:

- extract real tasks from casual wording.
- ignore pure emotion or background when it is not actionable.
- rewrite vague life phrases into short action titles.
- avoid over-splitting one broad goal into noisy fragments.
- preserve the user's meaning without inventing new tasks.
- generate one tiny next step for each saved item.

## AI PM Mental Model

### 1. Do not start from the prompt

Prompt changes are only one lever. Before changing prompts, define what "good" means.

For this feature, "good" means:

- `Split Accuracy`: the right tasks are separated.
- `Title Quality`: titles are action-like, not raw sentence fragments.
- `Context Filtering`: emotion and background do not become fake tasks.
- `Grouping`: one broad goal stays together when that is more useful.
- `Startability`: the next step is concrete and small.
- `Speed`: local organizing should feel immediate in the MVP.

### 2. Build a golden set

A golden set is a small set of real-looking inputs with expected outputs.

MindFlow now has life-like cases for:

- family reminders and bills.
- work edits and missed replies.
- anxiety/context mixed with admin tasks.
- home chores.
- interview/application preparation.
- errands on the way home.

Each case is a product decision, not just a test. It says: "For this kind of user language, this is the behavior we want."

### 3. Label the failure

When output feels wrong, do not only say "bad." Tag the failure:

- `under_split`: missed a real item.
- `over_split`: split one useful goal into too many fragments.
- `raw_title`: kept the user's sentence instead of rewriting into an action title.
- `context_as_task`: saved emotion/background as a task.
- `lost_action`: ignored a soft action phrase such as "没交", "快过期", "顺路买".
- `generic_next_step`: next step is too vague.
- `slow_path`: the model path is too slow for the product loop.

### 4. Choose the right lever

Use this decision table:

| Problem | Better first lever |
| --- | --- |
| Missing a common phrase pattern | Rule or prompt example |
| Valid but awkward title | Title normalization rule |
| AI returns invalid JSON | Schema and validation |
| AI is too slow locally | Product fallback path |
| User disagrees with split | Editing and correction UI |
| Repeated real-world mistakes | Add golden-set cases |

## What We Changed Before This Session

The local MVP was too slow because it waited for Ollama to generate full JSON.

Measured before:

- API organizing took about 16-35 seconds.
- Browser organizing took about 36 seconds.
- The result was then blocked as over-split.

Current product decision:

- local `localhost` / `127.0.0.1` uses deterministic semantic organizing first.
- cloud/AI model paths remain available for later comparison.
- local organizing should complete in milliseconds and preserve the main product loop.

## Session 1 Slice

This session adds another uncovered life domain:

```text
猫砂快没了，猫疫苗还没约，房东说洗手间漏水要拍视频给他。
```

Expected split:

- 买猫砂
- 预约猫疫苗
- 拍漏水视频给房东

Why this case matters:

- It mixes pet care and home maintenance.
- It contains soft signals: "快没了", "还没约", "要拍".
- It includes another person as context: "房东说".
- It should not save "房东说" as its own task.

## Session 1 Result

Observed failure before the fix:

```text
猫疫苗还没约
房东说洗手间漏水要拍视频给他
```

Main failure tags:

- `lost_action`: "猫砂快没了" was missed as a buying task.
- `raw_title`: "房东说洗手间漏水要拍视频给他" was kept as raw phrasing.

Product decision:

- Add this domain to the local semantic golden set.
- Teach the local organizer common pet/home-maintenance signals:
  - `猫砂快没了` -> `买猫砂`
  - `猫疫苗还没约` -> `预约猫疫苗`
  - `房东说...漏水...拍视频` -> `拍漏水视频给房东`

Verification:

- The new test failed before the rule change.
- The same test passed after the rule change.
- This keeps the product loop fast because it stays on the local semantic path.

## How To Continue Practicing

For each future session:

1. Pick one new real-world domain.
2. Write 3-5 messy user inputs.
3. Decide expected titles before looking at model output.
4. Run the organizer.
5. Tag the failures.
6. Fix the smallest useful layer.
7. Add the case to tests and documentation.

This is the AI PM habit: make product quality observable before optimizing it.
