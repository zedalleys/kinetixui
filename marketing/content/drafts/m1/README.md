---
id: m1
type: next content batch (Marketing Operations M1, 2026-10-17)
status: nothing in this batch is approved. Four assets are reused READY copy; two are new (one outline,
  one draft). Publication is a human decision, and each item below names what it waits on
---

# M1 — the next content batch

Six assets: two LinkedIn posts, two X posts, one article outline and one GitHub update. **Four are reused**
from the original 30-day campaign because their copy is finished, still accurate, and overdue. Two are new,
because the campaign had no GitHub asset and no article beyond the two already published.

Reused copy is **not duplicated here**. The final text stays in its original file, so there is one copy to
correct if a fact moves; this index says which section is final and what was re-checked.

Every UTM below is the asset's built `url` in [`../../register.json`](../../register.json). Copy it from
there, never retype it (`pnpm check:content` validates it against the runtime's campaign rule).

Status words are the M1 operating statuses (`pnpm marketing:inventory`): READY FOR REVIEW means the copy's
own checks pass, **not** that anyone approved it.

---

## 1. LI-001 · LinkedIn · READY FOR REVIEW (reused)

| | |
| --- | --- |
| Final copy | [`../a01/linkedin.md`](../a01/linkedin.md) **§A** (216 words), unchanged |
| Audience | P1, design-system engineers on more than one platform |
| Hook | "I wrote a script to check whether our design system's platform claims were true. They weren't." |
| Key message | A platform claim nothing can fail is decoration; the fix made our numbers worse and the docs true |
| CTA | The ART-001 dev.to article (post body), then the tracked coverage link as the first comment |
| Destination | `/docs/platforms` (first comment), dev.to article (body) |
| UTM | `utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=li_primary` |
| Visual | None required. The a01 visual brief exists but no asset was built; ship without rather than late |
| Evidence | All figures in the post are historical (91 → 90 and so on) and in past tense; `verify-evidence.mjs` 48/48 on 2026-10-17 |
| Waits on | Owner approval. Stop gate in [`../a01/publish-checklist.md`](../a01/publish-checklist.md) §4: open the tagged link once with `&kx_traffic=diagnostic` appended and confirm `kx_campaign` arrives |

Accuracy note: the post's own "Do not" list says "90/98 with 8 documented exceptions". That note is not
published copy; today's figure is 90 of 109 with 19 exceptions.

## 2. X-001 · X thread · READY FOR REVIEW (reused)

| | |
| --- | --- |
| Final copy | [`../a01/x-thread.md`](../a01/x-thread.md), unchanged |
| Audience | P1 |
| Hook | Same finding as LI-001, compressed for a thread |
| Key message | Same as LI-001: what would fail if this claim were false? |
| CTA | dev.to article in post 9; tracked coverage link as a reply under post 9 |
| Destination | `/docs/platforms` (reply) |
| UTM | `utm_source=x&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=x_thread` |
| Visual | None required |
| Evidence | Historical figures only; same verification as LI-001 |
| Waits on | Owner approval; LI-001 posted first (the a01 sequence says LinkedIn, then X the next day) |

## 3. LI-008 · LinkedIn · READY FOR REVIEW (reused)

| | |
| --- | --- |
| Final copy | [`../../linkedin.md`](../../linkedin.md) **§LI-008**, unchanged |
| Audience | P1 |
| Hook | "A green tick in an accessibility matrix is one of the least informative things in our industry." |
| Key message | A partial count is not a tick: publish fractions, including where coverage is thin or zero |
| CTA | "The evidence, by platform" |
| Destination | `/docs/platforms` |
| UTM | `utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_d_partial_evidence&utm_content=li_primary` |
| Visual | **VIS-006**, regenerated 2026-10-17 (it carried 98/64 figures; now 109/80 from the generator) |
| Evidence | Re-checked 2026-10-17 against `pnpm marketing:stats`: RTL evidence runs from 58 of 90 (Flutter, "most of the catalogue on one platform") to 1 of 90 (Compose, "a single component") to 0 of 90 (SwiftUI, "none at all") — the post's sentence still holds. The contrast and site-wide browser accessibility sentences rest on `CLAIMS.md` and were not re-run here |
| Waits on | Owner approval |

## 4. X-008 · X thread · READY FOR REVIEW (reused)

| | |
| --- | --- |
| Final copy | [`../../x.md`](../../x.md) **§X-008**, unchanged (post 4 already carries the corrected Angular wording from PR #330) |
| Audience | P2, product teams shipping web and native |
| Hook | "'Cross-platform UI' means one of two things. Worth knowing which you're being sold." |
| Key message | Runtime versus native implementations is a trade, not a winner |
| CTA | The catalogue |
| Destination | `/components` |
| UTM | `utm_source=x&utm_medium=social&utm_campaign=kx_p2_f_two_trades&utm_content=x_thread` |
| Visual | **VIS-005** (unchanged). Known nit: its manifest alt says the columns are "presented as equals" while the right column is accent-styled |
| Evidence | No counts in the copy. "Five implementations" holds: five platforms carry implementations |
| Waits on | Owner approval. LI-007 (its spine) went out 2026-10-12; LI-007's tagged link shows no session in PostHog, so check the link in X-008 resolves with its tag before posting |

## 5. ART-003 · dev.to article · PLANNED (new outline)

Outline: [`ART-003-outline.md`](./ART-003-outline.md). *Preview is a measurement, not a modesty label*: how
the Angular package's Preview → Stable gate works, with today's fractions. Audience P1. Destination
`/docs/angular`, campaign `kx_p1_a_preview_contract`. **Not a draft** and not scheduled; the next step is a
draft, re-deriving every number on the day.

Visual requirement: one checklist graphic of the 13 graduation criteria (met / open), generated from
`pnpm check:angular-graduation` output. There is no generator for it today; a production brief is in §7 below.

## 6. GH-001 · GitHub Discussion · DRAFTED (new)

Draft: [`GH-001-project-status.md`](./GH-001-project-status.md). A factual status note: what is installable,
implemented and verified per platform. Audience neutral. Destination `/docs/platforms`, campaign
`kx_neutral_g_project_status`. **Blocked:** the repository has Discussions disabled (GitHub API,
2026-10-17); enabling them is an owner action.

## 7. Visual production brief for ART-003

- One image, 1600×900 (dev.to cover) plus a 1200×627 crop for LinkedIn if it is reused.
- Content: the 13 criteria from `check:angular-graduation`, grouped as the script groups them (Catalogue,
  Build, Behaviour, Accessibility, RTL, Large text, Motion, Visual, Documentation), each marked met or open,
  open ones naming their missing components. A footer: "Angular: published on npm, preview".
- Must be generated from the script's JSON or text output by extending `scripts/gen-marketing-visuals.mjs`,
  so the figure cannot drift. No hand-typed numbers, and no placeholder committed as final.
- Light and dark exports; legible at 400 px wide; alt text that reads the criteria, not "a checklist".

## What this batch deliberately does not do

- It does not touch LI-005. Whether LI-005 ever went out is the owner's open question, and it stays BLOCKED.
- It does not reuse LI-010 or X-002. Both state "98" and "Angular 31" as current figures; `verify-package.mjs`
  in `../a02` fails on them. They need a refresh before they can be reviewed.
- It does not mark anything approved. Approval is recorded per asset in `../../register.json` as
  `approval: { by, on, evidence }`, and `pnpm check:content` refuses one without all three.
