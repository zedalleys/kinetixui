---
id: a02
type: publish checklist
campaign: kx_count_isnt_coverage
status: drafted
---

# a02 — publish checklist

Nothing in this package is scheduled. Work top to bottom on the day.

## 1. Regenerate the numbers — before anything else

- [ ] `pnpm marketing:stats`
- [ ] `node marketing/content/drafts/a02/verify-package.mjs` — compares every
      platform figure in the copy against `components.manifest.json` **as it is
      now**, not as it was at drafting. Exit 0 or do not post.
- [ ] Every figure below still matches. **If one moved, fix the copy AND
      `sources.md` before posting** — do not publish around a stale number.

| Claim | Expected at drafting (2026-09-24, `75945b7`) |
| --- | --- |
| Components | 98 |
| React / SwiftUI / Compose / Flutter / Angular | 98 / 90 / 90 / 90 / 31 |
| On all four catalogue-complete platforms | 90 / 98 |
| Documented exceptions | 8 |
| Angular package maturity | preview, `catalogComplete: false` |
| React package maturity vs catalogue verification | stable vs beta |
| SwiftUI / Compose / Flutter verification | experimental |
| Lifecycle | 97 stable, 1 beta |
| Blocks | 20, all five platforms |
| Version | 0.22.1 |
| `@kinetixui/angular` | NOT published |

These are volatile by nature: implementation counts, verification levels, the
Angular count, the Block count, the version, and publication status can all move
between drafting and posting.

## 2. Wording checks — the ones that are wrong in a way that looks right

- [ ] No bare **"90/98"** anywhere. It always names the four catalogue-complete
      platforms.
- [ ] Nowhere says **"90/98 across all five"** or counts Angular in that
      denominator.
- [ ] Nowhere says **"all five platforms"** as a parity claim.
- [ ] Angular is never **"unsupported"**, never **"only 31"**, never **"stable"**,
      never **"98/98"**. It is *preview, intentionally incomplete, at 31*.
- [ ] **Package maturity** and **verification maturity** are never the same
      sentence, and neither is called just "mature".
- [ ] Low verification is never framed as the code not working.
- [ ] Blocks are never used as evidence of component parity.
- [ ] No install command for `@kinetixui/angular` or any native library.
- [ ] No competitor named; no ranking or score of platforms.
- [ ] Banned words absent: game-changing, revolutionary, seamless, effortless,
      best-in-class, "the future of", production-ready everywhere.

## 3. Attribution stop gate — blocking

- [ ] Post the LinkedIn link with `utm_content=li_primary`.
- [ ] Open it yourself.
- [ ] Confirm the event carries **`kx_campaign: kx_count_isnt_coverage`**.
- [ ] **If it is missing, STOP.** Do not post the X thread or any standalone.
      Fix the tag first — every later link is unattributable until it is right,
      and the failure is silent.

## 4. Visual

- [ ] Numbers on the image match step 1.
- [ ] Angular shows `preview` and is visually distinct, not marked as a failure.
- [ ] No five equal bars.
- [ ] The 90/98 caption names its four platforms.
- [ ] Alt text present (see `visual-brief.md`).

## 5. Sequence

- [ ] Day 0 LinkedIn primary — *or* the alternative, not both.
- [ ] Day 1 X thread.
- [ ] Day 2–4 one standalone (S4 first).
- [ ] Nothing else queued automatically.

## 6. After

- [ ] Backlog `a02` → `published`, with the real date (not before).
- [ ] Day 7 early read, day 14 decision, per `measurement.md`.
- [ ] a01 remains `drafted`. Its current-state figures were re-baselined on
      2026-09-24 and now agree with this package; its historical before/after is
      pinned to `34e5b06` and must stay in past tense. Both are enforced —
      `a01/verify-package.mjs` (current) and `a01/verify-evidence.mjs`
      (historical). Run both if a01 is edited.
- [ ] a01 publishes **first**. See `marketing/content/campaign-sequence-a01-a02.md`
      for the interval and the running order.
