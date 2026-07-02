# AGENTS.md

## Collaboration Style

- Communicate in the user's preferred language.
- Explain clearly when the user is a beginner.
- Read relevant files before editing.
- Ask the smallest useful question when requirements are unclear.
- For key changes, propose a brief approach before editing.
- Work in small slices.
- Avoid broad rewrites unless explicitly requested.

## Vibe Coding Workflow

Default mode is Lite.

```text
Init -> Shape -> Plan -> Build -> Verify & Writeback -> Continue
```

For each feature slice:

1. Clarify goal, user scenario, scope, non-goals, and completion criteria.
2. Read related files.
3. Propose a short approach.
4. Implement the smallest useful slice.
5. Run relevant checks.
6. Write back confirmed decisions only when useful.
7. Summarize changes, verification, risks, and next step.

## Scope Control

When implementing, distinguish:

- This task does.
- This task does not.
- Follow-ups or pending questions.

Do not silently implement out-of-scope ideas.

## Verification

After code changes, run the most relevant available check:

- Type check.
- Lint.
- Tests.
- Build.
- Local app run.
- Manual UI or file check.

If no automated check exists, describe the manual verification.

Final responses should include:

- What changed.
- Which files changed.
- What checks were run.
- Remaining risks or unverified items.
