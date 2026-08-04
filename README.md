# MindFlow2.0

This project uses a lightweight Vibe Coding workflow for AI-assisted development.

## Layout

- `AGENTS.md` - durable coding-agent instructions.
- `docs/` - workflow notes, specs, architecture, test plans, decisions, and references.
- `src/` - source code.
- `tests/` - tests.
- `scripts/` - project scripts and developer helpers.
- `.env.example` - environment variable names without real secrets.

## Current Status

The project has been initialized. The technical stack and first implementation slice still need to be chosen.

## Development Flow

1. Shape the next small slice.
2. Plan briefly.
3. Build the smallest useful result.
4. Verify.
5. Write back confirmed decisions when useful.

## Private AI Organizing

The deployed `/api/organize` route can call OpenRouter when `OPENROUTER_API_KEY` is configured. Without that key, it stays local and does not send input to an external model.

Privacy and cost guardrails:

- API keys stay in server-side environment variables only.
- Requests set `max_price` to zero so the prototype does not auto-spend by default.
- `OPENROUTER_REQUIRE_ZDR=true` asks OpenRouter for zero data retention routing by default; setting it to `false` may enable free routes but weakens privacy.
- The backend rejects input over 500 characters and rate-limits OpenRouter calls with `MINDFLOW_DAILY_AI_LIMIT`.
- The deployed API does not silently save local fallback results unless `MINDFLOW_ALLOW_LOCAL_ORGANIZE=true`.
- Keep this mode for portfolio demos and small friend testing; avoid highly sensitive medical, legal, financial, or identity information.
