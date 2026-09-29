# Phase 1 — Positioning, ICP and messaging reconciliation

**Date:** 2026-09-29 · **Base:** `e86b3ec` (main, after the Phase 0.9.1 registry fix merged)

**Nothing was published, deployed, released or merged.** No product code, component, registry behaviour or
package was touched. This phase produced strategy documents and fixed drift inside `marketing/`, plus two
guard-path updates and two campaign-script corrections that the reconciliation made necessary.

## What this phase was, and what it was not

It was a **reconciliation**, not a new strategy. Substantial marketing work already existed and most of it was
good — evidence-linked, honest about gaps, already carrying a source-of-truth rule. The job was to consolidate
it into one canonical set, remove drift, and make authority unambiguous.

Concretely: the previous `README.md` said, in its own routing table, *"Positioning or messaging strategy —*
*`positioning.md` / `messaging.md` — **Phase 1 work**, not yet started."* That is the gap this closes.

---

## 1. Information architecture

### BEFORE

```
marketing/
  README.md              analytics.md         community.md
  content-calendar.md    content-pillars.md   experiments.md
  launches.md            messaging.md         monthly-review.md
  personas.md            positioning.md       roadmap.md
  seo.md                 weekly-review.md
  audits/                6 files
  content/               backlog.json, 2 campaign docs, template
    drafts/a01/          10 files
    drafts/a02/          7 files
  (research/             referenced by 5 files — DID NOT EXIST)
```

41 files. No signal which documents were authoritative; `positioning.md` and `messaging.md` both carried
positioning; personas were 4 fields deep; there was no claim registry; `research/` was an instruction with no
directory behind it.

### AFTER

```
marketing/
  README.md              ← map + source-of-truth hierarchy + version-resilience rule

  STRATEGY.md            ← CANONICAL: category · ICP · JTBD · problems · value · differentiation · funnel
  MESSAGING.md           ← CANONICAL: positioning · pitches · hierarchy · platform wording · matrix · objections
  PERSONAS.md            ← CANONICAL: behavioural personas, 12 fields each, tiered
  CLAIMS.md              ← CANONICAL: claim registry, status + evidence + review trigger per claim
  CONTENT-PILLARS.md     ← CANONICAL: 6 pillars, with the 3 rejected candidates recorded

  seo.md  community.md  launches.md  analytics.md  experiments.md
  content-calendar.md  roadmap.md  weekly-review.md  monthly-review.md   ← SUPPORTING

  research/README.md     ← NEW: what belongs there, how to cite, research vs strategy
  content/README.md      ← NEW: campaign register with READY / NEEDS UPDATE / ARCHIVED
  content/…              ← campaigns and drafts, unchanged in shape
  audits/…               ← historical, + this report
```

44 files. Canonical documents are uppercase at the root; supporting documents are lowercase; directories hold
research, campaigns and history. The README answers every success-criteria question with a link.

**Two structural suggestions from the brief were evaluated and declined**, with reasons rather than silently:

- **`campaigns/`** — rejected. `content/drafts/<id>/` already holds sequence, sources, measurement and
  verification scripts together; splitting would break relative paths inside each draft and its scripts for no
  navigational gain. `content/README.md` makes it findable instead.
- **`archive/`** — not created. Nothing has been superseded rather than corrected. An empty archive directory
  is the "empty bureaucracy" the brief warns against, and an archived positioning document is exactly the
  competing canonical source the success criteria forbid. The README states where it will go if needed.

---

## 2. Documents reviewed

All 41 pre-existing files, classified:

