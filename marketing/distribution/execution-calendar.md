---
type: rolling 14-day execution calendar
window: Monday 2026-10-19 to Sunday 2026-11-01
status: proposed. Only LI-001 is approved (editorially, 2026-10-18); nothing is scheduled, and no tool posts
  anything. Every other slot waits on the owner's approval of that asset; the dates are a plan, not a commitment
---

# Rolling 14-day execution calendar

The 30-day campaign in [`../content/calendar.md`](../content/calendar.md) stays the canonical schedule of
**what** exists and its day offsets (day 1 = 2026-09-29). This file is the **execution** plan for the next
14 days: which of those assets goes out when, now that several slots have passed. It does not renumber,
replace or re-date any asset in the registers. Published assets stay where they are; nothing published is
re-posted.

Rebuild it every second Monday from `pnpm marketing:inventory`, which lists every asset's status, planned date
and blockers from the registers.

## Rules this window follows

- **Carry forward, oldest first.** LI-001, X-001 and X-008 passed their planned days (14, 15 and 16 Oct) and go
  first, in the original order, so the parity family (ART-001 → LI-001 → X-001) lands while the article is
  recent.
- **LinkedIn before X** for the same family, a day apart (the a01 sequence), and **never two channels in the
  same hour**, so arrivals stay attributable.
- **Two LinkedIn and two to three X a week.** Under the brief's ceiling on purpose: there is no approved dev.to
  draft in this window, and a thin post costs more than a missed slot.
- **No duplicate publication.** `pnpm check:distribution` now fails if an asset is logged as published twice
  on one channel, or if one live post is the evidence for two records.
- **Close out only with a live URL.** From 2026-10-17 a row cannot be marked published without `liveUrl`, the
  post's own URL, supplied by the author.
- **Times** are proposed in UTC, with the owner's local time assuming UTC+3 (earlier close-outs used it).
  14:00 UTC is morning on the US east coast and afternoon in Europe.

## Week 1 — 19 to 25 October (proof, continued)

| Date | Time (UTC / UTC+3) | Asset | Channel | Audience | Objective | Destination | Approval | Required assets | Dependencies | Tracking (`utm_campaign` / `utm_content`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mon 19 Oct | 14:00 / 17:00 | **LI-001** | LinkedIn | P1 | Awareness: carry ART-001's parity argument to LinkedIn | dev.to article in body; `/docs/platforms` in first comment | APPROVED 2026-10-18 (editorial only; the owner posts it by hand) | none (ships without a visual) | a01 stop gate still OPEN: source and local-browser checks pass, but no PostHog event yet. Owner opens the tagged link once with `&kx_traffic=diagnostic` on kinetixui.com and the event is confirmed in PostHog before posting. Packet: [`../content/drafts/m2/LI-001-publish-packet.md`](../content/drafts/m2/LI-001-publish-packet.md) | `kx_p1_a_parity_proof` / `li_primary` |
| Tue 20 Oct | 15:00 / 18:00 | **X-001** | X | P1 | Awareness: the same argument as a thread | dev.to in post 9; `/docs/platforms` as reply | READY FOR REVIEW | none | LI-001 posted the day before | `kx_p1_a_parity_proof` / `x_thread` |
| Wed 21 Oct | 13:00 / 16:00 | **GH-001** | GitHub | neutral | Evaluation: a one-screen status note for visitors arriving from posts | `/docs/platforms` | DRAFTED | none | Owner enables Discussions (disabled on 2026-10-17); numbers re-derived on the day | `kx_neutral_g_project_status` / `gh_discussion` |
| Thu 22 Oct | 14:00 / 17:00 | **LI-008** | LinkedIn | P1 | Evaluation: fractions, not ticks | `/docs/platforms` | READY FOR REVIEW | VIS-006 (regenerated 2026-10-17) | Owner approval; re-run `pnpm marketing:stats` | `kx_p1_d_partial_evidence` / `li_primary` |
| Fri 23 Oct | 15:00 / 18:00 | **X-008** | X | P2 | Evaluation: runtime versus native is a trade | `/components` | READY FOR REVIEW | VIS-005 | Owner approval; confirm the tagged `/components` link keeps its tag (LI-007's showed no tagged session) | `kx_p2_f_two_trades` / `x_thread` |

## Week 2 — 26 October to 1 November (adoption and invitation)

| Date | Time (UTC / UTC+3) | Asset | Channel | Audience | Objective | Destination | Approval | Required assets | Dependencies | Tracking (`utm_campaign` / `utm_content`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mon 26 Oct | 14:00 / 17:00 | **LI-006** | LinkedIn | P1 | Evaluation: a list cannot fail, only be incomplete | `/docs/installation` | READY FOR REVIEW | VIS-004 is briefed but **not produced**; the post ships without it rather than late | Owner approval | `kx_p1_g_dependency_list` / `li_primary` |
| Tue 27 Oct | 15:00 / 18:00 | **X-007** | X | P1 | Evaluation: the single-post version of LI-008 | `/docs/platforms` | READY FOR REVIEW | none | LI-008 out | `kx_p1_d_partial_evidence` / `x_single` |
| Wed 28 Oct | — | **COM-004** | community | P1 | Genuine participation in a thread about reporting partial evidence | none (no tracked link) | BLOCKED | none | A live re-read of the community's rules; only if a real thread exists | none, by design |
| Thu 29 Oct | 14:00 / 17:00 | **LI-009** | LinkedIn | P2 | Adoption intent: the smallest way in is tokens | `/docs/tokens` | READY FOR REVIEW | VIS-007 (regenerated 2026-10-17) | Owner approval | `kx_p2_b_token_boundary` / `li_ladder` |
| Fri 30 Oct | 15:00 / 18:00 | **X-006** | X | P1 | Evaluation: the dependency-list thread | `/docs/installation` | READY FOR REVIEW | VIS-004 (not produced; optional) | LI-006 out | `kx_p1_g_dependency_list` / `x_thread` |

**dev.to:** no article this window. ART-003 is an outline (`../content/drafts/m1/ART-003-outline.md`); the
target is a draft ready for review by Friday 30 October, for the next window.

## Not in this window, and why

| Asset | Why not now |
| --- | --- |
| LI-005 | BLOCKED. Whether it ever went out is the owner's open question (the 7 Oct post was IoT). If the owner confirms it never published, it can take a week-3 slot; X-004 and ART-002 already cover the family |
| LI-010, X-002 | DRAFTED and stale: both state "98" and "Angular 31" as today's figures; `../content/drafts/a02/verify-package.mjs` fails. Flagged `stale` in the content register (2026-10-18), which blocks approval until refreshed |
| LI-002 | Held by design until about three weeks after LI-001, so not before 9 November |
| X-009, X-010, X-011 | Ready, next window. X-010 follows LI-009 |
| ART-001-PILLAR | PLANNED until the owner confirms the dev.to pillar-link edit is live. The one tagged `art_pillar` arrival (2026-10-17 03:51 UTC) matches the suspected-automation fingerprint (M2, `../measurement/M2-TRAFFIC-QUALITY.md`), so it is no longer evidence that the edit is live |
| COM-001 … COM-003 | BLOCKED on a live rule check; opportunistic only |

## After each post

1. Paste the live post URL into the asset's row in [`register.json`](./register.json) as `liveUrl`, with the
   date, `status: "published"` and a first result line (absolute counts only).
2. Set the asset to `published` in [`../content/register.json`](../content/register.json).
3. Run `pnpm check:distribution` and `pnpm check:content`.
