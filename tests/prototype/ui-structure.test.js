import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("prototype exposes voice input and status tabs in the HTML shell", async () => {
  const html = await readFile("src/prototype/index.html", "utf8");

  for (const id of ["voice-button", "voice-status", "item-tabs", "active-tab", "parking-tab", "done-tab"]) {
    assert.ok(html.includes(`id="${id}"`), `${id} missing`);
  }

  assert.ok(html.includes("./app.js?v="), "module script should include a version query so mobile browsers pick up auth fixes");
});

test("item cards keep editing out of the list surface", async () => {
  const app = await readFile("src/prototype/app.js", "utf8");

  assert.equal(app.includes("createPrioritySelect"), false);
});

test("desktop home shell exposes the refined interaction landmarks", async () => {
  const [html, app] = await Promise.all([
    readFile("src/prototype/index.html", "utf8"),
    readFile("src/prototype/app.js", "utf8"),
  ]);

  for (const id of [
    "sidebar-toggle",
    "thought-input-count",
    "home-thoughts-list",
    "home-completed-list",
    "home-sidebar",
  ]) {
    assert.ok(html.includes(`id="${id}"`), `${id} missing`);
  }

  assert.ok(html.includes("全部想法"), "navigation should use 全部想法");
  assert.equal(html.includes("事项"), false, "interface copy should avoid 事项 wording");
  assert.equal(app.includes("事项"), false, "runtime copy should avoid 事项 wording");
  assert.ok(app.includes("整理中…"), "organizing state should use an ellipsis");
  assert.ok(app.includes("busyScopes"), "runtime should track busy state by concrete action");
  assert.equal(app.includes("setBusy(true)"), false, "runtime should not use one global busy state for every home action");
  assert.equal(app.includes("详情 ›"), false, "home sidebar rows should not repeat detail labels");
});

test("home sidebar is a priority action preview with source-aware detail return", async () => {
  const [html, app, css] = await Promise.all([
    readFile("src/prototype/index.html", "utf8"),
    readFile("src/prototype/app.js", "utf8"),
    readFile("src/prototype/styles.css", "utf8"),
  ]);

  assert.ok(html.includes("./styles.css?v="), "stylesheet should include a version query so visual state fixes are not cached");
  assert.ok(html.includes("优先处理"), "home preview should be framed as priority actions");
  assert.ok(html.includes("查看全部 ›"), "global list should remain a separate CTA");
  assert.ok(app.includes("getNextOpenStep(item)"), "home rows should preview the concrete next step");
  assert.ok(app.includes("recentOrganizedBatchId"), "home should remember the latest organized batch during the session");
  assert.ok(app.includes("刚刚整理"), "home should show the latest organize result before falling back to priority preview");
  assert.ok(app.includes("这次保存"), "home should explain that the current preview came from the latest organize action");
  assert.ok(app.includes("savedBatch.batch.id"), "saving organized input should set the latest batch as the home preview");
  assert.ok(app.includes("organizeWithLocalAi"), "organize and resplit should go through the local AI endpoint");
  assert.ok(app.includes("LOCAL_AI_WAIT_MS"), "local AI should have a bounded wait before falling back");
  assert.ok(app.includes("createFastOrganizeFallback"), "the browser runtime should keep a fast local fallback when AI is slow or unreliable");
  assert.ok(app.includes("Promise.race"), "AI and timeout should race so the UI does not get stuck waiting");
  assert.ok(app.includes("本地 AI 没赶上"), "fallback saves should be transparent to the user");
  assert.ok(html.includes("撤销本次整理"), "latest organize preview should offer a one-click undo");
  assert.ok(html.includes("换一种拆法"), "resplit should use an in-product option panel instead of a browser confirm");
  assert.ok(html.includes('data-resplit-strategy="sequence"'), "resplit should offer sequence-based splitting");
  assert.ok(html.includes('data-resplit-strategy="finer"'), "resplit should offer finer splitting");
  assert.ok(html.includes('data-resplit-strategy="missing"'), "resplit should offer missing-task recovery");
  assert.ok(css.includes(".resplit-panel.is-hidden"), "resplit panel should stay hidden until the user asks to resplit");
  assert.equal(app.includes("window.confirm"), false, "resplit should not use native browser confirmation");
  assert.ok(app.includes("undoRecentOrganization"), "runtime should let users undo a bad organize batch");
  assert.ok(app.includes("resplitRecentOrganization"), "runtime should run a new split from the selected strategy");
  assert.ok(app.includes('setStatus(t("status.resplittingWith", { strategy: strategyLabel }))'), "resplit should keep status feedback available to assistive tech");
  assert.ok(app.includes("上一次整理还在"), "failed resplits should reassure the user that the previous batch was preserved");
  assert.ok(app.includes("store.undoDelete(currentUser.id, itemId)"), "failed resplits should restore the previous batch");
  assert.ok(app.includes('createDetailHash(item.id, "home")'), "home rows should carry home as the detail source");
  assert.ok(app.includes('createDetailHash(item.id, "items")'), "item-list rows should carry items as the detail source");
  assert.ok(app.includes('from === "home" ? t("detail.backHome") : t("detail.backItems")'), "detail back copy should match entry source");
  assert.ok(app.includes("getDeadlineLabel(item)"), "home rows and cards should expose deadline reminder labels");
  assert.ok(app.includes("getItemPriorityScore(item)"), "home priority preview should use deadline-aware priority scoring");
  assert.ok(css.includes(".row-text .row-deadline"), "home rows should have a dedicated deadline reminder style");
  assert.ok(css.includes("resize: none"), "home capture input should not be draggable enough to hide suggestion actions");
  assert.ok(css.includes("height: clamp(116px, 15svh, 176px)"), "desktop home capture input should expand with available vertical space");
  assert.ok(css.includes(".home-primary .suggestion-section:not(.is-hidden)"), "home suggestion flex layout should not override hidden card state");
  assert.ok(css.includes(".home-primary .suggestion-section .action-row"), "home suggestion actions should be bottom-aligned within the recommendation card");
  assert.ok(css.includes("margin-top: auto"), "home suggestion action row should absorb empty card space above the buttons");
  assert.ok(css.includes("overflow: visible"), "home sidebar should not clip glass panel edges into visible seams");
  assert.ok(css.includes("box-shadow: 0 1px 0 rgba(255, 255, 255, 0.46) inset"), "desktop home cards should avoid external shadows that create panel seams");
  assert.ok(html.includes('id="status-message" class="sr-only"'), "home suggestion safety copy should not occupy visible card space");
  assert.equal(css.includes("scrollbar-gutter: stable"), false, "home primary column should not reserve a visible scrollbar gutter");
  assert.ok(css.includes("font-size: 38px"), "desktop home title should be quieter than the earlier oversized hero");
  assert.ok(css.includes("position: fixed"), "toast should float above the page instead of shifting card layout");
  assert.ok(css.includes("right: clamp(16px, 2vw, 32px)"), "toast should sit at the right edge with responsive breathing room");
  assert.ok(css.includes("env(safe-area-inset-bottom"), "toast should respect mobile bottom safe areas");
  assert.ok(css.includes("width: min(420px, calc(100vw - 32px))"), "toast should stay within small viewports");
  assert.equal(app.includes("priorityQuadrant"), false, "quadrant rules should not become visible item metadata");
  assert.equal(app.includes("来自记一笔"), false, "home priority rows should not spend space on source copy");
});

