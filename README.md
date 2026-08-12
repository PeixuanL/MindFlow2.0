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

The deployed `/api/organize` route can call OpenRouter or NVIDIA NIM from server-side environment variables. Without a configured cloud provider, it stays local and does not send input to an external model.

To test NVIDIA NIM before deploying, keep the API key in your shell or `.env.local` only:

```bash
AI_PROVIDER=nvidia \
NVIDIA_API_KEY=nvapi-your-key \
NVIDIA_MODEL=openai/gpt-oss-20b \
node --test tests/prototype/nvidia-client.test.js tests/prototype/organize-api.test.js
```

For a real local quality check, call the API route through Vercel dev or a deployed preview with:

```text
AI_PROVIDER=nvidia
NVIDIA_API_KEY=nvapi-your-key
NVIDIA_MODEL=openai/gpt-oss-20b
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
```

Then request `GET /api/organize` and confirm it reports `aiProvider: "nvidia"` with `nvidiaConfigured: true`.

## Local Ollama Organizing

For this-computer-only use, run MindFlow against the local Ollama service instead of cloud AI:

```bash
ollama serve
ollama pull qwen2.5:3b
npm run dev
```

Then open:

```text
http://127.0.0.1:18811
```

The local prototype uses:

```text
OLLAMA_ENDPOINT=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
```

The local `/api/organize` route only accepts a local Ollama endpoint, keeps input on this computer, and exposes a GET diagnostic endpoint so you can confirm the active model.

Privacy and cost guardrails:

- API keys stay in server-side environment variables only.
- Requests set `max_price` to zero so the prototype does not auto-spend by default.
- `OPENROUTER_REQUIRE_ZDR=false` enables the temporary free-test route; set it to `true` to require zero data retention routing again.
- The backend rejects input over 500 characters and rate-limits OpenRouter calls with `MINDFLOW_DAILY_AI_LIMIT`.
- The deployed API does not silently save local fallback results unless `MINDFLOW_ALLOW_LOCAL_ORGANIZE=true`.
- Keep this mode for portfolio demos and small friend testing; avoid highly sensitive medical, legal, financial, or identity information.
