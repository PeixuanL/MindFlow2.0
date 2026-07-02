# MVP Web Prototype Spec

## Goal

Build a first runnable Web prototype for MindFlow that validates the core feeling: users can put scattered thoughts somewhere without organizing them first, and the app can surface one low-pressure thing to look at next.

## User Scenario

A user opens MindFlow when their head feels full. They type a messy paragraph of thoughts, press "帮我捋一捋", and see one suggested item under "也许可以先看这个". They can choose "看一下" or "先不管". Other captured ideas are reassured with "其他想法都还在" without showing a full parking area on the first screen.

## In Scope

- Static Web prototype that can run locally in a browser.
- One mobile-first screen for thought capture.
- One post-organizing state showing a single suggested item.
- Mock organizing logic using local sample data or deterministic rules.
- Copy direction from `docs/mvp-copy-direction.md`.
- No first-screen parking section; only a lightweight "其他想法都还在" reassurance.
- Basic interaction states:
  - empty input.
  - user-entered messy thoughts.
  - organized result.
  - "看一下" selected.
  - "先不管" selected.

## Out Of Scope

- Real AI API integration.
- User accounts, cloud sync, database persistence, or login.
- Active reminders or notifications.
- Full task management views.
- Complex tags, priority matrices, streaks, productivity scores, or team collaboration.
- WeChat Mini Program implementation.

## Expected Behavior

1. The initial screen shows:
   - product name: "MindFlow".
   - headline: "先不用想清楚".
   - supporting copy: "想到什么都可以先放在这里。".
   - a large text input with example scattered thoughts.
   - primary button: "帮我捋一捋".
   - reassurance text: "其他想法都还在".
2. If the user presses the primary button with no input, the prototype should show a gentle inline prompt asking them to write something first.
3. If the user enters text and presses the primary button, the prototype should show:
   - label: "也许可以先看这个".
   - one recommended item.
   - short explanation: "它比较清楚，不需要一次处理太多。".
   - actions: "看一下" and "先不管".
   - secondary input area for more thoughts.
4. Pressing "看一下" should mark the suggestion as the current focus without adding pressure language.
5. Pressing "先不管" should keep the item saved and show a calm message that the user can come back later.

## Copy Principles

- Sound restrained, warm, and close.
- Do not use guilt, urgency, ranking, or productivity-score language.
- Prefer natural expressions that feel like help, not commands.
- Keep "帮我捋一捋" for the first prototype because it feels more intimate and memorable.
- Avoid dense use of "轻轻", "好好", or "慢慢"; one warm phrase is enough.

## Completion Criteria

- The prototype can be opened locally in a browser.
- A user can complete the capture-to-suggestion flow without reading instructions.
- The first screen does not expose the parking area.
- The approved copy appears in the UI.
- A simple automated test covers the mock organizing behavior.
- A manual check confirms desktop and mobile widths do not have overlapping text.

## Verification Method

- Run the JavaScript unit test for the organizing logic.
- Open the prototype locally and manually test:
  - empty input prompt.
  - messy input organizing flow.
  - "看一下" action.
  - "先不管" action.
  - mobile-sized viewport.