test("detail view exposes step regeneration and list cards avoid source explanations", async () => {
  const [html, app] = await Promise.all([
    readFile("src/prototype/index.html", "utf8"),
    readFile("src/prototype/app.js", "utf8"),
  ]);

  assert.ok(html.includes('id="regenerate-steps-button"'), "detail should expose a step regeneration control");
  assert.ok(html.includes('id="detail-regenerate-status"'), "detail regeneration should expose an inline undo status");
  assert.ok(html.includes('id="undo-regenerate-steps-button"'), "detail regeneration should offer a lightweight undo");
  assert.ok(app.includes("regenerateDetailSteps"), "runtime should regenerate small steps for the current item");
  assert.ok(app.includes("detailRegenerateStrategies"), "detail regeneration should rotate through alternate local strategies");
  assert.ok(app.includes("previousDetailStepsSnapshot = getDetailStepSnapshot()"), "detail regeneration should cache the previous step draft");
  assert.ok(app.includes("undoRegeneratedDetailSteps"), "detail regeneration should restore the previous draft when undone");
  assert.ok(app.includes("renderDetailStepSnapshot(previousDetailStepsSnapshot)"), "undo should restore the exact step inputs");
  assert.ok(app.includes('t("detail.regenerateDone", { strategy: strategyLabel })'), "detail regeneration should show visible success feedback");
  assert.ok(app.includes('regenerateStepsButton.textContent = t("detail.generating")'), "detail regeneration should show an in-progress button state");
  assert.equal(app.includes('reason.textContent = item.status === "parking" ? item.parkingReason : item.reason'), false);
  assert.ok(app.includes('t("card.nextStep", { step: getNextOpenStep(item) })'), "list cards should show the actionable next step instead of source text");
});

test("prototype exposes English localization and a persistent language switch", async () => {
  const [html, app, voice] = await Promise.all([
    readFile("src/prototype/index.html", "utf8"),
    readFile("src/prototype/app.js", "utf8"),
    readFile("src/prototype/voice-input.mjs", "utf8"),
  ]);

  assert.ok(html.includes('id="language-toggle"'), "language switch should be visible in the shell");
  assert.ok(app.includes('"en-US"'), "runtime should define English as a supported language");
  assert.ok(app.includes("LANGUAGE_STORAGE_KEY"), "language choice should be persisted");
  assert.ok(app.includes("applyStaticLanguage"), "static shell copy should update when language changes");
  assert.ok(app.includes("switchLanguage"), "language toggle should rerender the current route");
  assert.ok(app.includes('"nav.items": "All thoughts"'), "English navigation copy should be present");
  assert.ok(app.includes('"capture.submit": "Help me sort this out"'), "English capture CTA should be present");
  assert.ok(app.includes("voiceController?.updateLanguage"), "voice recognition should follow the selected language");
  assert.ok(voice.includes("updateLanguage"), "voice controller should accept language updates after initialization");
});

