# Layouts

## App Shell

- Source: `src/prototype/index.html`
- Description: Single-page prototype shell. It contains a top bar and four hash-routed views: login, home, items, and detail.
- Current desktop issue: `.app-shell` is capped at `393px`, so desktop renders as a centered mobile-width surface rather than a responsive web layout.

```html
<main class="app-shell">
  <header class="top-bar">
    <div>
      <p id="today-label" class="today-label">今天</p>
      <div class="brand">MindFlow</div>
    </div>
    <div id="top-actions" class="top-actions is-hidden">
      <button id="home-nav-button" class="text-button" type="button">首页</button>
      <button id="items-nav-button" class="text-button" type="button">事项</button>
      <button id="logout-button" class="icon-button" type="button" aria-label="退出"><span></span></button>
    </div>
  </header>

  <section id="login-view" class="view-section" aria-labelledby="login-title">...</section>
  <section id="home-view" class="view-section is-hidden" aria-labelledby="capture-title">...</section>
  <section id="items-view" class="view-section is-hidden" aria-labelledby="items-title">...</section>
  <section id="detail-view" class="view-section is-hidden" aria-labelledby="detail-title">...</section>
</main>
```

## View Routing

- Source: `src/prototype/app.js`
- Description: Hash-based client routing swaps visible sections and updates top nav visibility.

```js
function showView(name) {
  Object.values(views).forEach((view) => view.classList.add("is-hidden"));
  show(views[name]);
  topActions.classList.toggle("is-hidden", name === "login");
  todayLabel.textContent = currentUser ? currentUser.name : "今天";
}

function renderRoute() {
  currentUser = store.getSession();

  if (!currentUser) {
    showView("login");
    usernameInput.focus();
    return;
  }

  const hash = window.location.hash || "#home";
  if (hash.startsWith("#detail/")) {
    renderDetail(hash.replace("#detail/", ""));
  } else if (hash === "#items") {
    renderItems();
  } else {
    renderHome();
  }
}
```

