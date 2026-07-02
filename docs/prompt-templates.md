# Prompt Templates

## Lite Slice

```text
Goal: [small feature/change].
User scenario: [who uses it and when].
This task does:
- [in scope]
This task does not:
- [out of scope]
Completion criteria:
1. [observable result]
2. [verification method]

Use the Lite Vibe Coding flow: read relevant files, propose a short plan, wait for confirmation, then implement only this smallest useful slice. List out-of-scope ideas as follow-ups.
```

## Bug Fix

```text
Issue: [what happens].
Expected: [what should happen].
Actual: [what happens now].
Reproduction: [steps].

Please locate the cause, propose the smallest fix, implement it, and verify the original symptom.
```
