# Extractable Components

This vanilla prototype has no framework-level reusable components to extract into Superdesign `DraftComponent` entities.

## AppShell

- Source: `src/prototype/index.html`
- Category: layout
- Description: Top bar plus hash-routed views inside `main.app-shell`.
- Extractable props: `activeView` (string, default: `home`), `userName` (string, default: `今天`), `showTopActions` (boolean, default: true)
- Hardcoded: MindFlow brand text, nav labels, structural view containers.

## RecommendationPanel

- Source: `src/prototype/index.html`
- Category: basic
- Description: Current recommendation panel with eyebrow, priority chip, title, next step, reason, and two actions.
- Extractable props: `title`, `priorityLabel`, `reason`, `nextStep`, `stateLabel`
- Hardcoded: button labels `先不管`, `看一下`; tone and grouping.

## CapturePanel

- Source: `src/prototype/index.html`
- Category: basic
- Description: Thought capture textarea, voice control, status text, error message, and primary organize button.
- Extractable props: `placeholder`, `title`
- Hardcoded: button label `帮我捋一捋`, low-pressure copy style.

## ItemCard

- Source: `src/prototype/app.js`
- Category: basic
- Description: Dynamic item card for Active, Parking, and Done lists.
- Extractable props: `status`, `priorityLabel`, `title`, `reason`, `steps`
- Hardcoded: status-specific controls and card structure.

