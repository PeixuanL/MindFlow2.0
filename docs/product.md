# Product Notes

## Product Goal

MindFlow helps ADHD and attention-scattered personal users quickly unload mixed thoughts and tasks, then uses AI to gently organize them into clear, actionable next steps.

The first version is not designed to push users to finish more tasks. Its priority is to reduce forgetting anxiety, lower the difficulty of starting, and prevent captured ideas from sinking forever after they are recorded.

## Target Users

- ADHD users, or users who identify as easily distracted.
- People whose minds often hold many scattered thoughts at once.
- People who feel blocked by large, vague tasks.
- People who feel pressure, guilt, or resistance when using traditional todo tools.

## Core Positioning

MindFlow is a low-pressure thought capture and gentle action product.

Users are responsible for pouring out what is in their head. AI is responsible for separating, interpreting, and lightly prioritizing those inputs. The app should then show one or a few things that are suitable to look at or start now.

## Core Scenarios

### Thought Dump

The user opens MindFlow and enters a pile of mixed thoughts without needing to format, classify, prioritize, or schedule them first.

### AI Sorting

MindFlow breaks the input into individual items and infers useful task signals, such as:

- whether the item contains a time clue.
- whether the item is urgent.
- whether the item is important.
- whether the item is too large and needs breakdown.
- whether the item can become a low-energy first step.
- whether the item is suitable to look at now.

### Gentle Now

When the user opens the app, MindFlow surfaces a small recommendation area such as "现在可以开始的一步".

This area should act as a gentle entry point, not a command center. It should help users avoid losing captured ideas while still avoiding pressure.

### Task Breakdown

When a task is large or vague, MindFlow can suggest smaller steps. The user can accept, edit, ignore, or keep the original wording.

### Parking

Ideas that are not suitable for now should be safely kept out of the main view. Parking protects the user's current attention without making stored ideas feel abandoned.

## First Version Reminder Strategy

The MVP should start with app-open recommendations: when the user opens MindFlow, the app recommends what may be worth looking at or starting now.

Active reminders are a later optional capability. If the first validation version is a WeChat Mini Program, active reminders can be skipped at first to reduce pressure and implementation complexity.

If reminders are added later, they must be optional, easy to turn off, and written in gentle language.

## Product Principles

- Capture first: users should be able to record messy thoughts before doing any organizing.
- Low pressure: avoid guilt, punishment, comparison, and productivity-score language.
- AI assists, user decides: AI can infer and suggest, but user edits and choices override AI output.
- Explainable recommendations: when AI recommends an item, the user should be able to understand why it appeared.
- Preserve raw input: even if AI parsing or prioritization is wrong, the user's original input should not be lost.
- Fewer visible decisions: do not expose complex priority systems when a simple recommendation is enough.

## Product Boundaries

### In Scope

- Fast capture of messy thoughts and tasks.
- AI splitting one messy input into individual items.
- AI inferring time, urgency, importance, task size, and startability.
- Gentle recommendation of a current next step when the app is opened.
- Breakdown of large tasks into smaller steps.
- Parking items that are not suitable for now.
- Letting users edit, accept, ignore, or override AI suggestions.

### Out Of Scope

- Complex project management.
- Team collaboration.
- Public ranking, streaks, completion-rate pressure, or productivity scoring.
- Strong reminder pressure or guilt-based notifications.
- Exposing a full four-quadrant matrix as the main user interface.
- Complex tag systems or multi-level classification.
- Treating unfinished tasks as user failure.

## Open Questions

- Whether the first validation build is a WeChat Mini Program.
- Whether optional light reminders should be added after the first MVP validation.
- How much explanation the AI recommendation should show in the first version.
