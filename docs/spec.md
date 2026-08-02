# MindFlow Product Spec

## 1. Product Definition

MindFlow is a low-pressure thought-to-action product for attention-scattered users. It helps users quickly dump scattered thoughts, uses AI to separate and structure them, saves them into a manageable item system, and gently surfaces one actionable thing at a time.

The product promise:

```text
Messy thoughts go in.
Nothing gets lost.
Only one thing needs attention now.
Everything else can be found, edited, parked, or completed later.
```

## 2. Product Goal

The first real demo should prove the full product loop, not only a single-page capture interaction.

Core loop:

```text
Quick thought dump
-> AI organizing
-> automatic save
-> active attention window
-> one current recommendation
-> user acts, switches, parks, edits, or completes
-> parking and archive preserve the rest
-> later app opens can gently resume the loop
```

The product is usable when:

- Users can capture messy thoughts without organizing first.
- AI splits the input into concrete items and small next steps.
- Items are saved in a backend, not only in browser memory.
- Users can log in and see their own saved items.
- Users can view and manage active, parked, and done items.
- Homepage recommendation comes from saved items.
- Parking prevents items from disappearing without forcing them into the main view.
- Completion creates closure without pushing the next task too aggressively.

The product is not complete if:

- Users can only type and see one temporary suggestion.
- "Other thoughts are still here" is only copy, not backed by saved data.
- Users cannot view, edit, delete, park, restore, or complete items.
- Active and parking are just static lists with no attention-management purpose.

## 3. Target Users

Primary users:

- Attention-scattered users.
- ADHD users or people who identify as easily distracted.
- People who keep many loose thoughts in their head at once.
- People blocked by large, vague, emotionally loaded tasks.
- People who resist traditional todo tools because they feel pressuring.

Typical user state:

- They know their head is full.
- They do not know how to sort the thoughts yet.
- They may not know which item is most important.
- They want to record before deciding.
- They want saved ideas to be recoverable without seeing a giant task wall.

Success feeling:

- "I can dump this first."
- "It is saved."
- "I only need to look at one thing."
- "The rest is not gone."
- "I can change what the AI made."

## 4. Core Product Principles

- Capture first: users do not need to classify, prioritize, or schedule before writing.
- AI assists, user decides: AI may split, suggest, and explain; user edits override AI.
- One current focus: the homepage should not become a full todo wall.
- Attention window, not task pile: active means currently faceable, not all unfinished work.
- Parking is safe storage: parking is not deletion, failure, or low value.
- Gentle return: parked items can resurface when relevant, but the user decides whether to bring them back.
- Low pressure: no guilt, streaks, productivity scores, or urgent command language.

## 5. Core Scenarios

### Scenario 1: Quick Thought Dump

- User motivation: get messy thoughts out of their head quickly.
- Entry: homepage bottom capture input.
- Task: type one sentence, paragraph, or messy list and submit.
- Expected result: input is preserved, AI organizing starts, and generated items are saved.
- Product requirement: this flow cannot depend on manual classification.

### Scenario 2: AI Organizes And Saves

- User motivation: avoid manually splitting vague, mixed thoughts.
- Entry: submit from homepage.
- Task: wait while AI generates structured items.
- Expected result: items are automatically saved, then a light prompt offers "go see".
- Product requirement: AI generation needs visible progress feedback.

Completion feedback:

```text
Already saved for you.
[Go see]
```

The prompt should disappear automatically after a few seconds if the user does not act.

### Scenario 3: Homepage Recommendation

- User motivation: know one thing that can be looked at now without facing everything.
- Entry: open homepage when saved items exist.
- Task: review one current recommendation.
- Expected result: one active item appears with priority, reason, and a tiny next step.
- Product requirement: input remains visible and easy to use at the bottom.

### Scenario 4: Manage Items

- User motivation: confirm saved thoughts are real and editable.
- Entry: "Go see" after AI save, or item page entry from homepage.
- Task: view active, parking, and done areas; edit item details if needed.
- Expected result: user can find, adjust, delete, park, restore, complete, and change priority.

### Scenario 5: Park And Resurface Later

- User motivation: keep items safe without seeing them now.
- Entry: item detail or item list action.
- Task: move item to parking, or respond when a parked item is gently resurfaced.
- Expected result: item is out of the main attention window but can later be restored.

### Scenario 6: Complete Without Pressure

- User motivation: close an item when it is truly done.
- Entry: item detail, active card, or focus state.
- Task: mark the whole item done.
- Expected result: item moves to done archive and user sees a light completion response.

Completion should not immediately push the next item.

Example:

```text
This one is done.
[See another] [Rest for now]
```

## 6. Main Flows

### Flow 1: Capture To Saved Items

