# MindFlow Web Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first runnable static Web prototype that lets a user enter scattered thoughts, press "帮我捋一捋", and see one low-pressure suggestion under "也许可以先看这个".

**Architecture:** Use a no-build static prototype so the first slice stays fast and dependency-light. Keep the organizing behavior in a small ES module with a Node built-in test, and keep browser UI behavior in a separate script.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js built-in `node:test`, local static HTTP server.

---

## File Structure

- Create `src/prototype/organizer.mjs`: pure mock organizing logic. It accepts raw text and returns a suggested item, saved items, and explanation text.
- Create `src/prototype/app.js`: browser interaction logic. It reads textarea input, calls the organizer, and updates DOM state.
- Create `src/prototype/styles.css`: mobile-first visual styling for the prototype.
- Create `src/prototype/index.html`: static Web prototype shell.
- Create `tests/prototype/organizer.test.js`: Node built-in tests for organizer behavior.
- Modify `docs/test-plan.md`: add the manual and automated checks for this prototype if the file is readable at execution time. If it is still unreadable, create `docs/mvp-web-prototype-test-plan.md` instead.

## Task 1: Mock Organizer Logic

**Files:**
- Create: `src/prototype/organizer.mjs`
- Create: `tests/prototype/organizer.test.js`

- [ ] **Step 1: Create the failing organizer test**

Create `tests/prototype/organizer.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { organizeThoughts } from "../../src/prototype/organizer.mjs";

test("organizeThoughts returns a gentle suggestion and saved items", () => {
  const result = organizeThoughts("牙医还没约，周末整理房间，保险那个事也要看，小王消息没回");

  assert.equal(result.suggestion.title, "给牙医打电话预约");
  assert.equal(result.suggestion.label, "也许可以先看这个");
  assert.equal(result.suggestion.reason, "它比较清楚，不需要一次处理太多。");
  assert.deepEqual(result.actions, ["看一下", "先不管"]);
  assert.ok(result.savedItems.length >= 2);
});

test("organizeThoughts asks for input when text is blank", () => {
  const result = organizeThoughts("   ");

  assert.equal(result.status, "empty");
  assert.equal(result.message, "想到什么都可以先放在这里。");
  assert.equal(result.suggestion, null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test tests/prototype/organizer.test.js
```

Expected: FAIL because `src/prototype/organizer.mjs` does not exist.

- [ ] **Step 3: Create the organizer implementation**

Create `src/prototype/organizer.mjs`:

```js
const DEFAULT_REASON = "它比较清楚，不需要一次处理太多。";

function splitThoughts(rawText) {
  return rawText
    .split(/[，,。.\n、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickSuggestion(items) {
  const dentalItem = items.find((item) => item.includes("牙医"));
  if (dentalItem) {
    return "给牙医打电话预约";
  }

  const messageItem = items.find((item) => item.includes("消息") || item.includes("回复"));
  if (messageItem) {
    return messageItem.includes("小王") ? "回复小王的消息" : "回复一条消息";
  }

  return items[0] || "先看一件最明确的事";
}

export function organizeThoughts(rawText) {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return {
      status: "empty",
      message: "想到什么都可以先放在这里。",
      suggestion: null,
      savedItems: [],
      actions: ["看一下", "先不管"],
    };
  }

  const items = splitThoughts(trimmed);
  const title = pickSuggestion(items);
  const savedItems = items.filter((item) => !title.includes(item) && !item.includes("牙医"));

  return {
    status: "organized",
    message: "其他想法都还在",
    suggestion: {
      label: "也许可以先看这个",
      title,
      reason: DEFAULT_REASON,
    },
    savedItems,
    actions: ["看一下", "先不管"],
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node --test tests/prototype/organizer.test.js
```