| Classification | Files |
| --- | --- |
| **CANONICAL** (was) | `positioning.md`, `messaging.md`, `personas.md`, `content-pillars.md` — overlapping, no declared hierarchy |
| **SUPPORTING** | `seo.md`, `community.md`, `launches.md`, `analytics.md`, `experiments.md`, `content-calendar.md`, `roadmap.md`, `weekly-review.md`, `monthly-review.md` |
| **CAMPAIGN** | `content/campaign-sequence-a01-a02.md`, `content/visual-production-a01-a02.md`, `content/source-event-template.md`, `content/backlog.json`, `drafts/a01/*` (10), `drafts/a02/*` (7) |
| **AUDIT** | `audits/*` (6) |
| **GENERATED** | None. Deliberate — every number is generated *outside* this directory and read via `pnpm marketing:stats` |
| **STALE** | 4 campaign files carrying `0.23.1`; 2 campaign verification scripts with a hard-coded package set |
| **ARCHIVE** | None |

## 3. Consolidated

| Action | Detail |
| --- | --- |
| `positioning.md` → **`STRATEGY.md`** | `git mv`, history preserved. Expanded from a positioning fragment into the full strategy document. Its risk list survives as §8 |
| `messaging.md` → **`MESSAGING.md`** | `git mv`. Its six value propositions consolidated into five pillars in `STRATEGY.md` §5 — the old #1 and #3 were the same "tokens are the shared artefact" argument from two angles, and #6's guardrail case became pillar 5. Voice section kept nearly verbatim because it was already right |
| `personas.md` → **`PERSONAS.md`** | `git mv`. 5 ICPs × 4 fields → 8 personas × 12 fields |
| `content-pillars.md` → **`CONTENT-PILLARS.md`** | `git mv`. 6 pillars re-derived; the multiplier engine kept |
| **`CLAIMS.md`** | New. 26 claims across 6 groups. Did not exist in any form; the closest thing was the claim verification matrix inside `audits/READINESS-AUDIT.md`, which is a dated snapshot rather than a living registry |

**Archived: nothing.** Every overlapping document had a single clear successor, so renaming beat archiving —
no duplicate, no competing canonical source, and `git log --follow` still works.

## 4. Contradictions and drift resolved

| # | Problem | Resolution |
| --- | --- | --- |
| 1 | **Two documents carried positioning** — `positioning.md` (category, one-line, never-say table) and `messaging.md` (headline, subhead, differentiator). Neither declared precedence | One canonical positioning in `MESSAGING.md` §1; `STRATEGY.md` owns category and value. README states which wins |
| 2 | **No authority signal at all** | Uppercase canonical / lowercase supporting, plus a 6-row source-of-truth hierarchy with the canonical set at row 4 and research/drafts at row 5 |
| 3 | **`research/` referenced by 5 files, 6 references, and did not exist** | Directory created with a purposeful README. The brief said four documents; it was five — `weekly-review.md`, `community.md`, `roadmap.md`, `drafts/a01/measurement.md` (×2), `drafts/a01/publish-checklist.md`. `monthly-review.md`, named in the Phase 0.75 audit, is actually clean. All six references now resolve with no path edits |
| 4 | **`0.23.1` in 4 campaign files** | Re-derived to current versions, dated 2026-09-29, and `@kinetixui/iot` added — it had been absent from both campaigns entirely |
| 5 | **Both campaign `verify-package.mjs` hard-coded the publishable package set** | Now derived from `release/publish-packages.json`. This was found *because* fixing #4 made the scripts fail on `@kinetixui/iot`'s real version: the checks that catch drift were themselves drifting. Same defect class as the registry generator's hand-written allowlist |
| 6 | **"98 components"** repeated as a flat count | `marketing:stats` says it overstates by one — 97 components + 1 documented recipe. Corrected in the campaign sources table and registered as claim B2 |
| 7 | **Angular distribution language** | Already corrected in Phase 0.5. Re-verified here and promoted into claim C2 with the "both halves always together" rule, so it cannot regress silently |
| 8 | **`@kinetixui/iot` had no marketing home** | Now content pillar E, SEO cluster F, claim C4, and a persona note. It shipped after the previous strategy was written |
| 9 | **Old headline claimed "every platform"** | *"One token architecture, in motion across every platform"* invited the parity reading the whole position rejects. Replaced |
| 10 | **My own drafting tripped the guards twice** | "direction-aware … per platform" in `STRATEGY.md` and again in `CLAIMS.md`, the second hard-wrapped across a newline so a line-based grep could not see it. The guard was right both times and the text changed, not the guard |

