# MVP First-Screen Layout Progress

Date: 2026-07-07

## Latest Localhost UI Progress

The current reviewed direction is in the localhost-only reference prototype:

- `src/prototype/ui-reference-prototype.html`
- `src/prototype/ui-reference-prototype.css`
- preview URL while the static server is running: `http://127.0.0.1:18787/ui-reference-prototype.html`

This exploration should stay as a browser-viewable prototype. Do not create a Figma file for this direction unless explicitly requested again.

## Current UI Decision

The strongest first-screen layout is now:

1. Current recommendation module at the top.
2. Bottom capture area docked lower on the phone screen.
3. A small reassurance line between them: "其他想法都还在".

The current recommendation module should be one visual unit. It contains:

- label: "也许可以先看这个".
- priority chip such as "优先级 1".
- recommended item title.
- small next step under "可以小到这一步".
- actions: "先不管" and "看一下".

The actions belong to the current recommendation, not to the bottom input area:

- "看一下" enters the current item.
- "先不管" leaves the item saved and shows the next recommendation by priority.

## Current State Flow

The static UI reference now shows three states:

1. Main organized home: priority 1 recommendation, small next step, action buttons, reassurance, and bottom "又想到什么 / 继续放在这里" capture.
2. After "先不管": priority 2 recommendation appears, and the bottom capture stays docked to the bottom.
3. After "看一下": focus state shows the selected item and a short list of small steps.

## Copy And Density Notes

Keep:

- "也许可以先看这个"
- "优先级 1" / "优先级 2"
- "可以小到这一步"
- "其他想法都还在"
- "先不管"
- "看一下"
- "帮我捋一捋"

Reduce explanatory helper copy on the product screen. The UI should not explain itself too much. Avoid repeating reassurance copy in multiple places on the same screen.

## Current Layout Risk

The recommendation, next step, and action buttons should not be split into separate unrelated cards. If separated visually, users may misread "先不管 / 看一下" as bottom-input actions. They need to stay inside the current recommendation module.

The bottom capture area should stay docked or visually anchored near the bottom of the phone screen. If it floats in the middle, the screen feels unfinished and less mobile-native.

## Current Direction

The first screen should not be only a quick capture surface. For ADHD and attention-scattered users, the screen also needs to help turn many loose thoughts into one current thing to look at or move forward.

The direction is converging on a vertical, iPhone-proportioned layout:

1. Thought dump first: the user can write messy thoughts without sorting them.
2. Current focus second: MindFlow surfaces one gentle recommendation under "也许可以先看这个".
3. Small next step third: the recommendation includes one concrete, low-pressure next step.
4. Calm fallback: other ideas remain saved without exposing a full first-screen parking area.

## Preferred Layout Candidate

Candidate A, "上下版：倾倒 + 当前焦点", is the current strongest direction.

The screen structure is:

- top: product identity and a restrained status label.
- headline: "先倒出来 / 再只看一件".
- input area: messy thought dump.
- focus card: one suggested item and a short reason.
- next-step strip: one small action such as "打开通讯录，找到诊所电话".
- bottom actions: "先不管" and "看一下", with "其他想法都还在" as reassurance.

This keeps the capture-first feeling from the earlier A direction while adding enough execution support to avoid becoming only a notes box.

## Secondary Candidate

Candidate B, "短时推进版", is promising as a post-selection state after the user taps "看一下".

It frames the next state as a short, contained execution session:

- "现在这 10 分钟".
- one current item.
- two or three small steps.
- a place to put new thoughts without interrupting the current item.

This may be useful after the first screen, but it may be too mode-like as the default entry screen.

## Candidate To Treat Carefully

Candidate C, "融合版：记录、焦点、暂存都露出", explains the system clearly but is heavier.

Risk:

- it brings parked or saved items back onto the first screen.
- it may feel closer to a task dashboard.
- it increases visible decisions before the MVP validates the lighter flow.

## Confirmed Constraints

- Keep the tone restrained, warm, and natural.
- Keep the first screen low-pressure.
- Do not expose a full parking area on the first screen.
- Do not turn the first screen into a traditional task dashboard.
- Use iPhone-like vertical proportions for visual comparison.
- Do not create or output a Figma file for this exploration.

## Current Visual Reference

The current browser companion preview uses iPhone-like `390 x 844` proportions.

Local preview URL while the companion server is running:

- `http://localhost:62248/`

Local ignored companion file:

- `.superpowers/brainstorm/3115-1783346980/content/vertical-focus-layouts.html`

The `.superpowers/` directory is ignored and should be treated as temporary visual exploration material, not source product code.

## Next Step

If Candidate A is accepted, update the MVP prototype spec and then implement the first screen as:

- initial vertical thought dump state.
- organized state showing one focus recommendation.
- "看一下" state that can transition toward the short execution-session idea from Candidate B.
- "先不管" state that reassures the user the item is saved without showing a full parking list.
