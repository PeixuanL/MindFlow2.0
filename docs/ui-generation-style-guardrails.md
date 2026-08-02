# MindFlow UI Generation Style Guardrails

Date: 2026-07-23

This document is the guardrail prompt and working method for future Codex sessions that generate or modify MindFlow UI. Its job is to keep future UI work aligned with the approved warm glass iOS/macOS direction instead of drifting back into generic productivity dashboards.

## Paste This Into The Next Session

```text
You are working on MindFlow UI. Before generating, editing, or reviewing any UI, you must align with the approved UI direction.

Primary visual reference:
- /Users/jane/Desktop/MindFlow/docs/ux/mindflow-ui-direction-review.html

Frontend handoff reference:
- /Users/jane/Desktop/MindFlow/docs/ux/HANDOFF_UI_DIRECTION_FRONTEND.md

Current project context:
- /Users/jane/Desktop/AI/MindFlow/docs/mvp-first-screen-layout-progress.md
- /Users/jane/Desktop/AI/MindFlow/src/prototype/index.html
- /Users/jane/Desktop/AI/MindFlow/src/prototype/styles.css

Style source of truth:
- Warm cream/peach background.
- Soft glass panels with translucent white borders, blur, and warm shadows.
- Coral as the main emphasis color.
- Amber only for secondary glow or P2/light emphasis.
- Text is warm dark brown, not black, green, or slate.
- iPhone-like vertical proportions, especially around 393 x 852 pt.
- Touch targets must respect about 44px minimum height on mobile.
- Desktop density must be more compact than touch UI.

Product interaction source of truth:
- First screen is low-pressure thought dumping plus one gentle current recommendation.
- Do not expose a full task dashboard on the first screen.
- Do not expose a full parking/backlog area on the first screen.
- Keep "也许可以先看这个", "可以小到这一步", "其他想法都还在", "先不管", "看一下", and "帮我捋一捋" as core copy unless the user explicitly asks for copy changes.
- "先不管" and "看一下" belong inside the current recommendation module, not the bottom capture input.

Implementation rule:
- Do not invent a new visual language.
- First extract or reuse tokens from the reference HTML.
- Then map existing components to those tokens.
- Then verify with screenshots or a strict visual checklist.

Every UI change must answer:
1. Which reference token or component did this use?
2. Which existing green/paper/dashboard styling did this remove or avoid?
3. Does the first screen still feel like calm capture plus one next thing, rather than a task manager?
4. Did you verify at mobile width and desktop/container width?

If a requested UI idea conflicts with the approved direction, pause and explain the conflict before implementing.
```

## Non-Negotiable Visual Direction

Use this direction:

- Background: warm cream and peach gradients with subtle radial warmth.
- Surfaces: translucent glass panels, white glass borders, soft warm shadows, gentle blur.
- Accent: coral for focus, selected states, and primary emphasis.
- Secondary accent: amber glow for lower-priority or light emphasis.
- Typography: SF Pro / PingFang / system sans; restrained weight; calm hierarchy.
- Shape: medium-large rounded panels, usually 14px to 20px in the reference direction.
- Motion/feel: quiet, soft, non-urgent.

Avoid this drift:

- Green productivity app styling as the main theme.
- White/gray SaaS dashboard styling.
- Strong black text on stark white cards.
- Blue/purple gradient app-shell aesthetics.
- Red warning states for non-critical reminders.
- Many unrelated cards on the first screen.
- Traditional task list, inbox, kanban, or backlog-first layouts.

## Token Lock

Future CSS should converge on these token names and values from the approved reference:

```css
:root {
  --cream: #fff8f3;
  --peach-50: #fff5ed;
  --coral: #e88b6a;
  --coral-soft: rgba(232, 139, 106, 0.22);
  --amber-glow: #f4c975;
  --text: #3a2f2c;
  --text-muted: #7d6e68;
  --stroke-glass: rgba(255, 255, 255, 0.55);
  --shadow-soft: 0 18px 48px rgba(212, 140, 100, 0.18);
  --radius-lg: 20px;
  --radius-md: 14px;
  --blur: 18px;
  --font: ui-sans-serif, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif;
  --mini-fs-body: 16px;
  --mini-fs-secondary: 15px;
  --mini-fs-meta: 13px;
  --mini-fs-tab: 15px;
  --mini-tap-min: 44px;
}
```

When updating existing CSS, treat older tokens such as `--green`, `--green-dark`, `--paper`, `--mist`, and `--blue-soft` as legacy unless they are intentionally mapped into the approved warm glass system.

## Component Lock

Future UI should reuse these component ideas from the reference:

- `panel-glass`: translucent white panel, glass border, blur, warm soft shadow.
- `mini-tab`: pill tab with coral-soft active state.
- `reminder-card`: soft blue-to-peach reminder surface, not a gray warning panel.
- `parking-nudge`: subtle helper strip, same soft family as reminder card.
- `task-row`: light glass row, restrained text, optional chip.
- `task-block`: parent task card with inline subtasks.
- `capture-zone`: bottom-aligned capture area with safe-area padding.
- `pn-btn`: compact action buttons with a soft primary/ghost split.

Do not create a new card/button/input style unless the user explicitly asks for a new design direction.

## Layout Lock

Mobile:

- Use iPhone-like vertical proportions around 393 x 852.
- Width is constrained by horizontal space, not viewport height.
- Let tall content scroll vertically instead of shrinking the phone into a narrow strip.
- Respect safe-area top and bottom.
- Keep touch targets around 44px minimum.

Desktop/macOS:

- Use compact pointer density.
- Sidebar and drawer dimensions should follow the reference handoff principles.
- Menu bar popover should feel like a macOS utility surface, not a full app dashboard.

MVP first screen:

- One current recommendation module at the top or upper-middle.
- One small next-step surface inside the recommendation.
- Reassurance line: "其他想法都还在".
- Bottom capture anchored near the bottom.
- No visible full parking list on the first screen.

## Generation Workflow For Future Sessions

1. Read the approved reference HTML and handoff doc.
2. Read the current target UI files before editing.
3. Identify which existing UI elements map to approved components.
4. Replace visual styling through tokens first.
5. Keep structure changes narrow and product-driven.
6. Run the available tests.
7. If a local preview is available, inspect the UI at mobile and desktop/container widths.
8. Report any remaining visual risk explicitly.

## Visual Acceptance Checklist

Before calling UI work complete, verify:

- The page reads warm cream/peach at first glance.
- Main CTA and selected states are coral or coral-soft, not green.
- Cards use glass surface treatment.
- Borders are soft/translucent.
- Shadows are warm and diffuse, not cold gray.
- Text hierarchy is calm and not oversized inside compact panels.
- The first screen does not look like a normal todo-list app.
- Action buttons are visually connected to the module they affect.
- Bottom capture is anchored and does not float awkwardly in the middle.
- Long Chinese text does not overflow buttons, chips, or cards.
- Mobile touch controls meet the approximate 44px minimum target.
- Desktop views are denser than mobile views.

## Suggested Codex Instruction For UI Tasks

Use this shorter instruction when starting any UI-specific task:

```text
For this UI task, enforce docs/ui-generation-style-guardrails.md. Treat /Users/jane/Desktop/MindFlow/docs/ux/mindflow-ui-direction-review.html as the visual source of truth. Do not introduce a new visual language. Migrate or generate UI through the approved warm glass tokens, component patterns, iPhone-like proportions, and MVP first-screen layout constraints. After editing, verify against the visual acceptance checklist and state any drift risk.
```

