# AI PM Session 02: Practice Worksheet

## Session Goal

Learn how to think like an AI Product Manager by writing one evaluation case before changing the system.

The core habit:

```text
Do not ask "what can the AI output?"
Ask "what should the product output?"
```

## The Five-Step Exercise

### Step 1. Write a real input

Use messy, natural language. Do not make it too clean.

Example:

```text
我下周要出门，身份证不知道放哪了，行李箱也还没收，顺便想把阳台衣服拿进来。
```

### Step 2. Write the ideal split first

Before running the product, decide what a good result should be.

Expected titles:

- 找身份证
- 收拾行李箱
- 收阳台衣服

This is the most important AI PM move. You are defining product quality before looking at system behavior.

### Step 3. Explain why those titles are good

Good reasoning:

- `找身份证`: "身份证不知道放哪了" is not just a fact; it implies a finding task.
- `收拾行李箱`: "行李箱还没收" is a travel preparation task.
- `收阳台衣服`: "顺便想把阳台衣服拿进来" is a small home task.

Not saved as task:

- `我下周要出门`: this is useful context, but not the task itself.

### Step 4. Predict likely failure tags

Before running the system, predict what might go wrong.

Possible failure tags:

- `context_as_task`: saves "下周要出门" as a task.
- `raw_title`: keeps "身份证不知道放哪了" instead of "找身份证".
- `lost_action`: misses "阳台衣服拿进来".

### Step 5. Choose the optimization lever

If the current system fails, choose the smallest useful fix.

Decision table for this example:

| Failure | Fix |
| --- | --- |
| misses "身份证不知道放哪了" | add rule/example for lost object -> find object |
| keeps raw title | title normalization |
| saves "下周要出门" | context filtering |
| handles this but fails many travel cases | add more golden-set travel samples |

## Worked Result

When we ran the example before improving it, the local organizer returned:

```text
我下周要出门
把阳台衣服拿进来
```

Failure tags:

- `context_as_task`: "我下周要出门" was saved as a task, but it is only travel context.
- `lost_action`: "身份证不知道放哪了" should become `找身份证`.
- `lost_action`: "行李箱也还没收" should become `收拾行李箱`.
- `raw_title`: "把阳台衣服拿进来" should become `收阳台衣服`.

Smallest useful fix:

- add local semantic rules for common travel preparation phrases.
- keep "出门" as context when it only describes the situation.
- normalize lost-object and packing phrases into action titles.

Verified result:

```text
找身份证
收拾行李箱
收阳台衣服
```

## Your Turn

Fill this in:

```text
Raw input:

Expected titles:
-
-
-

Why these titles:

Likely failure tags:

Best first optimization lever:
```

## PM Reminder

In AI products, "better" must become observable.

Observable means:

- we have input samples.
- we have expected outputs.
- we have failure tags.
- we know which lever to try first.
- we can verify whether the product improved.
