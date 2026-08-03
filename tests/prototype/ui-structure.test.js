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
  assert.equal(app.includes("详情 ›"), false, "home sidebar rows should not repeat detail labels");
});

test("login uses a standalone page shell instead of sharing the app workspace", async () => {
  const [html, app, css] = await Promise.all([
    readFile("src/prototype/index.html", "utf8"),
    readFile("src/prototype/app.js", "utf8"),
    readFile("src/prototype/styles.css", "utf8"),
  ]);

  assert.ok(html.includes("login-page"), "login view should expose a dedicated login-page layout");
  assert.ok(app.includes("is-login-shell"), "route rendering should switch the shell into login mode");
  assert.ok(css.includes(".app-shell.is-login-shell .app-sidebar"), "login mode should hide workspace navigation");
  assert.ok(css.includes(".login-page"), "login page should have its own layout rules");
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
  assert.equal(html.includes("访问码"), false, "auth copy should not mention access code");
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

  for (const id of ["detail-due-at-input", "detail-tags-input"]) {
    assert.ok(html.includes(`id="${id}"`), `${id} missing`);
  }

  assert.ok(app.includes("detailDueAtInput"), "detail runtime should wire due date input");
  assert.ok(app.includes("detailTagsInput"), "detail runtime should wire tags input");
});