## 5. Canonical positioning

> **A design system for teams on more than one platform — with cross-platform claims verified against source
> in CI.**

**Core value proposition:** KinetixUI is a design system for teams on more than one platform, whose
cross-platform claims are verified against source in CI — including the ones that turned out to be wrong.

**Category:** cross-platform design system infrastructure (primary); a multi-platform component library
(secondary).

## 6. ICP

**PRIMARY — two, as a pair:**

- **P1 — the design-system engineer maintaining more than one platform.** The only audience for whom
  "verification is the product" is immediately legible. Evaluates the architecture, and decides.
- **P2 — the team shipping one product on web and native.** Feels the drift; often has no design-system owner,
  which makes token-only adoption the entry path that converts.

**SECONDARY:** frontend lead (S1) · design-system designer (S2, influencer) · RTL team (S3, niche) · mobile
engineer (S4, **blocked on distribution**) · enterprise design-system team (S5, **blocked on maturity
signals**).

**CONTRIBUTORS:** engineers drawn by the machinery rather than the components.

**LOW PRIORITY, deliberately:** React-only teams · Figma-kit seekers · anyone needing support contracts ·
wearables.

Naming S4 and S5 as *blocked*, and what blocks them, is the substantive change from the previous list — it
stops copy being aimed at audiences the product cannot currently serve.

## 7. Differentiators

**Structural:** marketing copy under CI guard · coverage generated from a manifest rather than written ·
published claims that failed and were corrected · DTCG source to four native token outputs.

**Product:** five platform implementations in their own idioms · 20 Blocks with real source on all five ·
`@kinetixui/iot` · registry plus npm package.

**Workflow:** token-only adoption · own-the-code CLI · documented exceptions with reasons.

**Trust:** npm provenance · tarball gating · real-browser accessibility · evidence published as fractions.

**Explicitly NOT differentiators:** component count · TypeScript/Tailwind/Radix · dark mode · the React
library alone · MIT · tree-shaking · "production ready".

## 8. Claims requiring qualification

`CLAIMS.md` carries 26 claims. Those that may never travel without their qualifier:

| Claim | Qualifier that must accompany it |
| --- | --- |
| Tokens generated from one source (A1) | Components are hand-written per platform (A2). Never one without the other |
| Catalogue count (B2) | 98 entries = 97 components + 1 documented recipe |
| Verification depth (B3) | The fraction, from `marketing:stats`. A partial count is not a tick |
| Angular (C2) | Published **and** preview, together, always |
| SwiftUI / Compose / Flutter (C3) | Source you build. No install command, ever |
| IoT (C4) | A module, not a platform. No native port, no transport support, not in the catalogue count |
| Accessibility (E1) | Checks are evidence, not compliance or certification |
| Direction-awareness (E2) | The fractions. They are uneven and one implementation has none |

**PROHIBITED:** wearable support in any form · blanket "production ready" · tree-shaking as a benefit ·
invented adoption or testimonials · paid tiers.

## 9. Claims PENDING LIVE VERIFICATION

**One: D1 — one-command installation / activation.**

The mechanism is correct in source and `check:registry-deps` proves every registry item declares the npm
packages its delivered files import. Production was confirmed once, on 2026-09-29, from the repository owner's
machine: `add card` installed `clsx` and `tailwind-merge` into a clean project using the unmodified published
CLI. That is a single manual observation, not a repeatable check, and the agent environment cannot reach the
live origin to re-run it.

So the command is safe to show; a promise of the form "one command and you're running" is not cleared for
acquisition copy until a repeatable production check exists. Promoting this row is a Phase 2 candidate.

Per the phase brief, this is **not** treated as evidence that production is broken. It is verified in source,
verified once live, and not independently repeatable from here.

## 10. Content pillars

Six selected, three candidates rejected with reasons:

