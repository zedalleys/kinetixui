# KinetixUI marketing

A working system, not a brochure. Everything here exists to be *used* weekly —
if a file is never opened twice, it should not be in this directory.

## The one rule

**Marketing claims must be traceable to repository truth.**

KinetixUI's differentiator is that it proves what it claims. That only works if
the marketing does the same. Before writing any number or platform claim, read
it from the source:

| Claim | Source of truth |
| --- | --- |
| Component count, per-platform coverage | `platform-parity.json` (generated from `components.manifest.json`) |
| Blocks and their platforms | `block-parity.json` |
| Platform maturity (stable / preview) | `components.manifest.json` → `platformDefinitions` |
| Published version | `packages/ui/package.json` |
| What is actually installable | `npm view <pkg> version` — `@kinetixui/angular` is **not** published |

`apps/web/src/lib/marketing-claims.test.ts` fails CI if the website or README
re-introduces a stale platform list, a blanket parity claim, a transpilation
implication, or an install command for an unpublished package.

## Files

| File | Use it when |
| --- | --- |
| `positioning.md` | Writing anything that explains what KinetixUI *is* |
| `personas.md` | Choosing who a piece is for, and what they already believe |
| `messaging.md` | Writing a headline, a post, a page, a release note |
| `content-pillars.md` | Deciding what to write about |
| `content-calendar.md` | Planning the next 30 days |
| `campaigns.md` | Running a themed push across channels |
| `seo.md` | Topic clusters and landing-page architecture |
| `community.md` | GitHub, Reddit, HN, Discussions |
| `launches.md` | Staged launch criteria and Product Hunt prep |
| `experiments.md` | Growth experiment backlog |
| `weekly-review.md` / `monthly-review.md` | The review ritual |
| `content/backlog.json` | Machine-readable article/post backlog |
| `research/` | Captured pain points from the wild, dated |

## What this is not

No email provider, no CRM, no ad accounts, no auto-posting. Drafts are written
here and published by a human. `scripts/release-to-content.mjs` turns a release
into draft inputs; it does not post anything anywhere.