- Start: user opens homepage.
- Path: enter messy thoughts -> submit -> AI loading -> AI splits items -> backend saves items -> toast appears.
- System feedback: loading copy, saved confirmation, optional "Go see" button.
- Data changes: create thought batch, create items, create steps, assign initial status and priority.
- Success end: items are saved and visible in the item page.
- Failure cases: AI timeout, invalid AI output, network failure.
- Recovery: keep raw input, use fallback organizer if possible, allow retry.
- Status: target flow for first real demo.
- Loop judgment: complete only when backend persistence and item visibility exist.

### Flow 2: Homepage Recommendation To Action

- Start: saved active items exist.
- Path: open homepage -> see one recommendation -> choose "Look" or "Switch".
- System feedback: show one title, priority, reason, and tiny next step.
- Data changes:
  - "Look" can mark item as current or open detail/focus.
  - "Switch" temporarily skips the item without parking it.
- Success end: user can face one item without seeing the whole pool.
- Failure cases: no active items; recommendation feels wrong.
- Recovery: show parking candidate if eligible, or show capture-only state.
- Status: P0.
- Loop judgment: homepage must recommend from saved backend items, not only a one-time AI result.

### Flow 3: Active And Parking Management

- Start: user has saved items in active or parking.
- Path: open item page -> inspect active or parking -> edit, park, restore, delete, complete, or change priority.
- System feedback: item status visibly changes; delete has undo toast.
- Data changes: update item status, priority, steps, text, parking reason, or done state.
- Success end: user understands where each item lives and can control it.
- Failure cases: active grows too large; parking never resurfaces; user cannot find item.
- Recovery: active display limit, parking candidate prompts, search/filter later if needed.
- Status: P0 for first real demo.
- Loop judgment: complete only if items are visible and editable.

### Flow 4: Parking Resurface

- Start: active has no good recommendation, or a parked item reaches its relevant time.
- Path: system selects one parked candidate -> homepage shows gentle prompt -> user chooses "Move to now" or "Keep parked".
- System feedback: candidate is framed as optional.
- Data changes:
  - "Move to now" changes status to active.
  - "Keep parked" leaves item in parking and may snooze it.
- Success end: parked items do not sink, but user remains in control.
- Failure cases: system moves too many items into active or interrupts too often.
- Recovery: only one candidate at a time; never auto-fill active in bulk.
- Status: P0/P1 boundary; simple version should exist in first real demo if parking exists.

## 7. Information Architecture

### Homepage

Purpose:

- The low-friction entry point.
- Shows one current recommendation when saved items exist.
- Keeps quick capture available at the bottom.

Main content:

- Current recommendation card.
- Gentle status or candidate prompt.
- Bottom thought-dump input.

Rules:

- If no saved items exist, do not show a recommendation.
- If active items exist, show one recommendation.
- If no active item is suitable but parking has an eligible candidate, show a light candidate prompt.
- Do not show a full task list on homepage.

### Item Page

Purpose:

- The visible place where saved thoughts live.
- The user's management surface.

Sections:

1. Active
   - Current attention window.
   - Shows item modules with title, priority, and 2-3 step preview.
   - Visually highlights only the top 3-5 items to avoid overload.

2. Parking
   - Safe storage.
   - Lightweight display: title, priority, and parking reason.
   - Does not show steps by default.

3. Done
   - Lightweight archive.
   - Should not dominate the page or create productivity pressure.

### Item Detail

Purpose:

- Edit one item with full control.

Editable fields:

- Title.
- Priority: high / medium / low.
- Status: active / parking / done.
- Small steps.
- Parking reason.

Actions:

- Save changes.
- Delete with undo.
- Complete item.
- Restore from parking.
- Move to parking.

### Authentication

First real demo should include backend persistence and user login.

Scope:

- Simple login is enough.
- No complex profile, team, organization, or social login required.
- Each user sees their own items.

## 8. Item Model

Each item should support:

- `id`
- `userId`
- `title`
- `status`: `active`, `parking`, `done`, `deleted`
- `priority`: `high`, `medium`, `low`
- `source`
- `steps`
- `reason`
- `parkingReason`
- `timeHint`
- `createdAt`
- `updatedAt`
- `completedAt`
- `deletedAt`
- `snoozedUntil`
- `lastSkippedAt`
- `aiMeta`

Notes:

- User priority overrides AI priority.
- Details page does not need to display the full original raw input.
- Data may keep source snippets for traceability.
- Completion is item-level, not step-level.

## 9. Active, Parking, And Done Rules

### Active

Definition:

```text
The user's current attention window.
```

Active does not mean all unfinished or all important items.

Rules:

- Active items are eligible for homepage recommendation.
- Active items may show small steps in the item page.
- Active display should be limited so it does not become a task wall.
- User can move active items to parking.
- User can change priority.

### Parking

Definition:

```text
Safe storage for items that should not take current attention.
```

Parking does not mean low value.

Rules:

