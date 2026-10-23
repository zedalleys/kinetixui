# KinetixUI unified master roadmap

**Written:** 2026-10-21 · **Last accuracy pass:** 2026-10-23 (see *State refreshed* below) · **Measurement
baseline:** `origin/main` at `72770976`, which is what every figure below was read from · **`main` is now
`8b40fce`**, after #348 (`b8cfba9`) and #444 · **Status:** a reconciliation of existing plans, not a new plan. Every 30/60/90 item is a **proposal**; nothing here is a commitment, an approval or
an authorization to merge or publish.

## How to use this document

This is an **index and a reconciliation**, not a replacement. It names the document that owns each decision, and it
records where those documents disagree with the repository. Where it and a source document differ, **the source
document wins** and this file is the one that is wrong.

### Sources of truth, by subject

| Subject | Owning document | On `main`? |
| --- | --- | --- |
| Motion contract: tiers, easings, roles, reduced-motion forms, RTL, anti-patterns | [`MOTION.md`](../../MOTION.md) + [`tokens/contracts/motion.json`](../../tokens/contracts/motion.json) | yes |
| Motion phasing (MX0–MX4), discovery waves (BD-W), phases 0–8 | [`docs/roadmaps/PRODUCT-MOTION-DISCOVERY-ROADMAP.md`](PRODUCT-MOTION-DISCOVERY-ROADMAP.md) (#392) | yes |
| Selection-motion parity and the five-platform handoff | [`docs/roadmaps/MX1B-1C-SELECTION-PARITY.md`](MX1B-1C-SELECTION-PARITY.md) (#404) | yes |
| Motion coverage, per family × platform × nine dimensions | [`MOTION-COVERAGE-REGISTER.md`](MOTION-COVERAGE-REGISTER.md) | **new, this change** |
| Business capabilities, phases 0–10, the Core/Pro line | [`docs/BUSINESS-CAPABILITY-ROADMAP.md`](../BUSINESS-CAPABILITY-ROADMAP.md) | yes |
| Angular graduation contract, 13 criteria | [`ANGULAR-GRADUATION.md`](../../ANGULAR-GRADUATION.md) + `scripts/check-angular-graduation.mjs` | yes |
| Evidence ladder and what each instrument proves | [`docs/VERIFICATION-EVIDENCE-TIERS.md`](../VERIFICATION-EVIDENCE-TIERS.md) | yes |
| Catalogue quality programme CAT-2…CAT-6 | `docs/roadmaps/CATALOGUE-QUALITY-ROADMAP.md` | **no — PR #413** |
| Web/UX defect backlog CAT-BUG-001…020 | `UX-QUALITY-BACKLOG.md` | **no — PRs #428, #413** |
| Discovery-to-adoption journey findings F-01…F-35 | `docs/audits/EVALUATOR-JOURNEY-AUDIT.md` | **no — kept local by Ziad's instruction** |
| Marketing 30/60/90, campaigns, standing constraints | [`marketing/roadmap.md`](../../marketing/roadmap.md) | yes |
| Marketing metric definitions, QER, baseline policy | [`marketing/analytics.md`](../../marketing/analytics.md) | yes |
| Content assets, copy pins, approvals | [`marketing/content/register.json`](../../marketing/content/register.json) | yes |
| Publication record per channel | [`marketing/distribution/register.json`](../../marketing/distribution/register.json) | yes, **stale on LI-001** — see WS1 |
| 19–23 October publication queue | [`marketing/distribution/M4-PUBLICATION-QUEUE.md`](../../marketing/distribution/M4-PUBLICATION-QUEUE.md) | yes |
| **Live PR state, heads, checks, measured conflicts, merge sequence** | `/mnt/project-files/integration/LIVE-STATE-REGISTER-2026-10-21-EVENING.md` | project file |
| **Open owner decisions E1–E12 and their history** | `/mnt/project-files/integration/INTEGRATION-REGISTER-2026-10-21.md` | project file |

| Component and variant state completeness, Phase B work packages | `/mnt/project-files/phase-b-states/STATE-COMPLETENESS-MATRIX.md`, `PHASE-B-WORK-PACKAGES.md`, `SEMANTIC-VARIANT-TOKEN-GAPS.md` | project file |
| Block vs component classification, travel-booking feasibility | `/mnt/project-files/bd-blocks-audit/` (3 files) | project file |
| Configurable motion variants, `fluid` frame spec | `/mnt/project-files/motion/MOTION-VARIANTS-DECISION.md`, `FLUID-TABS-FRAME-SPEC.md` | project file |

**PR remediation and release readiness are owned by a sibling thread**, whose registers are the last two rows.
This roadmap does not restate PR heads, check states or merge order; it reads them from there, and it adds nothing
to that thread's scope.

> A second file named `MOTION-COVERAGE-REGISTER.md` exists under `/mnt/project-files/motion/`, written by another
> thread. The register this roadmap cites is the one in **this directory**, published in #440. If the two disagree,
> that is a reconciliation someone owes, not a figure to average.

### State refreshed 2026-10-22

Everything below was re-read on 2026-10-22; where it supersedes a figure written on 2026-10-21, the newer line wins.

| Item | State on 2026-10-22 | Change since 2026-10-21 |
| --- | --- | --- |
| **#348** R1 version PR | **MERGED as `b8cfba9`**, and **the release then failed and published nothing** — run 39700240605, `release:preflight`, because the 0.25.0 notes were dated 2026-10-21 and the merge landed 31 minutes into 2026-10-22 UTC. Repository versions moved; the registry did not. Recovery is a one-line date change in `releases.ts`, needing Ziad's approval and a **same-UTC-day** merge | merged, and failed, since the 2026-10-22 pass |
| **#428** CAT-QF | head `cab1c51f`, ready | unchanged |
| **#430** CAT-2 taxonomy | head `e2432811`, **base is now `main`**, draft, `mergeable_state` unstable. Every substantive #428 commit is an ancestor, so **#428 is contained in #430** and merging #428 first costs #430 no reconciliation | was based on #428's branch at `1f2cee4e` |
| **CAT-2 taxonomy decision** | **decided 2026-10-22 by the owner:** 8 categories accepted, twelve of the thirteen contested rows as proposed, and **`tag` moved to Data Display**; applied on #430's head and the chip counts re-measured in the browser | was open as E1/E2 |
| **#413** CAT-1 audit | head `df7ef57f`, ready | was `3d195beb` |
| **Catalogue merge order** | **#428 → #430 → #413**, unchanged and now also the cheapest | unchanged |
| **#439** hero Direction B | head `15273e92`, ready, **visual direction approved by the owner 2026-10-22 with notes**; merging is not authorized by that approval and waits behind R1 | was awaiting the choice |
| **#439 open question** | whether to **reposition the glow at narrow widths**: at 390px it covers 0% of the system map and 100% of the headline, which is the same physical-placement fault the PR removes the lattice for. Left open deliberately, because moving it changes the approved appearance | new |
| **#440** this roadmap | head `0839c71a`, 6 checks green, clean, 0 open review threads | new |
| **#441** Tabs motion presets | **draft**, head `d059f7b1`. Adds `motion="classic" \| "none"` to `TabsList` and repairs the `selection-indicator` role (`proposed` → `observed`, first consumer, two tokens pinned). **`fluid` and `spring` are specified and deliberately *not* in it** — it is the first slice, not the fluid one. No changeset on purpose until R1 closes; it touches `tokens/contracts/motion.json`, so **MX1d merges first and #441 rebases onto it** | new |
| **MX1d heads** | #411 `f026060f`, #412 `4c5a287c`, #414 `7fbad7b2` — all ready, order unchanged | all three moved |
| **Open PRs** | **14 substantive** after #348 merged (#411–#414, #427, #428, #430, #433, #434, #436, #437, #439, #440, #441) + 10 Dependabot. **The freeze still holds**, on Dependabot and on every other merge: any push to `main` re-runs `release.yml`, and R1 is not published yet | was 13 + 10 on 2026-10-21 |
| **BD-W6 boarding-pass block** | the owner **approved the slice on 2026-10-22** (decision B1′ in `/mnt/project-files/bd-blocks-audit/TRAVEL-BOOKING-FEASIBILITY.md`). It is the only `existing` travel stage, backed by the shipped `pass-card`, classified at birth on the BoardingPass capability row, and **static — no motion**, which is correct while `selection-indicator` has no merged consumer. Nothing is implemented yet | new |
| **Active threads** | three opened since this roadmap was written: *PR remediation and release readiness*, *Component state completeness audit*, *Discovery to adoption UX fixes* — alongside *Native selection motion and a11y*, *AE-2A decorative foundations*, *Integration register and release gates*, *Homepage hero art direction audit* | new |

**The reader-path test, now located and read.** It is
`marketing/measurement/M4-READER-PATH-TEST.md`, on **#436's branch and not on `main`**, written by the marketing
thread from Ziad's own instruction. **Attempt 1, 2026-10-22 00:24 UTC, is classified INCONCLUSIVE, and correctly
so:** the URL the owner copied in LinkedIn's in-app browser never left `linkedin.com` — it was a text-fragment
reference to the tracked link rather than a navigation — so **nothing in it shows whether LinkedIn preserves the
query string on a real tap.** Recording it as "LinkedIn strips the parameters" would claim more than the evidence
carries, and the file does not. Two results did come out of that window and are kept apart from it: the first
LinkedIn arrival ever recognised **by referrer alone**, with no query string (`kx_source=linkedin` on
`/docs/platforms`, 00:21:26 UTC), which narrows GAP-style worry that an untagged LinkedIn arrival is
indistinguishable from `direct` **to the in-app browser only**; and the fact that no campaign-tagged session has
reached PostHog for LI-001 at any point. The experiment closes on **C1** (the copied link address, no navigation),
**C2** (LinkedIn's own impressions and clicks) or **C3** (one visit attributed end to end). **X-001, LI-008 and
X-008 are on hold until one of them lands**, which is the owner's decision of 2026-10-22 00:32 UTC, and the order
of remedies is his too: try a placement correction before building a self-identifying destination. QER is
**unchanged and still undefined rather than zero** for LI-001. This supersedes **D-5** in §6: the decision is
made, and the diagnosis is the work.

---

## 1. Executive overview

KinetixUI is in an unusual and recoverable position: **the product is further ahead than its distribution, and its
distribution is further ahead than its measurement.**

Three sentences that the repository supports:

1. **R1 is merged and the release failed. Nothing was published.** #348 merged as **`b8cfba9`** on `main`, which
   sets `@kinetixui/ui`, `tokens` and `cli` to 0.25.0 and `@kinetixui/angular` to 0.26.0 in the repository, drains
   `.changeset/` to its README alone, and leaves `@kinetixui/iot` at 0.5.0 with its 7 changesets still held in
   `.changeset-held/iot/`. The `Release` workflow then ran on that commit and **failed**: run
   [39700240605](https://github.com/zedalleys/kinetixui/actions/runs/39700240605), job `preflight`, step
   `pnpm release:preflight`, at 2026-10-22 00:33:16 UTC — **31 minutes after UTC midnight**, which is the whole
   cause. Its message, verbatim:
   > `Core 0.25.0 release notes are dated 2026-10-21; first publication requires 2026-10-22 (UTC). Refresh the Version PR release date and obtain approval before merging. No package was published.`

   **It has now failed twice.** #444 merged at 2026-10-23 10:43 UTC, and the `Release` run on `8b40fce`
   ([39941158437](https://github.com/zedalleys/kinetixui/actions/runs/39941158437)) failed in the same `preflight`
   job. `apps/web/src/lib/releases.ts:154` still reads `date: "2026-10-21"` on `main`, so the gate's condition is
   still unmet and every further merge spends another failed release run. This is **IR-2 realised a second time.**

   So the npm registry still served 0.24.0 / 0.24.0 / 0.24.0 / 0.25.1 / 0.5.0 when it was read on 2026-10-23, and
   that is not a pending publish — it is a **refused** one. **Recovery is one line**: `date` on the 0.25.0 entry in
   `apps/web/src/lib/releases.ts:154` becomes the current UTC day, which **Ziad must approve and which must merge
   the same UTC day**, or the gate refuses it again for the same reason. A merged version PR is not a published
   package, and **the release thread owns closure**: until it reports it, "0.25.0 is out" is not a claim this file
   makes.
2. **The web experience has a verified defect backlog that is not yet on `main`.** Twenty CAT-BUG findings and
   thirty-five evaluator-journey findings exist with reproduction evidence; the documents recording them live in
   three unmerged PRs and one deliberately-local file. The *fixes* for the highest-severity catalogue defects are
   ready in #428.
3. **Marketing has published and measured nothing.** LI-001 went out on 19 October and produced **no tagged
   arrival**. LI-007 and ART-001 produced none either. Qualified Evaluation Rate is **undefined, not zero** — the
   denominator is empty. X-001's slot has passed and its copy was never approved.

The single most consequential fact across all five workstreams: **three published posts have produced zero tagged
arrivals.** That is one finding about link placement or channel mechanics, not three failures, and it is worth more
than any further content until it is understood. The project's own rules forbid inventing a number to fill the gap,
so the honest state is "instrument before publishing again".

### What is objectively true on `72770976`

| | Value | Read from |
| --- | --- | --- |
| Versions **in the repository**, on `b8cfba9` | ui 0.25.0 · tokens 0.25.0 · cli 0.25.0 · angular 0.26.0 · iot 0.5.0 | `packages/*/package.json` |
| Versions **published to npm**, read 2026-10-23 | ui 0.24.0 · tokens 0.24.0 · cli 0.24.0 · angular 0.25.1 · iot 0.5.0 — **the publish had not completed** | `registry.npmjs.org` |
| Unreleased changesets | **0** — `.changeset/` holds its README alone after #348; **7** IoT changesets still held in `.changeset-held/iot/` | directory listing on `b8cfba9` |
| Catalogue | 109 entries; React 109 · Angular 80 (+2 equivalent, 27 planned) · SwiftUI 90 · Compose 90 · Flutter 90 | `platform-parity.json`, `check:angular-graduation` |
| Angular graduation | **7 of 13 criteria met today**; 6 open. The **12 of 13** figure elsewhere in this file is a *projection* after P1+P2 land, never a current reading | `node scripts/check-angular-graduation.mjs`, re-run 2026-10-22 on `72770976` |
| Evidence levels | React 61 build / 48 headless / **0 runtime** · Angular 20 headless / 60 runtime · SwiftUI 90 build · Compose 86 build / 4 headless · Flutter 85 build / 5 headless | `verification.json` `componentLevelTotals` |
| Native publication | **none.** Not on SPM, Maven or pub.dev; the publish workflows have never run for a real release | `verification.json` `published` = 0 for all three |
| Motion roles | 5 `proven` · 2 `observed` · 1 `proposed` · 1 (`loop`) proven with no consumer list. #441 would move `selection-indicator` to `observed` with its first consumer — **in a draft PR, not on `main`** | `tokens/contracts/motion.json` |
| Open PRs | **15** substantive + 10 Dependabot (2026-10-22) | integration register, refreshed above |
| Posts published to date | 9 of 17 distribution rows; 4 planned, 4 community rows blocked | `marketing/distribution/register.json` |
| Tagged arrivals from the last three posts | **0** | `/mnt/project-files/integration/`, PR #436 |

---

## 2. The five workstreams

Each has its own report in this directory. Names are preserved from the plans that created them — no workstream was
renamed and no phase was renumbered.

| | Workstream | Report | Phase vocabulary in use | Health |
| --- | --- | --- | --- | --- |
| **WS1** | Marketing, growth, distribution, adoption measurement | `/mnt/project-files/roadmap-master/WS1-MARKETING.md` | M1–M4 (ops), days 1–30/31–60/61–90 (strategy), campaign 1–4 | **blocked on measurement, not on content** |
| **WS2** | Engineering, release reliability, cross-platform maturity | `/mnt/project-files/roadmap-master/WS2-ENGINEERING.md` | R1 (release), ENG-2b-*, gates 0–7 | **ready, waiting on one owner decision** |
| **WS3** | UI/UX quality, website, accessibility, visual direction | `/mnt/project-files/roadmap-master/WS3-UIUX.md` | F-01…F-35, CAT-BUG-001…020, AE-1/AE-2A/AE-2B, visual slices 1–4 | **evidence-rich, delivery-light** |
| **WS4** | Components, blocks, API quality, platform coverage | `/mnt/project-files/roadmap-master/WS4-COMPONENTS.md` | Business capability phases 0–10, BD-W1…W5, CAT-2…CAT-6, Angular waves A–C3 | **Angular is the critical path** |
| **WS5** | Animation, interaction feedback, canonical motion contracts | `/mnt/project-files/roadmap-master/WS5-MOTION.md` + [`MOTION-COVERAGE-REGISTER.md`](MOTION-COVERAGE-REGISTER.md) | MX0–MX4, MX1a/b-1a/b-1b/b-1c/b-2/d, G1–G12 | **web strong, native untested** |

### Completed versus outstanding, at a glance

| Workstream | Completed and merged | Outstanding on `main` | In flight (PR) | Deliberately paused |
| --- | --- | --- | --- | --- |
| WS1 | M1 #398, M2 #405, M3 #406, M3.1 #409, M4 #410, LI-001 pre-publication record #429 | LI-001 close-out; measurement of why three posts yielded nothing; X-001 approval + slot | #436 (draft) | COM-001…004 community rows (rules gate); `/blog` (needs ≥3 off-site articles) |
| WS2 | ENG-2b-4 #401, ENG-2b-5 #407, R1 iot exclusion #415, BD-W5 consumer gates #408, **R1 #348 merged `b8cfba9`** | **the publish itself — refused by `release:preflight`, recoverable by one dated line**; native publication to SPM/Maven/pub.dev | #427 | Dependabot #417–#426 (**the freeze holds** until R1 is published and verified) |
| WS3 | evaluator track A #347, track B #350, web quality #369, homepage #370, footer #432/#435, homepage overlay fix #438, **128px docs column #444** | CAT-BUG-001…005, 009, 011, 014, 015, 017…020; F-07 maturity vocabulary | #428, #413, #439 (direction approved, waits behind R1), #433/#437/#434 | CAT-3 thumbnails, AE-2B (both held by Ziad) |
| WS4 | capability phases 0–2 foundations (#376, #378), BD-W1…W5 (#377, #389, #394, #395, #397, #399, #403, #408), Angular waves A–C3, field shapes #402 | 27 planned Angular entries; 6 open graduation criteria; capability phase 3 not started | #430 (taxonomy decided 2026-10-22, now based on `main`); BD-W6 boarding-pass block approved, unimplemented | IoT (real-device evidence); Pro tier (research only) |
| WS5 | MX1a #393, MX1b-1a #396, MX1b-1b #400, MX1b-1c #404, MX1b-2 Angular #416 | G3, G5, G6, G7, G11, G12; feedback-entry role; overlay motion gate; native rendered evidence | #411, #412, #414; #441 (draft, rebases onto MX1d) | G2 (settled: stagger stays untokenised) |

---

## 3. Dependencies and integration risks

### 3.1 The dependency spine

```
#348 MERGED b8cfba9 ──> Release run FAILED at release:preflight ──> NOTHING published
       └─> one-line releases.ts date + Ziad's approval + a SAME-UTC-DAY merge ──> publish
                     ├─> #427 release-note gate ──> all later PRs judged by `build`
                     ├─> Dependabot #417–#426 stay frozen until then: any push to main re-runs release.yml
                     └─> #436 LI-001 close-out can be marked ready
                              └─> WS1 measurement checkpoints T+24h / T+7d become readable

#411 SwiftUI ──> #412 Compose ──> #414 Flutter      (sequential; regenerate platform-parity.json at step 3)
       └─> native rendered evidence needs a CI runner decision (D4) that does not exist yet

#428 CAT-QF ──> #430 CAT-2 taxonomy ──> #413 CAT-1 audit   (reconcile the 3 docs files once, at #413)
       └─> #428 is contained in #430, so this order costs #430 no reconciliation at all
       └─> CAT-2 taxonomy DECIDED 2026-10-22 (8 categories, `tag` -> Data Display) ──> CAT-3…CAT-6 unblocked

#411 -> #412 -> #414 (MX1d) ──> #441 Tabs motion presets rebases onto them
       └─> all four touch tokens/contracts/motion.json; #441 also owes a changeset once R1 closes

MX1 (merged) ──> Angular reducedMotion for 5 components ──> 2 of 6 open graduation criteria
Angular `timeline` rtl+largeText AND `toggle` rtl ──> 3 of 6 open graduation criteria
       └─> `timeline` alone closes only the two largeText criteria: the rtl row needs BOTH components
27 planned Angular entries ──> the 6th criterion ──> Preview → Stable is *not* reachable this quarter
```

### 3.2 Integration risks, named

| # | Risk | Why it matters | Mitigation that exists |
| --- | --- | --- | --- |
| **IR-1** | Merging #348 **is** the npm publish (`release.yml` on push to `main`) | **Realised 2026-10-22: #348 merged and the release was refused.** `release:preflight` held the line precisely because the step is irreversible — a stale release-note date would have shipped publicly | the gate worked. What remains is a dated line, an approval, and a same-UTC-day merge |
| **IR-2** | **Any push to `main` re-runs `release.yml`** — before the merge it also force-pushed #348 to a new head and killed its approved runs | **Not closed.** It cost two approval windows on 2026-10-21, and until R1 publishes, every merge is another release attempt against a date gate that only passes on the day the notes carry | the freeze on merges, Dependabot included, holds until R1 is published **and verified against the registry** |
| **IR-3** | `ci.yml` is `pull_request: branches: [main]`, so a PR based on a feature branch gets **no `build` and no CodeQL at all** | #430 and #434 went days without their required check ever running | both retargeted to `main` on 2026-10-21; #430 now has a genuine `build` failure, which is the system working |
| **IR-4** | Three parallel chains (native, footer, catalogue) and #439 all touch overlapping trees | the conflict matrix was measured with each chain starting from `main`, which is not the state that will exist | re-measure gates 3–5 after gate 2 lands |
| **IR-5** | `verification.json` reads as "verified" to a casual reader, and React now shows **0 runtime** against Angular's 60 | A reader can conclude the Preview platform is better verified than the reference one | the evidence-tier doc states what each level means; the figure needs an owner decision (D-7 below) |
| **IR-6** | Marketing cannot learn anything until the attribution question is answered | Publishing more content against a broken or mis-placed link produces more zero rows | M4 post-publication checklist; #436's T+24h/T+7d checkpoints |
| **IR-7** | Native "stable" maturity with near-zero native interaction evidence, and no published artifact | The strongest claim in the product has the weakest evidence | Phase 5 of the product roadmap; `published` = 0 is recorded honestly |
| **IR-8** | This document could itself become a competing roadmap | §0's rule: it indexes, it does not own | every subject names its owning document |

### 3.3 Documented gaps that a green CI does not cover

Every gate named in this file can pass while each of these is true. They are listed so that **"CI is green" is
never read as "the experience is complete"**, and each names the instrument that is blind to it.

| # | Gap | What is actually true | Why no gate catches it | Owning record |
| --- | --- | --- | --- | --- |
| **GAP-1** | Progress reduced motion, SwiftUI and Compose | `Progress.swift:34` animates on `.default`, `CircularProgress.swift:45` on `.easeOut(0.3)`, and both Compose ports drive their fraction through `animateFloatAsState`. **None carries a reduced-motion form.** | `KNOWN_GAPS` records it as *deferred*, and a deferred entry is an acknowledgement, not a check | `scripts/native-motion-spec.mjs`; register §3 (`!` cells) |
| **GAP-2** | Native overlays animate nothing | `Drawer.swift`, `Drawer.kt` and `drawer.dart` contain **zero animation calls**, as do AlertDialog, Popover, Tooltip, HoverCard and the menu family on all three native platforms | `check:native-motion` flags a file that *animates* and belongs to no family. A file that animates nothing passes silently and never reaches `KNOWN_GAPS` | register §4; **the instrument's largest blind spot** |
| **GAP-3** | No native rendered-motion evidence beyond Flutter | Flutter's widget tests do read rendered intermediate values; SwiftUI's suite states in its own header that nothing in it renders, and Compose's asserts a node *exists* after a click, which is state, not a midpoint | `scripts/evidence-levels.mjs` lists `chromium` as the only runtime environment, so **no native cell can reach `runtime`** however much is added | register §4; owner decision **D-6** |
| **GAP-4** | React holds **0** `runtime` evidence cells against Angular's **60** | Correct under the ladder — it needs interaction *and* accessibility both observed in a runtime environment, and React's interaction tests are jsdom | the ladder is working as designed; the defect is that a reader sees the reference platform ranked below Preview | owner decision **D-7** |
| **GAP-5** | No pending or loading state on any action control, on any platform | No `Button`, submit control, menu item or form on any of the five platforms has one; a search for `isLoading\|loading\|aria-busy\|pending` across every platform package comes back effectively empty | nothing asserts the *presence* of a state, only the correctness of states that exist | `/mnt/project-files/phase-b-states/STATE-COMPLETENESS-MATRIX.md` §3.1 |
| **GAP-6** | `aria-required` appears **zero times** in the React catalogue | `Label`, `Field` and `Form` have no way to mark a control required | axe cannot fault a missing `aria-required` on a control nobody declared required | same matrix, line 103; work package WP covering `required?` on `Field` |
| **GAP-7** | `check:contrast` gates one status tint of four | it measures the info status on a muted surface and not the other three, and it measures token pairs rather than rendered states | a token-pair gate cannot see a state it was never given a pair for. It is **green on current `main`**, which is exactly the point | `/mnt/project-files/phase-b-states/SEMANTIC-VARIANT-TOKEN-GAPS.md` |
| **GAP-8** | Angular's disabled **anchor** form is not disabled | the anchor is dimmed in `styles.css` but still focusable and still activates by keyboard | CSS-only disabling leaves the semantics untouched, and no gate asserts an anchor's keyboard behaviour | same work packages, WP-8 |

Two more that are recorded elsewhere and are not reopened here: **G1** (frozen) and the 17 hero
`color-contrast` *incomplete* nodes that remain after both the lattice and the glow are gone, which belong to the
`.kx-edges` rules and are outside #439.

---

## 4. Parallel work that can start immediately

Work that depends on **no** owner decision, **no** merge and **no** other workstream. All of it is new-file or
new-branch work that cannot collide with the thirteen open PRs (verified against the conflict matrix).

| # | Workstream | Slice | Why it is safe now |
| --- | --- | --- | --- |
| **P1** | WS4 | **Angular `timeline` RTL and large text, plus `toggle` RTL.** Closes 3 of 6 open graduation criteria — the rtl row is 22/24 and needs *both* components, so `timeline` alone closes only the two largeText criteria | touches `packages/ui-angular` + `scripts/angular-browser.mjs` + regenerated `verification.json`; no open PR touches that trio. Unowned since #392 §7 row 6 |
| **P2** | WS5 | **Angular `reducedMotion` for checkbox, radio-group, tabs, toggle, toggle-group.** Closes the other 2 criteria + 2 roadmap rows | the Angular selection work merged (#416); the gate `check:angular-selection-motion` exists. Touches `scripts/` + `packages/ui-angular` |
| **P3** | WS5 | **Give the feedback-entry role a home**: add a role to `tokens/contracts/motion.json` for Sonner/Alert/Banner appearing, or record each as static by design | blocked only by the MX1d chain's conflict on that one file — so do it **after gate 2**, or as a decision note now |
| **P4** | WS1 | **Attribution diagnosis** for the three zero-arrival posts: re-derive the tracked URL for LI-001, LI-007 and ART-001 from the live posts, confirm the `utm` quartet survives each channel's link handling, and write the finding | reads PostHog and the live posts; writes only to `marketing/measurement/`. Publishes nothing |
| ~~**P5**~~ | WS3 | ~~The 128px docs column at 1280px with 200% text~~ — **delivered 2026-10-23 as #444**, by the *Discovery to adoption UX fixes* thread. Kept here struck through rather than deleted, so the slice list reads as a record | n/a |
| **P6** | WS5 | **G7 Progress logical fill, measured in RTL first.** Measure before changing, per §10 of the project rules | `packages/ui` Progress + a new RTL probe; untouched by open PRs |
| **P7** | WS2 | **Native publication *documentation***: state the pin-a-commit path and that SPM/Maven/pub.dev carry nothing. F-01's docs half | docs only; the publish decision itself is an owner call |

**P1 and P2 together close 5 of Angular's 6 open graduation criteria.** The sixth (27 planned entries) is a
catalogue programme, not a slice — so Angular **cannot** graduate this quarter, and saying so is more useful than
counting down.

---

## 5. Next actionable phase, per workstream

| | Next phase | Entry condition | Exit condition |
| --- | --- | --- | --- |
| WS1 | **M5 — attribution diagnosis and re-instrumentation** (new, replaces "publish X-001 next") | none; starts now | the mechanism behind three zero-arrival posts is named with evidence, and the next post's link is verified end-to-end before it goes out |
| WS2 | **R1 recovery, then gate 1** | **Ziad's approval of the one-line `releases.ts` date**, merged the same UTC day | four packages **visible on npm** at 0.25.0/0.25.0/0.25.0/0.26.0, the `Release` run green, `check:releases` agreeing, #427 landed after it. Until the registry shows them, the release is merged and unpublished |
| WS3 | **CAT-QF → CAT-2 → CAT-1 landing, then CAT-4** | R1 closed; CAT-2 taxonomy decision (E1/E2) | the 6 VERIFIED CAT-BUGs closed with rendered before/after evidence and a gate that catches each |
| WS4 | **Angular graduation closure (P1 + P2), then capability phase 3** | none for P1/P2; phase 3 needs phase 2's AmountDisplay (shipped) | **projected** graduation at 12 of 13 criteria (today's reading is 7 of 13) with the 27 planned entries the only open one |
| WS5 | **MX1d landing, then MX2a (Progress logical fill) and MX3a (Menubar exit + Angular floor)** | gate 2 of the merge sequence | the native selection cells move from ○ to m with a recorded ceiling, and no cell claims runtime |

---

## 6. Owner decisions this roadmap needs

Decisions **not** already on the sibling thread's E1–E12 list. That list owns release, taxonomy, publication slots
and art direction; these are roadmap-shaped.

| # | Decision | Recommendation |
| --- | --- | --- |
| **D-5** | ~~Does marketing publish again before the attribution finding exists?~~ | **Decided by Ziad, 2026-10-22 00:32 UTC: no.** X-001, LI-008 and X-008 hold until C1, C2 or C3 in `M4-READER-PATH-TEST.md` lands, and a placement correction is tried before anything is built. The recommendation stood; the decision is now his and this row is closed |
| **D-6** | **Native UI tests in CI** — macOS runner for SwiftUI, Android emulator for Compose (this is #392's D4, still open) | Start with **one platform and one component**: Switch on Compose, where the emulator is cheapest. Without it, no native cell can ever reach runtime |
| **D-7** | **React's 0 runtime cells against Angular's 60.** Correct under the ladder, misleading to a reader | Do **not** change the ladder. Either promote React's interaction evidence by running a browser interaction pass, or show the environment beside the level on `/docs/platforms`. Changing the rule to flatter the reference platform is the one option to refuse |
| **D-8** | **One public maturity vocabulary** (F-07: three vocabularies today, native "Experimental" hidden in a `<details>`) | Adopt the audit's proposal: *Package* (Published / Source-only), *Platform status* (Stable / Preview), *Verification* (Beta / Experimental), shown inline rather than nested |
| **D-9** | **Native publication**: run the publish workflows, or document git pinning as the supported path | Document pinning now (P7), publish later. A first real publication of three unversioned native packages is a release event of its own, not a side effect |
| **D-10** | **Pro commercialization** | **Keep it a research item.** `marketing/STRATEGY.md` rule 7 already keeps Pro-candidate rows off the site, and the capability roadmap's phase 10 already says "only with an owner decision that a Pro tier exists at all". Nothing in this roadmap changes that, and no engineering work should be shaped by it |

---

## 7. 30 / 60 / 90-day recommendations — **proposals, not commitments**

These do **not** replace `marketing/roadmap.md`'s own 30/60/90 (which is WS1-only and stays authoritative for
marketing). This is the cross-workstream version, and every line is a proposal Ziad has not agreed to.

### Days 1–30 (proposal) — close what is open, diagnose what is dark

| WS | Proposed | Measurable acceptance |
| --- | --- | --- |
| WS2 | R1 published; gates 1–7 executed in order | four packages live at the stated versions; `check:releases` green; 10 Dependabot PRs resolved |
| WS1 | attribution finding written; next post's link verified before posting | a named mechanism with evidence; one post with a non-zero tagged arrival **or** a documented reason the channel cannot carry one |
| WS4 | P1 + P2 land | `check:angular-graduation` moves from today's 7 of 13 to 12 of 13 |
| WS3 | #428 → #430 → #413 land; CAT-4 starts | 6 VERIFIED CAT-BUGs closed, each with a gate and a negative control |
| WS5 | #411 → #412 → #414 land | the register's native selection cells move ○ → m; no cell claims runtime |

### Days 31–60 (proposal) — make the native claim real, make the site honest

| WS | Proposed | Measurable acceptance |
| --- | --- | --- |
| WS5 + WS2 | **first native runtime evidence**: one platform, one component, on a simulator or emulator in CI (D-6) | a `runtime` cell exists on a native platform, earned by `scripts/evidence-levels.mjs` without changing the rule |
| WS3 | D-8 maturity vocabulary shipped (the 128px docs column is done, #444) | one vocabulary on every public surface, with a guard |
| WS4 | capability phase 3 first slice: **DataGrid RTL pinning** (`left`/`right` → start/end) | the RTL contract defect is fixed before the component is extended, with a negative control |
| WS1 | SEO landing pages per `marketing/roadmap.md` days 31–60, **only if** the attribution finding cleared | first non-brand organic entry recorded |
| WS5 | G5 Angular global floor + G6 Menubar exit | both gaps closed with rendered evidence; G-numbers retired, not renumbered |

### Days 61–90 (proposal) — depth over breadth

| WS | Proposed | Measurable acceptance |
| --- | --- | --- |
| WS5 | overlay motion gate: add overlay cases to `motion-states.mjs`; promote `overlay` from `observed` to `proven` honestly, or record why not | `check:motion-tokens` agrees without an exception |
| WS4 | the 27 planned Angular entries: a named tranche plan, not a count-down | a published tranche sequence with per-tranche acceptance criteria |
| WS3 | CAT-5 business block discovery; CAT-6 catalogue regression gates | every catalogue claim has a gate that fails when it is false |
| WS1 | first retention read (returning evaluators), **only if** the baseline window has data | a figure with its sample size stated, or an explicit "no baseline yet" |
| WS2 | native publication decision executed (D-9) | either three packages on their registries with versions, or a documented pinning path with a guard |

**What is deliberately absent from all three windows:** the custom icon system (roadmap item 26, not to interrupt
current work), IoT resumption (needs hardware), a Pro tier, and any Angular Preview → Stable graduation.

---

## 8. Acceptance criteria and evidence requirements

These are the standing requirements every slice in every workstream inherits. They restate the project's rules in
the form a PR description must satisfy, and they are the reason this roadmap can be handed to another session.

### Every PR states, and the reviewer can check

1. **Defect → root cause → fix**, with the root cause distinguished from a contributing factor and an innocent
   candidate. A suspicious-looking line is not a root cause until mutating it changes the measurement.
2. **What each instrument proves, narrowly.** jsdom proves logic, not layout. A source scan proves wiring, not
   rendering. A native unit test proves the helper's branches, not what a user sees on a device. A green build
   proves compilation, not behaviour.
3. **A negative control** for any new or changed gate: establish the broken baseline, fix, run the gate, restore
   the broken condition, prove the gate fails, restore the fix, prove it passes. Never commit the sabotage.
4. **Generators at a fixed point**: identify every derived artifact, run the generator chain, confirm no remaining
   diff. `build` does not imply generated artifacts are current — #430's red `build` is the live proof.
5. **Accessibility as a contract**, not cleanup: semantics, keyboard, focus entry and exit, visible focus,
   accessible naming, RTL, 200% text, reflow, reduced motion, disabled and selected states, announcements. Never
   fixed by shrinking text, hiding content, `overflow: hidden`, meaningless ARIA, extra tab stops or a broader axe
   allowlist.
6. **No exception removed to make a gate green.** An exception goes only when the defect is fixed, the normal gate
   passes without it, and a negative control proves the gate would have caught the original failure. A narrow
   exception is never replaced by a broader one.
7. **No verification counter inflated.** A marker is added only when the implementation earns it under
   `scripts/evidence-levels.mjs`. "Make the dashboard look better" is not a reason.
8. **Scope is one demonstrated problem.** Unrelated findings are recorded separately, never absorbed.

### Evidence vocabulary — these are different claims and never collapse

`source exists` · `implementation exists` · `builds` · `tests pass` · `rendered behaviour verified` ·
`accessibility verified` · `deployed` · `production verified` · `package published`.

### Workstream-specific evidence floors

| WS | A claim of this kind needs |
| --- | --- |
| WS1 | a live post URL supplied by the author, an exact time or an explicit "unknown", absolute counts only until the baseline window closes, and **never** a backdated or inferred figure. QER with an empty denominator is *undefined*, not zero |
| WS2 | for a release: current versions inspected, proposed versions inspected, pending changesets enumerated, the exact publishing set named, release CI verified, and the publication consequence stated explicitly |
| WS3 | a rendered measurement from a real browser at the stated width, text scale and direction. A repeatable metric only — `scrollHeight` on `/` is known **not** repeatable under RTL/reduced/200%-text, and axe contrast-*incomplete* counts are |
| WS4 | the manifest and the generated artifacts agreeing, and a platform claim backed by a required, unconditional CI step |
| WS5 | rendered intermediate behaviour, not the presence of a class or a token. Reduced-motion users reach the same end state. Source inspection never counts as runtime |

---

## 9. Next focused implementation prompt, per workstream

One prompt each, written so a fresh session can execute it without reading this whole document. Each is a bounded
slice with its own acceptance criteria, and none of them merges, publishes or pushes to `main`.

### WS1 — attribution diagnosis (M5)

> Three published posts — LI-001 (19 Oct), LI-007 (12 Oct) and ART-001 (13 Oct) — have produced **zero** sessions
> carrying their campaign tag, against a PostHog pipeline that is demonstrably live. Treat this as **one** finding
> about link mechanics, not three content failures. Do not publish anything, do not backdate anything, and do not
> estimate any figure.
>
> Re-derive each post's tracked URL from the live post as the author supplies it, and establish for each whether
> the `utm` quartet survives the channel's own link handling (LinkedIn's redirector, dev.to's referrer policy,
> X's `t.co`), whether the destination route exists and preserves the query, and whether the arrival-eligibility
> rule in `marketing/analytics.md` §4 would have counted an arrival that did occur. Where the body link goes to
> dev.to, state plainly that first-party analytics cannot follow it — that is a measurement boundary, not a
> failure. **Accept:** a named mechanism with evidence per post, a correction to
> `marketing/measurement/` recording it, and a go/no-go on the next slot. QER stays **undefined** until the
> denominator is non-empty, and the report says so in those words.

### WS2 — native publication documentation (P7, F-01 docs half)

> `verification.json` records `published: 0` for SwiftUI, Compose and Flutter, and the publish workflows have
> never run for a real release. The docs do not say so clearly, and they give no supported way to consume a native
> port.
>
> Document the **pin-a-commit** path for each native platform as the supported consumption route today, and state
> on each native docs page and in the README that nothing is on SPM, Maven Central or pub.dev. Do not run a
> publish workflow and do not change a package version. **Accept:** a guard in the existing
> `marketing-claims`-style test family that fails if a page claims native package availability while
> `verification.json` records `published: 0`, with a negative control; `check:distribution` green; no changeset.

### WS3 — the 128px docs column (P5) — **delivered as #444, 2026-10-23**

> This prompt is kept as a record of what was asked and is no longer work to do. The slice shipped on 2026-10-23
> as **#444**, from the *Discovery to adoption UX fixes* thread. The next WS3 slice is **D-8**, the single public
> maturity vocabulary (F-07): three vocabularies coexist on public surfaces today, and the decision is which one
> survives before any of them is enforced by a guard.

### WS4 — Angular graduation closure (P1 + P2, two PRs)

> `node scripts/check-angular-graduation.mjs` reports **7 of 13 criteria met today** (re-run 2026-10-22 on `72770976`). Five of the six open ones are two
> bounded slices. Ship them as **two** PRs, never one.
>
> **PR A:** the `rtl` row is 22/24 and misses **two** components, `timeline` **and** `toggle`; `largeText` is
> 26/27 and misses only `timeline`, for both the marker and the real-browser pass. **The slice must carry `toggle`
> RTL as well as `timeline`** — `timeline` alone closes the two largeText criteria and leaves `rtl` open at 23/24,
> which takes the total to 11 of 13, not 12. Add `timeline` to the `rtl` and `largeText` passes of
> `scripts/angular-browser.mjs` and `toggle` to the `rtl` pass, asserting logical geometry — for `timeline`, marker
> and connector on the start side under `dir="rtl"` — not merely that the attribute is set; fix any defect in
> `packages/ui-angular` rather than allowlisting it; regenerate with `pnpm gen:verification` and confirm the fixed
> point with `pnpm check:verification`, never by hand.
>
> **PR B:** Angular holds `reducedMotion` evidence for 3 of the 8 components React does; `checkbox`,
> `radio-group`, `tabs`, `toggle` and `toggle-group` are missing, both the marker and the real-browser pass. The
> Angular selection motion landed in #416 and `check:angular-selection-motion` already drives these components in
> Chromium — extend its reduced-motion legs to carry the evidence rather than adding a parallel gate.
>
> **Accept, both:** the graduation check moves to 12 of 13; a negative control per new assertion; Angular's
> `maturity` stays **`preview`** because 27 catalogue entries are still planned, and the PR description says so.

### WS5 — the feedback-entry role (P3)

> `tokens/contracts/motion.json` has no role for a notification appearing. Sonner, Alert and Banner animate in,
> which is motion with a trigger, a property and a purpose, and the contract is silent — which the project's own
> rules call out as the one unacceptable option.
>
> **Wait for gate 2 of the merge sequence**, because #411/#412/#414 conflict on `MOTION.md`,
> `tokens/contracts/motion.json` and `docs/roadmaps/MX1B-1C-SELECTION-PARITY.md`. Then either add a
> `feedback-entry` role with its tier, easing, reduced-motion form and consumers, or record each component as
> static by design with the reason. **Accept:** `check:motion-tokens` agrees without an exception; the role's
> status is `proposed` until it has a consumer and `observed` until it has a gate — do not write `proven`; the
> reduced form reaches the same end state; and a negative control proves the consumer check would fail if a
> consumer's `expects` no longer matched.

---

## 10. What this roadmap deliberately does not do

- It does not merge, publish, tag, push to `main` or approve a workflow run.
- It does not restate PR heads, check states or merge order — the sibling thread's registers own those.
- It does not renumber a phase, a wave, a G-number, an F-number, a CAT-BUG or an E-item.
- It does not reactivate **IoT** (paused for real-device evidence), **CAT-3** or **AE-2B** (both held by Ziad), and
  it does not start the custom icon system.
- It does not treat Pro commercialization as a product line. It stays a research item, and the Core/open-source
  architecture is unchanged.
- It does not let PR remediation postpone WS1, WS3 or WS5: §4 lists seven slices that need no merge and no
  decision.