Expected: PASS with 2 tests passing.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/prototype/organizer.mjs tests/prototype/organizer.test.js
git commit -m "feat: add prototype organizer logic"
```

## Task 2: Static Prototype Shell

**Files:**
- Create: `src/prototype/index.html`
- Create: `src/prototype/styles.css`
- Create: `src/prototype/app.js`

- [ ] **Step 1: Create the HTML shell**

Create `src/prototype/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MindFlow Prototype</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main class="app-shell">
      <header class="top-bar">
        <div class="brand">MindFlow</div>
        <div class="today-label">今日</div>
      </header>

      <section class="capture-section" aria-labelledby="capture-title">
        <h1 id="capture-title">先不用想清楚</h1>
        <p class="supporting-copy">想到什么都可以先放在这里。</p>

        <label class="sr-only" for="thought-input">写下想到的事</label>
        <textarea
          id="thought-input"
          class="thought-input"
          rows="7"
          placeholder="例：牙医还没约，周末整理房间，保险那个事也要看，小王消息没回，论文材料有点烦..."
        ></textarea>

        <button id="organize-button" class="primary-button" type="button">帮我捋一捋</button>
        <p id="status-message" class="status-message">其他想法都还在</p>
      </section>

      <section id="suggestion-section" class="suggestion-section is-hidden" aria-live="polite">
        <p class="eyebrow" id="suggestion-label">也许可以先看这个</p>
        <h2 id="suggestion-title">给牙医打电话预约</h2>
        <p id="suggestion-reason" class="reason">它比较清楚，不需要一次处理太多。</p>
        <div class="action-row">
          <button id="look-button" class="secondary-button" type="button">看一下</button>
          <button id="skip-button" class="quiet-button" type="button">先不管</button>
        </div>
      </section>

      <section class="add-more-section" aria-labelledby="add-more-title">
        <h2 id="add-more-title">又想到什么</h2>
        <p>继续放在这里。</p>
      </section>
    </main>

    <script type="module" src="./app.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Create the mobile-first CSS**

Create `src/prototype/styles.css`:

```css
:root {
  color-scheme: light;
  --bg: #f7f8fa;
  --surface: #ffffff;
  --surface-soft: #eef3f6;
  --border: #d8e0ea;
  --text: #293241;
  --muted: #697586;
  --faint: #8d98a8;
  --button: #34424f;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.app-shell {
  width: min(100%, 420px);
  min-height: 100vh;
  margin: 0 auto;
  padding: 20px 16px 28px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.brand {
  font-size: 17px;
  font-weight: 750;
}

.today-label,
.eyebrow,
.status-message,
.add-more-section p {
  color: var(--faint);
  font-size: 13px;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 28px;
  line-height: 1.2;
  margin-bottom: 9px;
}

.supporting-copy {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.thought-input {
  width: 100%;
  min-height: 168px;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 14px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  line-height: 1.55;
}

.thought-input::placeholder {
  color: #9aa4b2;
}

.primary-button,
.secondary-button,
.quiet-button {
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid var(--border);
  padding: 10px 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  width: 100%;
  margin-top: 12px;
  border-color: var(--button);
  background: var(--button);
  color: white;
}

.status-message {
  margin-top: 12px;
  text-align: center;
}

.suggestion-section,
.add-more-section {
  margin-top: 16px;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface);
  padding: 16px;
}

.suggestion-section h2 {
  margin-top: 8px;
  font-size: 21px;
  line-height: 1.3;
}

.reason {
  margin-top: 10px;
  color: #7e8998;
  font-size: 13px;
  line-height: 1.5;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 14px;
}

.secondary-button {
  background: var(--surface-soft);
  color: #3f4c5a;
}

.quiet-button {
  background: var(--surface);
  color: #657284;
}

.add-more-section h2 {
  margin-bottom: 6px;
  font-size: 14px;
}

.is-hidden {
  display: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (min-width: 760px) {
  body {
    display: grid;
    place-items: center;
    padding: 32px;
  }

  .app-shell {
    min-height: auto;
    border: 1px solid var(--border);
    border-radius: 30px;
    background: #f9fafb;
  }
}
```

- [ ] **Step 3: Create a minimal app script**

Create `src/prototype/app.js`:

