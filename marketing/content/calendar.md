---
type: 30-day calendar
status: running — day 1 published 2026-09-29; everything from day 2 on is still planned
---

# The first 30 days

Day offsets, not dates. **Day 1 was 2026-09-29** — the offsets below count from there, so day 2 is
2026-09-30 and so on. **Day 1 is a Tuesday** in the numbering below — Monday starts are worse for a
technical audience's first impression of a new account.

Published rows carry their date in the Status column, and the act of publishing is logged per channel in
[`../distribution/register.json`](../distribution/register.json), which is the record `pnpm check:distribution`
validates. This file stays the schedule.

The machine-readable version of every row is `register.json`, which `pnpm check:content` validates.

## Cadence

**2–3 original assets a week, plus repurposing.** Twenty assets in thirty days, from six content families.
That is deliberately under what a content calendar template would suggest, because this is one person who
also maintains the product, and a month of thin posts costs more credibility than a month of silence.

Rough weekly shape: one LinkedIn post, one or two X assets, and — in the weeks an article lands — the
article plus its derived posts. Community contributions are opportunistic and slot in where a real thread
appears, which is why they carry no fixed day.

## Weekly themes

| Week | Theme | Why here |
| --- | --- | --- |
| **1** | **Problem recognition** | Nobody evaluates a solution to a problem they have not named. Week 1 names drift, for both ICPs, and runs the P1/P2 comparison pair |
| **2** | **Architecture** | Having named the problem, show the mechanism — tokens crossing the boundary, the manifest, native implementations |
| **3** | **Proof** | The week the evidence leads: caught claims, fractions instead of ticks, the bug and its structural fix |
| **4** | **Adoption and invitation** | Only now is it reasonable to suggest a next step. The ladder, and the smallest way in |

## The calendar

