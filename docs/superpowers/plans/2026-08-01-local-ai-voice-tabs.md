# Local AI Voice Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe local AI organizing through Ollama, voice input, tabbed item sections, and detail-only editing without exposing API keys.

**Architecture:** Keep the static prototype UI, add a local Node server that serves files and proxies `/api/organize` to Ollama on `127.0.0.1:11434`. The browser never receives API keys. UI state remains in `localStorage` via `store.mjs`; local AI failures fall back to the current deterministic organizer.

**Tech Stack:** Plain HTML/CSS/JavaScript ES modules, Node built-in `http`, browser Web Speech API, Ollama `/api/chat` with `stream:false` and `format:"json"`.

## Global Constraints

- Do not put API keys in frontend code, HTML, localStorage, or Git.
- Bind local prototype server to `127.0.0.1`.
- Keep existing visual language; only add styles needed for controls and tabs.
- Use fallback organizing when Ollama is unavailable or returns invalid JSON.
- Item list cards are summaries; editing happens only in the detail view.

---

### Task 1: Local Ollama Client

**Files:**
- Create: `src/prototype/ollama-client.mjs`
- Test: `tests/prototype/ollama-client.test.js`

**Interfaces:**
- Produces: `createOllamaClient({ fetchImpl, endpoint, model, timeoutMs }) => async ({ rawText }) => string`
- Produces: `buildMindFlowMessages(rawText) => Array<{ role: string, content: string }>`

- [ ] Write failing tests for request shape, response extraction, and failure handling.
- [ ] Implement minimal Ollama client using `/api/chat`, `stream:false`, `format:"json"`, and temperature `0`.
- [ ] Run `node --test tests/prototype/ollama-client.test.js`.

### Task 2: Local Prototype Server

**Files:**
- Create: `src/prototype/server.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `createOllamaClient`
- Produces: `GET /` and static file serving
- Produces: `POST /api/organize` returning AI JSON text or an error status

- [ ] Add a `dev` script that starts the server on `127.0.0.1`.
- [ ] Implement static file serving and `/api/organize`.
- [ ] Keep the existing fallback path in the browser.

### Task 3: Browser AI Integration

**Files:**
- Modify: `src/prototype/app.js`

**Interfaces:**
- Consumes: same-origin `/api/organize`
- Produces: `serverAiClient({ rawText })`

- [ ] Call `organizeThoughtsWithAi(rawText, { aiClient: serverAiClient })`.
- [ ] If `/api/organize` fails, let `organizeThoughtsWithAi` return fallback meta.
- [ ] Keep loading, disabled, and error behavior.

### Task 4: Detail-Only Editing and Tabs

**Files:**
- Modify: `src/prototype/app.js`
- Modify: `src/prototype/index.html`
- Modify: `src/prototype/styles.css`
- Test: `tests/prototype/store.test.js`

**Interfaces:**
- Produces: `getItemsByStatus(userId, status)`.
- Produces: item-page tabs for `active`, `parking`, and `done`.

- [ ] Add failing store test for status-filtered item lists.
- [ ] Remove inline priority selector from cards; cards keep summary actions only.
- [ ] Add item-section tabs and render one section at a time.
- [ ] Keep title, priority, status, reason, parkingReason, and steps editing in detail view.

### Task 5: Voice Input

**Files:**
- Modify: `src/prototype/index.html`
- Modify: `src/prototype/app.js`
- Modify: `src/prototype/styles.css`

**Interfaces:**
- Consumes: browser `SpeechRecognition` or `webkitSpeechRecognition`.
- Produces: voice button states: unsupported, listening, stopped, error.

- [ ] Add voice button near capture controls.
- [ ] Append recognized transcript to the textarea without clearing typed content.
- [ ] Disable the button when unsupported and show a gentle inline note.
- [ ] Do not persist audio; only text transcript enters existing capture flow.

### Task 6: Verification

**Files:**
- Modify only if verification finds a P0 break.

- [ ] Run `node --test tests/prototype/*.test.js`.
- [ ] Run `node --check src/prototype/app.js`.
- [ ] Run `node --check src/prototype/server.mjs`.
- [ ] Start local server and smoke `GET /`.
- [ ] If Ollama is not running, verify fallback still saves items.