- Parking items are not normally shown as homepage recommendations.
- Parking items can be restored manually.
- Parking items can become candidates when time or context changes.
- Parking display should be lighter than active display.
- Parking reason should be shown lightly.

### Done

Definition:

```text
Archive for completed items.
```

Rules:

- Completion is for the whole item.
- Done is visible but not visually dominant.
- No streaks, scores, or completion pressure.
- User may restore if needed.

## 10. Active / Parking Resurface Design

The product should not auto-fill active from parking just because active has fewer than a target number of items.

Bad rule:

```text
If active has fewer than 5 items, move parking items into active.
```

This creates pressure and makes active feel endless.

Preferred rule:

```text
Parking -> eligible candidate -> light prompt -> user decides -> active or still parked.
```

Candidate triggers:

- Active has no suitable recommendation.
- A parked item reaches its time hint.
- A parked item has high priority and is now more relevant.
- User manually raises priority.
- User opens parking and chooses restore.

Homepage candidate copy:

```text
There is one thing in Later that might be okay to look at now.
[Move to now] [Keep it there]
```

Behavior:

- Show at most one parking candidate at a time.
- Do not bulk move parking items.
- User decision is required before changing status to active.
- If user keeps it parked, avoid showing the same candidate again immediately.

## 11. Priority Rules

User-facing priority:

```text
High / Medium / Low
```

Recommendation should consider:

```text
User status
> user priority
> time relevance
> startability
> AI-estimated importance
> clarity
```

Product interpretation:

- High priority and startable items should be recommended first.
- Important but vague items should be broken down before being recommended.
- Low priority easy items can be used as gentle entry points, but should not permanently outrank important work.
- User edits always override AI ranking.

## 12. Key Actions

### Dump Thoughts

- Add messy text through homepage input.
- AI starts with visible loading feedback.
- Raw input is not lost if AI fails.

### AI Save

- AI output is automatically saved.
- User is not forced into a confirmation step.
- Toast appears with a "Go see" button.
- Toast disappears after a few seconds if ignored.

### Switch Item

- Homepage action for "not this one now".
- Keeps item active.
- Temporarily avoids immediately recommending it again.
- Better label can be "Switch" or "Change one" rather than "Park".

### Park Item

- Moves item out of the current attention window.
- Available from item card/menu or detail page.
- Requires no guilt copy.

### Restore Item

- Moves parking item back to active.
- Can happen from parking section or homepage candidate prompt.

### Complete Item

- Completes the whole item.
- Moves item to done.
- Shows light completion feedback.
- Does not automatically push the next item.

### Delete Item

- Soft delete with undo.
- Undo toast remains for about 5 seconds.

### Manual Add

- User can add an item manually without AI.
- Manual item still supports status, priority, and steps.

## 13. P0 Scope For First Real Demo

- User login.
- Backend persistence.
- Homepage with one recommendation and bottom thought dump input.
- AI organizing with loading state.
- Automatic save after AI organizing.
- Toast with "Go see" action.
- Item page with Active, Parking, and Done sections.
- Active item modules with step preview.
- Parking lightweight modules with parking reason.
- Done lightweight archive.
- Item detail editing.
- Manual add item.
- Change priority: high / medium / low.
- Change status: active / parking / done.
- Complete whole item.
- Delete with 5-second undo.
- Parking candidate prompt when active has no suitable item or parking item becomes time-relevant.

## 14. P1 Scope

- Search items.
- Filters by status and priority.
- Merge or split AI-generated items.
- Better duplicate detection.
- More nuanced time-based resurface rules.
- AI explanation for why an item is recommended.
- Prompt and eval iteration based on real cases.

## 15. P2 / After First Demo

Confirm after first demo:

- Cloud sync beyond simple logged-in backend.
- WeChat Mini Program.
- Active reminders.
- Calendar integration.
- Public portfolio case study page.
- Complex tags.
- Project hierarchy.
- More advanced recurring items.

## 16. Non-Goals For First Demo

- No team collaboration.
- No project-management dashboard.
- No four-quadrant matrix.
- No streaks, ranking, scores, or productivity pressure.
- No medical or ADHD treatment claims.
- No complex labels or multi-level taxonomy.
- No automatic bulk migration from parking to active.
- No step-level completion tracking in the first demo.

## 17. Completion Criteria

The first real demo is complete when a user can:

1. Sign in.
2. Dump messy thoughts on the homepage.
3. See AI loading feedback.
4. Have AI-generated items automatically saved.
5. Choose whether to inspect the saved items.
6. See active, parking, and done sections.
7. Edit an item title, priority, status, and steps.
8. Park and restore an item.
9. Complete a whole item.
10. Delete an item and undo within 5 seconds.
11. Return to homepage and see one recommendation from saved active items.
12. See parking items gently resurface only as optional candidates.

The product should feel like:

```text
It helps me remember and start,
without turning my whole mind into a task wall.
```
