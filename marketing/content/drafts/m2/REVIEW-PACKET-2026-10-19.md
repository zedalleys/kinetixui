---
type: owner review packet
window: 19 October to 1 November 2026
prepared: 2026-10-18
status: for the owner's decision. Nothing here is approved, scheduled or published by preparing it
---

# Review packet — the next approvals

Three assets wait on the owner this week, in posting order. For each: where the words are, what was re-checked
today, and the pin to record **if** the owner approves those exact words. Approving means adding
`approval: { by, on, evidence, copy }` to the asset in `../../register.json`; from 2026-10-18 `pnpm check:content`
refuses an approval without the pin, and fails if the words change afterwards.

Approval is editorial only. Every post is published by hand, and closed out only with its own live URL.

## 1. X-001 · X thread · Tue 20 Oct, 15:00 UTC · READY FOR REVIEW

| | |
| --- | --- |
| Copy | [`../a01/x-thread.md`](../a01/x-thread.md), the whole file (9 posts plus the alternates at the end) |
| Destination | dev.to article in post 9; tracked `/docs/platforms` link as a reply under post 9 |
| Tracked link | `https://kinetixui.com/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=x_thread` (parser test passes, M2) |
| Re-checked 2026-10-18 | Historical figures only (91 → 90 and so on), past tense; unchanged since `verify-evidence.mjs` passed 48/48 on 2026-10-17 |
| Depends on | LI-001 posted the day before. Same stale-article caveat as LI-001: post 9 sends readers to ART-001, whose "today" paragraph is behind |
| Pin if approved | `copy: { file: "marketing/content/drafts/a01/x-thread.md", sha256: "38796bd1c88e715812769ec50fc1a406efe30e331e6cb2dac9f0fe538d3d2642" }` (no `section`: the whole file after its front matter, so editing an alternate also needs a fresh approval) |

## 2. LI-008 · LinkedIn · Thu 22 Oct, 14:00 UTC · READY FOR REVIEW

| | |
| --- | --- |
| Copy | [`../../linkedin.md`](../../linkedin.md) § LI-008 |
| Destination | `/docs/platforms` |
| Tracked link | Paste `https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_d_partial_evidence&utm_content=li_primary` in place of the bare URL on the last line, as that file's publishing notes say |
| Re-checked 2026-10-18 (`pnpm marketing:stats`) | "Direction-aware behaviour testing runs from most of the catalogue on one platform to a single component on another, and none at all on a third": Flutter 58 of 90, Compose 1 of 90, SwiftUI 0 of 90. **Holds.** The contrast and site-wide browser accessibility sentences rest on `CLAIMS.md` and were not re-run |
| Visual | VIS-006, regenerated 2026-10-17 from the generator (109 / Angular 80) |
| Pin if approved | `copy: { file: "marketing/content/linkedin.md", section: "LI-008", sha256: "2584e24daa37dd2b64e866c1c65185d5b23d2aeb75f680214df85e0f41bd6491" }` (the entry from its campaign line to its closing `---`) |

## 3. X-008 · X thread · Fri 23 Oct, 15:00 UTC · READY FOR REVIEW

| | |
| --- | --- |
| Copy | [`../../x.md`](../../x.md) § X-008 |
| Destination | `/components` |
| Tracked link | Paste `https://kinetixui.com/components?utm_source=x&utm_medium=social&utm_campaign=kx_p2_f_two_trades&utm_content=x_thread` in place of the bare URL in post 4 |
| Re-checked 2026-10-18 | "Five implementations": React, Angular, SwiftUI, Compose, Flutter all carry implementations (`pnpm marketing:stats`). "An Angular button is a directive on a real HTML button": `packages/ui-angular/src/lib/button.ts` is `@Directive({ selector: 'button[kxButton], a[kxButton]' })`. **Both hold.** No counts in the copy |
| Visual | VIS-005 (known nit: its alt text says "presented as equals" while one column is accent-styled) |
| Watch | LI-007, its LinkedIn sibling, produced no tagged session. After posting, check for a `kx_p2_f_two_trades` / `x_thread` arrival rather than assuming the link kept its tag |
| Pin if approved | `copy: { file: "marketing/content/x.md", section: "X-008", sha256: "1444496dd7dfe6cb12320b69be9eb5191b72c3c03fddcf29ee03525d12c16ccd" }` |

## Preserved as they are (no change proposed here)

| Asset | State | What unblocks it |
| --- | --- | --- |
| LI-001 | APPROVED 2026-10-18, not published, stop gate open | The owner's one diagnostic visit, confirmed in PostHog ([`LI-001-publish-packet.md`](./LI-001-publish-packet.md)) |
| GH-001 | DRAFTED, BLOCKED | The owner enables GitHub Discussions on the repository; numbers re-derived on the day |
| COM-004 | BLOCKED | A live re-read of the community's rules, and a real thread to answer |
| LI-005 | BLOCKED, publication history unresolved | The owner says whether it ever went out (the 7 Oct post was IoT, not LI-005). Nothing is backfilled until then |
| LI-010, X-002 | DRAFTED, flagged `stale` | Refresh the "98 entries / Angular 31" figures (now 109 / 80); the stale flag blocks approval until then |
| ART-001 (live) | PUBLISHED, flagged `stale` | Optional owner edit of the "today" paragraph on dev.to (98 / 64 → 109 / 80) |
| LI-003, X-005, LI-004, X-003 | Published per the author, live URLs missing | The author supplies each post's own URL; nothing is invented |

## Not included, on purpose

- No asset is marked approved by this packet.
- No duplicate of an already published post is proposed.
- No reach, impressions or clicks are quoted: they exist only in each platform's analytics.
