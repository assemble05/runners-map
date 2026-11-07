# Issue tracker: GitHub

Issues live in the repository of `git remote get-url origin`. Use the `gh` CLI: `gh issue view <n> --comments`,
`gh issue list`, `gh issue comment`, `gh issue edit --add-label`. If `gh issue create` fails with "GraphQL is not
available", use the REST API: `gh api repos/<owner>/<repo>/issues -f title=... -f body=...`.

## Issue types

| Type | Label | Use it for |
| --- | --- | --- |
| Task | `task` | A piece of work written as a spec. The default. One task is one pull request. |
| Bug | `bug` | A map that is accepted and should not be, or rejected and should not be. Attach the map (PNG or rows). |
| Idea | `enhancement` | Something to decide before it becomes a task. Triage rewrites it as a task or closes it. |

A new issue gets `needs-triage`. It becomes `ready-for-agent` only when the definition of ready holds.

## A task is a spec

Headings, in this order:

```
### Context
### Scope            (numbered checklist S1, S2…, in order of work)
### Out of scope     (what belongs to another issue, linked)
### Acceptance criteria   (AC1…, WHEN … THEN …, edge cases marked [edge])
### Tests            (what must be proven, by AC; never the kind of test)
### Where to look    (files, ADRs, GLOSSARY terms, issues)
### Blocked by       (#12, #15 or none)
### Needs input      (what only a person can give)
```

- English, like the code. A map in an issue is rows in a fenced block, or an attached PNG.
- A rule change names the finding code, the ADR it reads and the fixture that will break.
- Every scope item can be checked by someone else. "Improve" is not an item.

## Definition of ready

- Every heading above with real content; at least one `WHEN … THEN …`.
- `Blocked by` lists only open issues that really block it.
- `Needs input` is empty; otherwise `needs-info` or `ready-for-human`.
- It fits in one pull request.

## Working an issue

1. `gh issue view <n> --comments`. Read the issue, the ADRs it links, `GLOSSARY.md` and `AGENTS.md`.
2. Check `Blocked by`. An open blocker: stop and say so.
3. Branch from `main`: `<type>/<n>-slug` (`feat`, `fix`, `chore`).
4. Do the scope in order; tick the checklist as items land.
5. Commit once after a clean `npm run check`. Pull request with `Closes #<n>` first.
6. Spec wrong or incomplete: comment on the issue with what you found and add `needs-info`. Do not guess a
   decision that is the owner's.
7. Close nothing by hand; the merge closes the issue.