| Pillar | Focus | Flagship? |
| --- | --- | --- |
| **A** | Verified cross-platform design systems | **Yes** |
| B | Design tokens past the web boundary | |
| C | Engineering a design system | |
| D | Accessibility and direction as infrastructure | |
| E | Device and fleet interfaces | new |
| G | Building in public | strongest single asset |

**Rejected:** Blocks/workflows as a pillar (a feature story with no recurring insight — used as proof inside A
and F instead); accessibility and verification as *separate* pillars (merged into D and A, because splitting
verification from the cross-platform argument dilutes both).

## 11. SEO alignment

`seo.md` kept and reconciled rather than rewritten — its clusters, landing-page architecture and page ranking
were already sound and grounded. Added: an intent map binding each cluster to audience, landing surface,
message and CTA; a new cluster **F** for device interfaces; and the claim constraints that apply to every
page. No keyword work, no new pages, no generic rewrite.

## 12. Validation

| Check | Result |
| --- | --- |
| `pnpm --filter @kinetixui/web test` | **1,084 pass** — includes `marketing-claims.test.ts` and `current-truth.test.ts` reading the new canonical docs |
| Guard paths updated | `CURRENT_SURFACES` repointed to the renamed files, and `CLAIMS.md` + `CONTENT-PILLARS.md` added so the new canonical documents are guarded too |
| `a01/verify-package.mjs` | **exit 0** (was exit 1, 2 problems) |
| `a01/verify-evidence.mjs` | **exit 0** — 48/48 claims |
| `a02/verify-package.mjs` | **exit 0** (was exit 1, 2 problems) |
| `pnpm marketing:stats` | Runs; every figure in the new documents traced to it |
| No stale `0.23.1` evergreen copy | Confirmed — remaining mentions are dated audits and two deliberate historical comments |
| No current product version in evergreen copy | Confirmed — `0.23.3`, `0.24.0`, `0.2.0` appear in no canonical or supporting document |
| No false Angular distribution statement | Confirmed, and now claim C2 |
| No wearable support claim | Confirmed by guard |
| No blanket production-ready claim | Confirmed — every mention is an objection answer or a prohibition |
| No component-generation implication | Confirmed — every "transpile" mention is a denial |
| No stable-equals-published conflation | Confirmed |
| No tree-shaking benefit claim | Confirmed — every mention is a prohibition or an audit reference |

**No new tests were written.** The existing guards already cover these classes and now read the canonical
documents; adding assertions over strategy prose would prohibit legitimate evolution, which the brief
explicitly warns against. The two changes made to test infrastructure were a path update and adding two files
to an existing surface list.

## 13. Remaining strategic unknowns

Named rather than resolved, because guessing would be the failure this project's position cannot survive.

1. **Which primary ICP actually converts.** P1 and P2 are reasoned from the product and the pain, not from
   data. There are no users and no baseline. First real signal should go to `research/`.
2. **Whether the verification argument travels.** It is compelling to P1 by construction. Whether it survives
   being retold to P2 — who may just want their apps to match — is untested.
3. **The native distribution question.** S4 and S5 are blocked by SwiftUI/Compose/Flutter not being installable.
   That is a product decision with marketing consequences, and it is not a Phase 1 call.
4. **Whether "cross-platform design system infrastructure" is a category anyone searches for.** It is accurate.
   Category creation is expensive, and cluster A assumes demand that is unmeasured.
5. **Repeatable production verification** (claim D1) — needs either network access from the agent environment
   or a scheduled external check.
6. **Whether Angular preview helps or hurts.** It is honest and installable, and a preview subset may read as
   incomplete to exactly the enterprise audience most likely to ask about Angular.
7. **`backlog.json` needs re-mapping** to the Phase 1 pillar set. Marked NEEDS UPDATE rather than rewritten,
   since the next planning pass is Phase 2's.

## 14. Scope

Untouched, per the brief: product architecture · components · registry behaviour · publishing · deployment ·
releases. No engineering audit was performed and Phase 0 was not restarted. No social content was generated.
