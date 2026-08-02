# MindFlow Design System

## Product Context

MindFlow is a low-pressure thought organizer for users who feel mentally overloaded. The core job is to let people dump messy thoughts, then surface one gentle next thing without making the rest feel lost.

## Tone

- Warm, restrained, close, and calm.
- Avoid guilt, urgency, productivity scoring, and motivational pressure.
- Prefer short Chinese copy that feels like help rather than instruction.

## Responsive Layout Principle

- Desktop web: a real responsive workspace, not a phone frame enlarged or centered. Use a wide canvas with clear regions for capture, current focus, saved items, and detail without turning it into a dense productivity dashboard.
- Mobile web: preserve the native single-column rhythm around `390 x 844`, with the current recommendation and capture panel stacked naturally.
- Tablet: use a softened two-column layout where capture and focus remain primary.

## Visual Tokens

- Font: `ui-sans-serif`, `SF Pro Text`, `PingFang SC`, `Hiragino Sans GB`, `system-ui`, `sans-serif`.
- Body: 14-16px; metadata: 12-13px; compact headings: 24-31px; avoid oversized hero type in app surfaces.
- Colors:
  - Page base: `#fff8f3`, `#fff5ed`, soft blush.
  - Primary: coral `#e88b6a`.
  - Accent: warm amber `#f4c975`.
  - Text: `#3a2f2c`.
  - Muted text: `#7d6e68`.
  - Surfaces: warm translucent whites, `rgba(255, 253, 248, 0.74)`.
  - Lines: soft white/warm lines, not heavy gray.
- Radius:
  - App controls and panels: 14-20px.
  - Avoid excessive pill/card decoration outside small chips and nav controls.
- Shadows:
  - Soft warm shadows only when they support hierarchy.
  - Avoid stacking many elevated cards.

## Component Rules

- Recommendation and its actions stay inside one visual unit so `先不管` and `看一下` are read as actions for the current item.
- Capture should remain visually anchored and easy to reach.
- Desktop can expose lists and detail previews, but the home entry should still guide the user toward one current thing.
- Items lists should use grouped rows or restrained cards; avoid a wall of separate heavy cards.
- All controls need stable dimensions and readable text at desktop and mobile widths.

## Required Functional Surface

Preserve these functions in any redesign:

- Login/name entry.
- Home capture input.
- Voice input affordance.
- AI organize action.
- Current recommendation, next step, reason, and two actions.
- Current focus state with small steps.
- Completion state.
- Items view with Active, Parking, Done tabs.
- Manual add.
- Item card actions: detail, park/recover, complete, delete, undo.
- Detail editor for title, priority, status, reasons, steps, save/back.