test("login uses a standalone page shell instead of sharing the app workspace", async () => {
  const [html, app, css] = await Promise.all([
    readFile("src/prototype/index.html", "utf8"),
    readFile("src/prototype/app.js", "utf8"),
    readFile("src/prototype/styles.css", "utf8"),
  ]);

  assert.ok(html.includes("login-page"), "login view should expose a dedicated login-page layout");
  assert.ok(html.includes("is-auth-checking"), "initial render should wait for the stored auth session before showing login");
  assert.ok(html.includes("Demo 体验"), "login view should expose a conventional demo entry");
  assert.ok(html.includes('id="demo-button"'), "demo entry should have a wired button id");
  assert.ok(html.includes('id="logout-button" class="logout-button"'), "logout should use a readable text button");
  assert.ok(html.includes('aria-label="退出登录"'), "logout should name the action clearly");
  assert.ok(html.includes(">退出</button>"), "logout should expose visible copy instead of an ambiguous icon");
  assert.ok(app.includes("is-login-shell"), "route rendering should switch the shell into login mode");
  assert.ok(app.includes('appShell.classList.remove("is-auth-checking")'), "route rendering should reveal the chosen view after auth check");
  assert.ok(app.includes("store.enterDemo"), "demo entry should enter a local demo session");
  assert.ok(css.includes(".app-shell.is-auth-checking"), "auth bootstrap state should avoid a login flash on refresh");
  assert.ok(css.includes(".app-shell.is-login-shell .app-sidebar"), "login mode should hide workspace navigation");
  assert.ok(css.includes(".login-page"), "login page should have its own layout rules");
  assert.ok(css.includes(".auth-demo-button"), "demo entry should align with the auth form");
  assert.ok(css.includes(".logout-button"), "logout should have a dedicated readable button style");
});

test("auth screen separates login and registration instead of asking for an access code", async () => {
  const [html, app] = await Promise.all([
    readFile("src/prototype/index.html", "utf8"),
    readFile("src/prototype/app.js", "utf8"),
  ]);

  for (const id of ["login-mode-button", "register-mode-button", "account-input", "password-input", "confirm-password-input", "display-name-input"]) {
    assert.ok(html.includes(`id="${id}"`), `${id} missing`);
  }

  assert.ok(html.includes("注册账号"), "auth copy should expose registration");
  assert.ok(html.includes("登录"), "auth copy should expose login");
  assert.ok(html.includes("现在看"), "visible item status should use natural Chinese copy");
  assert.ok(html.includes("先放着"), "visible parking status should use natural Chinese copy");
  assert.ok(html.includes("已完成"), "visible done status should use natural Chinese copy");
  assert.equal(html.includes("访问码"), false, "auth copy should not mention access code");
  assert.equal(html.includes("Active / Parking / Done"), false, "visible status summary should not use internal enum labels");
  assert.equal(html.includes(">Active<"), false, "active tab should not expose internal enum labels");
  assert.equal(html.includes(">Parking<"), false, "parking tab should not expose internal enum labels");
  assert.equal(html.includes(">Done<"), false, "done tab should not expose internal enum labels");
  assert.ok(app.includes("store.register"), "runtime should create accounts through register");
  assert.ok(app.includes("store.login"), "runtime should enter existing accounts through login");
  assert.equal(app.includes("accessCodeInput"), false, "runtime should not use access-code naming");
  assert.equal(app.includes("store.login(usernameInput.value)"), false, "login should not submit only a name");
});

test("detail view exposes editable deadline and tags fields", async () => {
  const [html, app] = await Promise.all([
    readFile("src/prototype/index.html", "utf8"),
    readFile("src/prototype/app.js", "utf8"),
  ]);

  for (const id of ["detail-due-date-input", "detail-due-time-input", "detail-due-at-input", "detail-tags-input"]) {
    assert.ok(html.includes(`id="${id}"`), `${id} missing`);
  }

  assert.ok(html.includes('class="deadline-input-group"'), "deadline input should use the custom styled date/time control");
  assert.ok(html.includes('id="detail-due-date-input" class="text-input deadline-date-input" type="date"'), "deadline date should use a styled date input");
  assert.ok(html.includes('id="detail-due-time-input" class="text-input deadline-time-input"'), "deadline time should use a styled select");
  assert.ok(app.includes("detailDueAtInput"), "detail runtime should wire due date input");
  assert.ok(app.includes("setDeadlineInputs(item.dueAt)"), "detail runtime should split saved due dates for the custom control");
  assert.ok(app.includes("composeDeadlineInputValue()"), "detail runtime should compose a saved ISO deadline from the custom control");
  assert.ok(app.includes("detailTagsInput"), "detail runtime should wire tags input");
});
