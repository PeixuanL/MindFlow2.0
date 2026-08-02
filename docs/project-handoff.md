# MindFlow Project Handoff

## Current Date

2026-07-26

## Current Goal

Build MindFlow as both:

- a real usable AI-powered thought-organizing web MVP.
- an AI Product Manager portfolio project for job applications.

The product should demonstrate AI PM capability through user problem framing, AI workflow design, prompt/schema design, fallback design, evaluation planning, and a working demo.

## Product Positioning

MindFlow is a low-pressure thought-to-action product for attention-scattered users.

Core promise:

> Users can dump messy thoughts first. AI gently separates them, recommends one startable thing, and turns it into a tiny next step while keeping other thoughts safe.

Avoid positioning it as:

- a generic todo list.
- a chatbot.
- ADHD treatment.
- medical or mental-health diagnosis.
- productivity scoring or motivation pressure.

Use "attention-scattered users" more often than "ADHD users" in public-facing portfolio language.

## Completed Artifacts

### Product / Portfolio

- `docs/ai-pm-case-study.md`
  - Defines MindFlow as an AI PM portfolio case.
  - Covers product positioning, user problem, MVP loop, AI modules, schema direction, eval framework, risks, success metrics, and portfolio deliverables.

### AI Behavior Design

- `docs/ai-design.md`
  - Defines the AI role as a low-pressure thought organizer.
  - Defines input types, fixed JSON output schema, recommendation logic, Prompt v0, validation, fallback, bad cases, and prompt iteration path.

### AI Evaluation

- `docs/eval-plan.md`
  - Defines 7 evaluation metrics.
  - Provides 24 test cases across simple tasks, messy thought dumps, vague large tasks, emotional inputs, time-sensitive inputs, ambiguous/worry inputs, short/noisy inputs, and safety boundaries.
  - Includes failure tags and eval record template.

### Existing Prototype

- `src/prototype/index.html`
- `src/prototype/app.js`
- `src/prototype/organizer.mjs`
- `src/prototype/styles.css`
- `tests/prototype/organizer.test.js`

Current prototype flow:

```text
User input -> local organizer -> suggestion -> "看一下" focus steps or "先不管" next suggestion
```

## Verified So Far

Existing prototype organizer tests pass with bundled Node:

```text
/Users/jane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/prototype/organizer.test.js
```

Last confirmed result:

```text
3 tests passed
```

Global `node` and `npm` were not available in shell, so use the bundled Node path above.

## Current Repository State Notes

There were existing uncommitted changes before the latest documentation work. Do not revert unrelated work.

New documentation files added in this session:

- `docs/ai-pm-case-study.md`
- `docs/ai-design.md`
- `docs/eval-plan.md`
- `docs/project-handoff.md`

## Next Recommended Slice

Start development with an AI orchestration layer, not direct API integration.

Goal:

> Add `src/prototype/ai-organizer.mjs` to wrap mock AI output, JSON validation, normalization, and fallback to the existing local organizer.

This gives the project a real AI-product architecture before choosing or wiring a live provider.

### This Slice Does

- Add `src/prototype/ai-organizer.mjs`.
- Keep `src/prototype/organizer.mjs` as deterministic fallback.
- Define functions for:
  - organizing through mock AI.
  - validating AI JSON.
  - normalizing safe defaults.
  - falling back on invalid JSON or missing core fields.
- Add unit tests for:
  - valid AI-shaped response.
  - invalid JSON fallback.
  - missing `focusSteps` fallback.
  - missing optional labels/default fields normalization.

### This Slice Does Not

- Connect to a real AI API yet.
- Add backend or secrets.
- Publish the website.
- Build WeChat Mini Program.
- Add login, database, or long-term history.

## Proposed Implementation Shape

`ai-organizer.mjs` can expose:

```js
export async function organizeThoughtsWithAi(rawText, options = {}) {}
export function validateAiResult(result, rawText) {}
export function normalizeAiResult(result) {}
```

Suggested options:

```js
{
  aiClient: async ({ rawText }) => aiJson,
  fallbackOrganizer: organizeThoughts,
}
```

The current UI can later call `organizeThoughtsWithAi` instead of `organizeThoughts`.

For this slice, tests can pass mock `aiClient` functions. No network needed.

## After This Slice

1. Update UI to use `organizeThoughtsWithAi`.
2. Add loading and gentle fallback status.
3. Connect a real AI provider behind a local/server endpoint.
4. Run `docs/eval-plan.md` test cases.
5. Revise Prompt v0 to v1 based on the main failure pattern.
6. Publish a shareable web demo.
7. Create portfolio case study page for recruiters.

## Rough Timeline

- AI orchestration layer with tests: 0.5-1 day.
- UI integration with mock/fallback: 0.5-1 day.
- Real AI API endpoint and JSON validation: 1-2 days.
- Manual eval and prompt iteration: 1-2 days.
- Shareable web demo: 0.5-1 day.
- Recruiter-facing case study page: 1-2 days.

Expected usable web MVP:

- local AI-ready version: 1-2 days.
- real AI-enabled web MVP: 3-5 days.
- polished shareable portfolio version: 5-7 days.

WeChat Mini Program should come after the web MVP and usually adds another 1-2 weeks due to account setup, cloud functions, compliance, review, and platform-specific implementation.
