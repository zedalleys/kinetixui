# Content and campaigns

Drafts, campaign sequences and production briefs. **Nothing here is published, and nothing here is
strategy** — an old draft is a record of what we were going to say, not a statement of what we now believe.
Canonical strategy is [`../STRATEGY.md`](../STRATEGY.md) and [`../MESSAGING.md`](../MESSAGING.md).

This directory is the campaign home. A separate `campaigns/` tree was considered during the Phase 1
reconciliation and rejected: the per-piece `drafts/<id>/` shape already holds sequence, sources, measurement
and verification together, and splitting it would break the relative paths inside each draft and its
verification scripts for no navigational gain.

## Campaign register

| ID | Piece | Status | Notes |
| --- | --- | --- | --- |
| **a01** | "Your cross-platform design system may be lying about parity" — article, X thread, LinkedIn, dev.to, plus sources, measurement, visual brief, checklist | **READY** | Argument holds and is still the flagship pillar-A piece. Version facts re-derived 2026-09-29; `verify-package.mjs` and `verify-evidence.mjs` both pass (48/48 claims) |
| **a02** | Second sequence piece | **READY** | Version facts re-derived 2026-09-29; `verify-package.mjs` passes |
| `campaign-sequence-a01-a02.md` | Operator sequence for a01 → a02 | **READY** | Unchanged; neither piece is scheduled |
| `visual-production-a01-a02.md` | Visual production brief | **NEEDS UPDATE** | Brief is finalised and no asset is built. One line names `@kinetixui/angular 0.24.0` as current state — correct today, but it is a version in an asset brief and should be re-derived at production time |
| `source-event-template.md` | Template for turning a development event into content | **READY** | Not a campaign; the reusable shape |
| `backlog.json` | Machine-readable article/post backlog | **NEEDS UPDATE** | Predates `@kinetixui/iot` and the Phase 1 pillar set (pillar E is new, and the registry-defect story is the strongest pillar-G asset available). Re-map to [`../CONTENT-PILLARS.md`](../CONTENT-PILLARS.md) before the next planning pass |

**READY** means the draft's own checks pass and its claims are consistent with the product today — not that
it is scheduled or approved to publish. Publication is a human decision governed by
[`../launches.md`](../launches.md).

**NEEDS UPDATE** means a specific, named gap. No draft is marked stale in the abstract.

**ARCHIVED** would mean superseded and kept for the record. Nothing is archived yet — both campaigns'
arguments are still current, which is why the Phase 1 reconciliation updated their facts rather than
retiring them.

## Before publishing anything here

1. Re-run the draft's `verify-package.mjs` and `verify-evidence.mjs`. They read live npm and the generated
   manifests, and they exist because two drafts once carried a wrong npm row for weeks while every other
   number in them was correct.
2. Re-run `pnpm marketing:stats` and re-derive every ⏱ figure. Never copy a number from a previous draft.
3. Check the claim status in [`../CLAIMS.md`](../CLAIMS.md) for anything the piece promises — in particular,
   activation language is **PENDING LIVE VERIFICATION**.
4. Work the draft's own `publish-checklist.md`. Every step is a human confirming a claim still holds.

## Why the verification scripts live beside the drafts

Each draft carries its own checks rather than relying on a central one, because the facts a piece depends on
are specific to that piece. The scripts derive from the repository — `release/publish-packages.json`,
`components.manifest.json`, the generated parity data — and never from a list typed into the script. That
last point was learned twice: once when the registry generator's hand-written package list went stale, and
again in this directory, when both `verify-package.mjs` files hard-coded the set of publishable packages and
flagged `@kinetixui/iot`'s real version as a version no package has.