| Day | Asset | Channel | Format | ICP | Pillar | Stage | Topic / hook | CTA → destination | Campaign | From | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Week 1 — problem recognition** |
| 1 | **LI-003** | LinkedIn | post | P2 | A | Awareness | *"Six months later, they don't"* — drift as a mechanism problem | See the coverage → `/docs/platforms` | `kx_p2_a_drift` | — | **Published** 2026-09-29 |
| 2 | **X-005** | X | single | P2 | A | Awareness | Drift is not a discipline problem | — | `kx_p2_a_drift` | LI-003 | Ready |
| 4 | **LI-004** | LinkedIn | post | P1 | C | Evaluation | The manifest, and the check that reads it back | See the coverage → `/docs/platforms` | `kx_p1_c_manifest` | — | Ready |
| 6 | **X-003** | X | single | P1 | C | Evaluation | No source, no claim, build fails | — | `kx_p1_c_manifest` | LI-004 | Ready |
| — | **COM-002** | community | comment | P1 | A | Awareness | How to verify a coverage claim | opportunistic | — | ART-001 | Brief |
| **Week 2 — architecture** |
| 8 | **ART-002** | dev.to | article | NEUTRAL | B | Awareness | *Your design tokens stop at the web boundary* | Token contract → `/docs/tokens` | `kx_p2_b_token_boundary` | — | **Drafted** |
| 9 | **LI-005** | LinkedIn | post | NEUTRAL | B | Awareness | The boundary, and the copies nobody maintains | Token contract → `/docs/tokens` | `kx_p2_b_token_boundary` | ART-002 | Ready |
| 11 | **X-004** | X | thread (5) | NEUTRAL | B | Awareness | The token boundary, in five | `/docs/tokens` | `kx_p2_b_token_boundary` | ART-002 | Ready |
| 13 | **LI-007** | LinkedIn | post | P2 | F | Evaluation | Two trades: runtime vs native implementations | Catalogue → `/components` | `kx_p2_f_two_trades` | — | Ready |
| — | **COM-001** | community | comment | P2 | B | Awareness | Cross-platform token architecture | opportunistic | — | ART-002 | Brief |
| **Week 3 — proof** |
| 15 | **ART-001** | dev.to | article | P1 | A | Awareness | *Your cross-platform design system may be lying about parity* | Coverage → `/docs/platforms` | `kx_p1_a_parity_proof` | — | **Drafted** (existing) |
| 16 | **LI-001** | LinkedIn | post | P1 | A | Awareness | Parity post A, with the article | Article, then `/docs/platforms` | `kx_p1_a_parity_proof` | ART-001 | **Drafted** (existing) |
| 17 | **X-001** | X | thread | P1 | A | Awareness | Parity thread | `/docs/platforms` | `kx_p1_a_parity_proof` | ART-001 | **Drafted** (existing) |
| 18 | **X-008** | X | thread (4) | P2 | F | Evaluation | Two trades | `/components` | `kx_p2_f_two_trades` | LI-007 | Ready |
| 20 | **LI-008** | LinkedIn | post | P1 | D | Evaluation | A partial count is not a tick | Evidence → `/docs/platforms` | `kx_p1_d_partial_evidence` | — | Ready |
| 21 | **X-007** | X | single | P1 | D | Evaluation | Fractions, not ticks | — | `kx_p1_d_partial_evidence` | LI-008 | Ready |
| — | **COM-004** | community | comment | P1 | D | Evaluation | Reporting partial evidence | opportunistic | — | LI-008 | Brief |
| **Week 4 — adoption and invitation** |
| 22 | **LI-006** | LinkedIn | post | P1 | G | Evaluation | The install that exited 0 and left a broken build | What it installs → `/docs/installation` | `kx_p1_g_dependency_list` | — | Ready |
| 23 | **X-006** | X | thread (6) | P1 | G | Evaluation | A list cannot fail | `/docs/installation` | `kx_p1_g_dependency_list` | LI-006 | Ready |
| 25 | **LI-010** | LinkedIn | post | P1 | A | Evaluation | Count isn't coverage | Coverage → `/docs/platforms` | `kx_p1_a_count_isnt_coverage` | — | **Drafted** (existing, a02) |
| 26 | **X-002** | X | thread | P1 | A | Evaluation | Count isn't coverage | `/docs/platforms` | `kx_p1_a_count_isnt_coverage` | LI-010 | **Drafted** (existing, a02) |
| 27 | **LI-009** | LinkedIn | post | P2 | B | Adoption intent | The smallest version is still too big | Start with tokens → `/docs/tokens` | `kx_p2_b_token_boundary` | — | Ready |
| 28 | **X-010** | X | single | P2 | B | Adoption intent | The smallest way in | `/docs/tokens` | `kx_p2_b_token_boundary` | LI-009 | Ready |
| 29 | **X-009** | X | single | NEUTRAL | C | Evaluation | Marketing copy under CI | — | `kx_neutral_c_copy_under_test` | — | Ready |
| 30 | **X-011** | X | single | P1 | A | Evaluation | Ask what the denominator is | — | `kx_p1_a_denominator` | — | Ready |
| — | **COM-003** | community | comment | NEUTRAL | G | Awareness | The dependency-list bug class | opportunistic | — | LI-006 | Brief |
| — | **LI-002** | LinkedIn | post | P1 | A | Awareness | Parity post B — **hold for ~3 weeks after LI-001** | `/docs/platforms` | `kx_p1_a_parity_proof` | ART-001 | **Drafted**, day 36+ |

## Distribution

Counts below are generated from `register.json`, which `pnpm check:content` validates. **27 assets**
(23 linkable and attributed, 4 community briefs).

**By pillar** — A: 10 · B: 6 · C: 3 · D: 3 · G: 3 · F: 2. No pillar owns the month; A leads because it is
the flagship pillar and already carries a finished article and two finished campaign sets.

**Pillar E (device interfaces) is deliberately absent.** Narrow audience, and the month is already full —
forcing it in would cost a stronger asset its slot. Revisit in month two.

**By ICP** — P1: 15 · P2: 8 · NEUTRAL: 4. Skewed to P1, and worth being honest about why: two finished
campaign sets already existed as P1 material, so the skew is inherited rather than chosen. It is a real
limitation of the first month's comparison — week 1's deliberate pair (LI-003 vs LI-004) is the cleanest
test in the month, and the P2 assets are concentrated in weeks 2 and 4.

**By stage** — Awareness: 12 · Evaluation: 13 · Adoption intent: 2. Weighted toward evaluation on purpose:
`STRATEGY.md` §7 names Credibility as the narrowest point in the funnel.

## What is not here

- **No daily posting.** Twenty assets in thirty days.
- **No Reddit text posts scheduled.** Community work is opportunistic and rules-gated; see
  `community-briefs.md`.
- **No launch.** Product Hunt and the staged launch belong to `launches.md` and Phase 5.
- **No paid anything.**