```js
import { organizeThoughts } from "./organizer.mjs";

const input = document.querySelector("#thought-input");
const organizeButton = document.querySelector("#organize-button");
const statusMessage = document.querySelector("#status-message");
const suggestionSection = document.querySelector("#suggestion-section");
const suggestionLabel = document.querySelector("#suggestion-label");
const suggestionTitle = document.querySelector("#suggestion-title");
const suggestionReason = document.querySelector("#suggestion-reason");
const lookButton = document.querySelector("#look-button");
const skipButton = document.querySelector("#skip-button");

function renderResult(result) {
  statusMessage.textContent = result.message;

  if (result.status === "empty") {
    suggestionSection.classList.add("is-hidden");
    input.focus();
    return;
  }

  suggestionLabel.textContent = result.suggestion.label;
  suggestionTitle.textContent = result.suggestion.title;
  suggestionReason.textContent = result.suggestion.reason;
  suggestionSection.classList.remove("is-hidden");
}

organizeButton.addEventListener("click", () => {
  renderResult(organizeThoughts(input.value));
});

lookButton.addEventListener("click", () => {
  statusMessage.textContent = "可以只看这一件。其他想法都还在。";
});

skipButton.addEventListener("click", () => {
  statusMessage.textContent = "先不管也可以。其他想法都还在。";
});
```

- [ ] **Step 4: Serve the prototype locally**

Run:

```bash
python3 -m http.server 18789 -d src/prototype
```

Expected: server starts on port 18789. Open:

```text
http://localhost:18789
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/prototype/index.html src/prototype/styles.css src/prototype/app.js
git commit -m "feat: add static web prototype shell"
```

## Task 3: Manual Interaction Verification

**Files:**
- Modify: `docs/test-plan.md` if readable
- Create fallback: `docs/mvp-web-prototype-test-plan.md`

- [ ] **Step 1: Run automated tests**

Run:

```bash
node --test tests/prototype/organizer.test.js
```

Expected: PASS with 2 tests passing.

- [ ] **Step 2: Manually verify empty input**

Open `http://localhost:18789`, leave the textarea empty, and press "帮我捋一捋".

Expected:
- suggestion card remains hidden.
- status text shows "想到什么都可以先放在这里。".
- cursor focus returns to the textarea.

- [ ] **Step 3: Manually verify organizing flow**

Enter:

```text
牙医还没约，周末整理房间，保险那个事也要看，小王消息没回，论文材料有点烦
```

Press "帮我捋一捋".

Expected:
- suggestion card appears.
- label is "也许可以先看这个".
- suggestion title is "给牙医打电话预约".
- reason is "它比较清楚，不需要一次处理太多。".
- buttons show "看一下" and "先不管".

- [ ] **Step 4: Manually verify action buttons**

Click "看一下".

Expected: status text changes to "可以只看这一件。其他想法都还在。".

Click "先不管".

Expected: status text changes to "先不管也可以。其他想法都还在。".

- [ ] **Step 5: Manually verify responsive layout**

Check browser widths around 390px and 900px.

Expected:
- no text overlaps.
- buttons fit inside their row.
- textarea and cards stay inside the prototype frame.
- first screen does not show a parking section.

- [ ] **Step 6: Write verification notes**

If `docs/test-plan.md` is readable, append:

```markdown
## MVP Web Prototype Checks

- Automated: `node --test tests/prototype/organizer.test.js`
- Manual: empty input, messy input organizing flow, "看一下", "先不管", 390px and 900px responsive checks.
- First-screen parking area must remain hidden; only reassurance text is shown.
```

If `docs/test-plan.md` is not readable, create `docs/mvp-web-prototype-test-plan.md` with the same content.

- [ ] **Step 7: Commit**

Run:

```bash
git add docs/test-plan.md docs/mvp-web-prototype-test-plan.md
git commit -m "docs: add web prototype verification notes"
```

If one of the two files does not exist, remove it from the `git add` command.

## Self-Review

- Spec coverage: the plan covers capture, mock organizing, one suggested item, approved copy, hidden first-screen parking area, empty input, and manual responsive checks.
- Placeholder scan: no implementation step contains reserved placeholder markers or open-ended instructions.
- Type consistency: `organizeThoughts`, `status`, `message`, `suggestion`, `savedItems`, and `actions` are consistent across tests, module, and UI script.
