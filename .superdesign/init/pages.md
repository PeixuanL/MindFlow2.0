# Pages

## /#home

Entry: `src/prototype/index.html`

Dependencies:

- `src/prototype/index.html`
  - `src/prototype/styles.css`
  - `src/prototype/app.js`
    - `src/prototype/ai-organizer.mjs`
      - `src/prototype/ollama-client.mjs`
      - `src/prototype/organizer.mjs`
    - `src/prototype/store.mjs`

Visual sections:

- `.top-bar`
- `.hero-section`
- `#suggestion-section`
- `#candidate-section`
- `#focus-section`
- `#done-section`
- `#toast`
- `.safe-pill`
- `.capture-section`

## /#items

Entry: `src/prototype/index.html`

Dependencies:

- `src/prototype/index.html`
  - `src/prototype/styles.css`
  - `src/prototype/app.js`
    - `src/prototype/store.mjs`

Visual sections:

- `.top-bar`
- `.compact-hero`
- `.inline-add-form`
- `.item-tabs`
- `.list-section`
- dynamically generated `.item-card`
- `#undo-toast`

## /#detail/:id

Entry: `src/prototype/index.html`

Dependencies:

- `src/prototype/index.html`
  - `src/prototype/styles.css`
  - `src/prototype/app.js`
    - `src/prototype/store.mjs`

Visual sections:

- `.top-bar`
- `.compact-hero`
- `.detail-form`
- `.steps-editor`
- dynamically generated `.step-input-row`

## Prior Mobile Reference

Entry: `src/prototype/ui-reference-prototype.html`

Dependencies:

- `src/prototype/ui-reference-prototype.html`
  - `src/prototype/ui-reference-prototype.css`

Use this as a mobile-only reference for the approved first-screen rhythm.

