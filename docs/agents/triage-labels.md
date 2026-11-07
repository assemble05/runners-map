# Triage labels

| Label | Meaning |
| --- | --- |
| `needs-triage` | A maintainer needs to evaluate this issue. |
| `needs-info` | Waiting on the reporter or the owner for more information. |
| `ready-for-agent` | Fully specified, ready for an unattended agent. |
| `ready-for-human` | Needs a person: a decision, taste, or a drawing. |
| `wontfix` | Will not be actioned. |
| `task`, `bug`, `enhancement` | Type labels (`issue-tracker.md`). |
| `area:image`, `area:graph`, `area:rules`, `area:template`, `area:harness` | Which step of the pipeline the issue touches. |

A triaged issue has exactly one of `ready-for-agent`, `ready-for-human`, `needs-info`, `wontfix`, plus one
`area:` label. `needs-triage` is removed when that happens.
