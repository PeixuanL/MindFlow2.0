# Components

## Framework And Component Model

- Framework: vanilla HTML, CSS, and JavaScript.
- Component library: none.
- CSS approach: hand-authored CSS variables and class-based styling in `src/prototype/styles.css`.
- The current prototype does not define shared JavaScript UI component files such as `Button`, `Card`, `Input`, or `Tabs`.

## Primitive Styles

The reusable UI primitives are CSS class patterns used in `src/prototype/index.html` and dynamic DOM nodes from `src/prototype/app.js`.

### Buttons

- Source: `src/prototype/styles.css`
- Classes: `.primary-button`, `.primary-action-button`, `.secondary-button`, `.text-button`, `.icon-button`, `.small-button`
- Used for: primary capture action, recommendation actions, nav buttons, item controls, detail editor actions.

### Inputs

- Source: `src/prototype/styles.css`
- Classes: `.text-input`, `.thought-input`, `.mini-select`, `.compact-textarea`
- Used for: login name, thought capture, manual item add, item detail editor.

### Cards And Surfaces

- Source: `src/prototype/styles.css`
- Classes: `.suggestion-section`, `.capture-section`, `.item-card`, `.detail-form`, `.toast`, `.empty-state`, `.next-step-panel`
- Used for: current recommendation, bottom capture, task cards, editor form, feedback toasts, empty states.

## Dynamic DOM Components

### ItemCard

- Source: `src/prototype/app.js`
- Function: `createItemCard(item)`
- Description: Creates one task card with status eyebrow, priority chip, title, reason, preview steps, and status-specific controls.
- Key dynamic states: `active`, `parking`, `done`.

```js
function createItemCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";

  const meta = document.createElement("div");
  meta.className = "recommendation-meta";
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = item.status === "parking" ? "Parking" : item.status === "done" ? "Done" : "Active";
  const chip = document.createElement("span");
  chip.textContent = priorityLabels[item.priority];
  meta.append(eyebrow, chip);

  const title = document.createElement("h3");
  title.textContent = item.title;

  const reason = document.createElement("p");
  reason.className = "reason";
  reason.textContent = item.status === "parking" ? item.parkingReason : item.reason;

  const steps = document.createElement("ol");
  steps.className = "preview-steps";
  item.steps.slice(0, 3).forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    steps.append(li);
  });

  const controls = document.createElement("div");
  controls.className = "card-controls";

  const detailButton = createButton("详情", "secondary-button", () => navigate(`#detail/${item.id}`));
  const deleteButton = createButton("删除", "secondary-button", () => deleteItem(item.id));
  controls.append(detailButton);

  if (item.status === "active") {
    controls.append(
      createButton("Park", "secondary-button", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "parking" }))),
      createButton("完成", "primary-action-button", () => completeItem(item.id)),
      deleteButton,
    );
  } else if (item.status === "parking") {
    controls.append(
      createButton("恢复", "primary-action-button", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "active" }))),
      deleteButton,
    );
  } else {
    controls.append(
      createButton("恢复", "secondary-button", () => runItemAction(() => store.updateItem(currentUser.id, item.id, { status: "active" }))),
      deleteButton,
    );
  }

  card.append(meta, title, reason, steps, controls);
  return card;
}
```

