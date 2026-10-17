# Product roadmap: motion, components, business discovery and adoption

**Written:** 2026-10-17 · **Baseline:** `main` at `a6019a1` (#389) · **Status:** plan, not a record of shipped work.

This document coordinates four workstreams so they can move in parallel without colliding:

| | Workstream | Existing plan it builds on |
| --- | --- | --- |
| A | Component quality and interaction maturity | [`ANGULAR-GRADUATION.md`](../../ANGULAR-GRADUATION.md), `verification.json` |
| B | Motion foundations and cross-platform animation | `tokens/primitives/motion.json`, the motion gates listed in §6 |
| C | Business discovery and workflow-based navigation | [`BUSINESS-CAPABILITY-ROADMAP.md`](../BUSINESS-CAPABILITY-ROADMAP.md) §6 (Business Discovery W1) |
| D | Documentation, marketing and adoption | [`marketing/roadmap.md`](../../marketing/roadmap.md), [`marketing/analytics.md`](../../marketing/analytics.md) |

It does not replace any of those. The business capability roadmap stays the source for *what* business capabilities
exist and in which phase; this document only orders the motion, discovery and adoption work around it. The marketing
roadmap and the Qualified Evaluation Rate definition (`marketing/analytics.md` §2–§3) are unchanged by it.

**How to read the status words.** *Shipped* means merged to `main`. *Evidence* means a marker in `verification.json`
earned by a test or a browser gate. *Source* means the files exist, nothing more. A row that says source is not a
claim that the behaviour works on that platform.

---

## 1. Naming

Two of the brief's labels collide with names already in use, so this roadmap uses:

| Brief | Used here | Why |
| --- | --- | --- |
| Motion phases / waves | **MX0–MX4** | IoT milestones already use M1–M5 (#308 … #375). |
| Discovery waves | **BD-W2 … BD-W5** | Continues Business Discovery W1; "Wave 3" is already the Website Dogfooding adoption audit. |
| Brief phases 0–8 | **Phases 0–8** below | Only used inside this document. |

## 2. Verified baseline (2026-10-17)

### 2.1 Repository

| Fact | Value | Source |
| --- | --- | --- |
| `main` | `a6019a1` — #389 block business metadata + `/blocks` filters | `git log` |
| Recently merged | #385 IoT sliders on library Slider · #386 speed-dial Fab example · #387 range Slider · #389 `/blocks` discovery | `git log` |
| Package versions on `main` | `@kinetixui/ui` 0.24.0 · `tokens` 0.24.0 · `cli` 0.24.0 · `angular` 0.25.1 · `iot` 0.5.0 | `packages/*/package.json` |
| Unreleased changesets | 13 in `.changeset/` (ui minor line incl. #387 Slider patch, Angular waves); IoT changesets held in `.changeset-held/iot/` | `.changeset/` |
| Catalogue | 109 entries; React 109 · Angular 80 · SwiftUI 90 · Compose 90 · Flutter 90 | `platform-parity.json` |
| Platform maturity | React stable · Angular **preview** · SwiftUI / Compose / Flutter stable (source; not published to SPM / Maven / pub.dev) | `platform-parity.json` `platformDefinitions` |
| Blocks | 21 (13 cited by shipping capability rows, 8 in `discovery.unclassifiedBlocks`) | `blocks.manifest.json`, `docs/business-capabilities.json` |
| Discovery data | 8 domains (pages: commerce, travel-booking) · 15 capability groups · 4 workflows (checkout, flight-booking, money-transfer, device-pairing) | `docs/business-capabilities.json` `discovery` |
| Angular graduation | 9 of 13 criteria met; open: 27 entries still planned, `timeline` missing `rtl` and `largeText` (both kinds, incl. browser) | `node scripts/check-angular-graduation.mjs` |

### 2.2 Evidence totals

From `verification.json` `totals`. These are evidence markers, not component counts, and `visual` is 0 everywhere
because rendered visual gates are tracked by `scripts/visual-gates.mjs`, not by this file.

| | build | interaction | accessibility | rtl | largeText | reducedMotion |
| --- | --- | --- | --- | --- | --- | --- |
| React | 109 | 48 | 109 | 36 | 39 | 3 |
| Angular | 80 | 80 | 80 | 47 | 53 | 23 |
| SwiftUI | 90 | 0 | 0 | 0 | 0 | 7 |
| Compose | 90 | 7 | 6 | 1 | 0 | 7 |
| Flutter | 90 | 6 | 5 | 58 | 58 | 7 |

The native columns are the honest gap: 90 components build on each native platform, but almost none carry
interaction or accessibility evidence. Section 5 is planned around that.

### 2.3 Open pull requests (checked 06:40 UTC)

| PR | What | State | Owner |
| --- | --- | --- | --- |
| #388 | React SegmentedControl inverse fill + travelling Tabs indicator | draft; build green; one of two `axe` runs failed on head `70d68a7` | Segmented tabs restyle thread |
| #390 | Angular SegmentedControl forced-colours selection | draft; all checks green | same thread |
| #391 | Hold the Angular consumer's optional vitest peer at 4.1.11 | draft; all checks green | CI fix |
| #348 | Version packages (changesets) | open; **not touched by this roadmap** | release |
| #325 | IoT M4C-A harness | superseded by #342; **not touched** | — |

### 2.4 Work in flight elsewhere (do not duplicate)

| Work | Where |
| --- | --- |
| React Tabs / SegmentedControl motion and fill | #388 |
| Angular SegmentedControl forced colours | #390 |
| **MX1 motion foundation and selection interactions** (first PR: MX1a) | "MX1a motion foundation" thread, from Ziad's MX1 brief |
| BD-W3b1 Cmd-K Blocks + Use cases, then BD-W3b2 Use cases hub | "Use cases hub and global search" thread |
| Website Dogfooding Wave 3 adoption audit | its own thread |

### 2.5 Motion baseline

Verified in the Phase M0 audit (project file `motion-and-discovery-w2/01-MOTION-AUDIT.md`, re-checked on `a6019a1`):

- **One token source.** `tokens/primitives/motion.json`: durations `instant` 100 · `fast` 200 · `base` 300 · `slow`
  500 · `slower` 1000 ms; easings `linear`, `standard`, `enter`, `exit`, `emphasized`. Generated to CSS variables,
  the Tailwind preset, SwiftUI, Compose and Flutter; Angular reads the CSS variables.
- **The brief's candidate tiers do not match the shipped tokens.** It proposes `normal` 300 and `slow` 400; the source
  has `base` 300 and `slow` 500. Renaming or retiming is a breaking token change on five platforms and is an owner
  decision (D1 in §9), not something this roadmap does.
- **Reduced motion.** React: a global 0.01 ms floor in the preset plus explicit loop stops. Angular: per-component
  media blocks, no global floor. SwiftUI / Compose / Flutter: family helpers (disclosure, switch, loop; slide on
  SwiftUI only) reading the platform setting.
- **Gates.** `motion-contract.test.ts`, `check:motion` (Accordion, Collapsible, Switch midpoints), `check:loop-motion`,
  `check:native-motion` (with a `KNOWN_GAPS` ledger), `check:registry-motion`, Angular browser motion steps.
- **Known gaps** (G-numbers from the audit): G1 no default transition duration (about 24 components run Tailwind's
  untokenised 150 ms); G2 no stagger/delay tokens; G3 library `Chart` (Recharts) ignores reduced motion; G4 `/docs/tokens`
  still says `duration.instant` and `easing.enter/exit` are unconsumed (they are used 36 / 16 / 15 times in
  `packages/ui/src/components`); G5 Angular has no global floor; G6 Menubar has no exit animation; G7 Progress fills
  with a physical `translateX` (RTL unmeasured); G9 no per-component motion docs; G10 native ledger gaps; G11 no
  layout-transition policy; G12 gesture tokens unwired.

G1, G2, G4 and the token naming question now belong to the MX1 thread (§2.4). This roadmap lists them for
dependency purposes only.

## 3. Phases and dependencies

```mermaid
flowchart LR
  P0[Phase 0<br/>this roadmap] --> P1
  P1[Phase 1 stabilisation<br/>#388 · #390] --> MX1
  MX0[MX0 contract<br/>in MX1 thread] --> MX1[MX1 selection]
  MX0 --> MX2[MX2 continuous input]
  MX0 --> MX3[MX3 overlays]
  MX0 --> MX4[MX4 data and feedback]
  BD3a[BD-W3a /blocks facets<br/>merged #389] --> BD3b1[BD-W3b1 Cmd-K]
  BD3b1 --> BD3b2[BD-W3b2 Use cases hub]
  BD3b2 --> BD4[BD-W4 domain journeys]
  BD4 --> BD5[BD-W5 new blocks]
  MX2 --> BD5
  MX1 --> P5[Phase 5 native parity<br/>per component]
  MX3 --> P5
  MX1 --> P6[Phase 6 motion docs]
  BD3b2 --> P8[Phase 8 proof assets]
  MX1 --> P8
```

| Phase | Scope | Depends on | Status |
| --- | --- | --- | --- |
| 0 | Reconcile and plan (this document) | — | this PR |
| 1 | Finish #388 verification; #390 Angular forced colours | — | in flight, other thread |
| 2 / MX0 | Semantic motion contract, default transition tier, stagger/delay, reduced-motion and RTL rules, gates | owner decision D1 | in flight, MX1 thread |
| 3 / MX1–MX4 | Component animation waves | MX0 | MX1 in flight; MX2–MX4 planned |
| 4 / BD-W3b–W5 | Search, Use cases hub, journeys, new blocks | BD-W3a (merged) | W3b in flight; W4–W5 planned |
| 5 | Native parity, one component family per PR | MX1, MX3 contracts | planned |
| 6 | Motion and business documentation, live demos | MX1 | planned |
| 7 | Verification (applies to every PR) | — | standing |
| 8 | Marketing proof assets and adoption measurement | each milestone | standing |

## 4. Motion and component matrix (MX1–MX4)

Platforms: R React · A Angular · S SwiftUI · C Compose · F Flutter. **src** = source exists; **RM** = a
`reducedMotion` evidence marker in `verification.json`; **—** = not in the catalogue for that platform. Nothing here
claims runtime parity; see §5.

| Wave | Component | R | A | S | C | F | Trigger → property | Planned work | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MX1 | Tabs | src | src | src | src | src | selection → indicator inline offset + size | #388 (React); Angular / native after | `check:motion` midpoint, `selection-visual` |
| MX1 | SegmentedControl | src | src | src | src | src | selection → fill | #388, #390 | `selection-visual`, forced colours |
| MX1 | Switch | RM | RM | RM | RM | RM | toggle → thumb inline offset, track colour | verify RTL thumb direction everywhere | `check:motion`, `check:native-motion` |
| MX1 | Checkbox / RadioGroup | src | src | src | src | src | check → mark opacity / scale | decide whether any motion is warranted | `selection-visual` |
| MX1 | Toggle / ToggleGroup | src | src | src | src | src | press → colour | default-tier fix (G1) | motion-contract |
| MX1 | NavigationMenu | src | RM | — | — | — | open → content enter / exit | web only by design | `check:motion` |
| MX1 | TabBar / NavigationBar | src | src | src | src | src | selection → active indicator | follows Tabs contract | `navigation-visual` |
| MX2 | Slider (incl. range) | src | src | src | src | src | drag / key → thumb, range | value text, marks, vertical; native spoken value | a11y-browser, native tests |
| MX2 | Progress / CircularProgress | src | src | src | src | src | value → fill | logical fill (G7, measure first); native ledger gap | new RTL probe |
| MX2 | Tick / ruler picker | — | — | — | — | — | — | composition recipe on Slider, not a component | — |
| MX3 | Dialog, AlertDialog, Sheet, Drawer, Popover, Tooltip, HoverCard, Menu family | src | RM | src | src | src | open / close → opacity, translate, scale | Menubar exit (G6); Angular global floor (G5) | `overlay-visual`, `menu-visual`, `check:motion` |
| MX3 | Accordion / Collapsible | RM | RM | RM | RM | RM | expand → height | already gated; keep | `check:motion` |
| MX4 | Chart | src | — | src | src | src | mount → series draw | reduced motion for Recharts (G3) | new browser assertion |
| MX4 | Skeleton / Spinner | src | src | RM | RM | RM | loop | already gated on web by `check:loop-motion` | `check:loop-motion` |
| MX4 | Sonner, Alert, Banner | src | src / RM | src | src | src | appear → enter | no change planned until MX0 rules land | — |

**Per-component spec.** Every MX PR states, for each component it touches: interaction states · trigger · property ·
duration and easing token · interruption (retarget from the current value, no queued animations) · RTL (logical
properties, mirrored offsets) · reduced-motion form (same end state, instant or opacity only) · keyboard and
screen-reader behaviour (state changes are never delayed by motion) · test strategy (unit for logic, real browser for
geometry and timing, native tests for native behaviour).

## 5. Cross-platform parity matrix (motion behaviours)

Statuses: **V** implemented and runtime-verified by a gate · **I** implemented, not runtime-verified · **P** partial ·
**Pl** planned · **NA** not applicable.

| Behaviour | React | Angular | SwiftUI | Compose | Flutter |
| --- | --- | --- | --- | --- | --- |
| Motion tokens generated from one source | I (contract test checks class-string wiring, not runtime) | I (reads the CSS variables; no gate inspects computed values) | I | I | I (`flutter-tokens` test checks values) |
| Disclosure (Accordion / Collapsible) motion + reduced form | V (`check:motion`) | V (browser) | I (helper + unit tests) | I | I |
| Switch motion + reduced form | V | V | I | I | I |
| Loop stop under reduced motion | V (`check:loop-motion`) | P (spinner slows to 3 s by design rather than stopping; no global floor, G5) | I | I | I |
| Sliding selection indicator (Tabs) | Pl (#388) | Pl | Pl | Pl | Pl |
| Overlay enter / exit with directional easing | I (contract test checks tokens, not rendered timing) | I (the browser `reducedMotion` pass measures duration, midpoint and end state, not easing) | P (Dialog fade only, ledger) | I | I |
| Default transition duration on every transition | P (G1) | I | NA | NA | NA |
| Chart reduced motion | Pl (G3) | NA (no Angular Chart) | Pl | Pl | Pl |
| RTL-correct motion direction | P (Switch, Tabs in #388) | P (`rtl` evidence 47) | Pl | Pl | P (`rtl` evidence 58, layout not motion) |
| Runtime change of the reduced-motion setting | I (media query) | I | I (`@Environment`) | I (observer) | I (`MediaQuery`) |

Native rows are I at best because `check:native-motion` proves that each animating file references the platform
setting and that tests cover both directions; it does not render on a device. A native **V** needs a UI test on a
simulator or emulator, which is the first item of Phase 5.

## 6. Business-discovery matrix

| Wave | Slice | State | Gate | Depends on |
| --- | --- | --- | --- | --- |
| BD-W1 | Capability data, `/components` business filters, `/capabilities`, `/use-cases/{commerce,travel-booking}` | shipped (#377) | `check:capabilities` | — |
| BD-W2a | Tag blocks with business metadata; `unclassifiedBlocks` ledger | shipped (#389) | `check:capabilities`, `check:block-source` | W1 |
| BD-W3a | `/blocks` facets (q, cat, capability, domain, workflow, platform) | shipped (#389) | `check:blocks-discovery` | W2a |
| BD-W3b1 | Cmd-K groups for Blocks and published Use cases from a static projection | in flight | planned: search-projection tests, command-menu browser test | W3a |
| BD-W3b2 | `/capabilities` as the Use cases hub; page criteria for domains | in flight | generator criteria + negative controls; a11y-site | W3b1 |
| BD-W4 | Evidence-backed domain journeys (finance first if it meets the page criteria) | planned | `check:capabilities` refuses a page with nothing shipping | W3b2 |
| BD-W5 | New business blocks, only for composition gaps a journey exposed | planned | `check:block-source` (five platforms), `check:blocks` | W4, MX2 |

Rules carried forward: no second taxonomy (everything reads `docs/business-capabilities.json`); planned rows never
link to a component; Pro-candidate rows never reach the site (`marketing/STRATEGY.md` rule 7).

## 7. PR sequence

One work package per PR. Motion, discovery and native parity never share a PR.

| # | PR | Workstream | Owner | Blocked by |
| --- | --- | --- | --- | --- |
| 1 | **This roadmap** (docs only) | all | this thread | — |
| 2 | #388 finish, #390 | A / B | restyle thread | Ziad review |
| 3 | MX1a motion foundation, then MX1 component slices | B | MX1 thread | D1 |
| 4 | BD-W3b1 Cmd-K, then BD-W3b2 hub | C | use-cases thread | — |
| 5 | MX0d Chart reduced motion (G3) | B | unassigned | MX1a contract (to reuse its hook / rules) |
| 6 | Angular `timeline` RTL + large-text evidence (closes 3 of 4 open graduation criteria) | A | unassigned | — |
| 7 | MX3a Menubar exit (G6) + Angular global reduced-motion floor (G5) | B | unassigned | MX1a |
| 8 | MX2a Progress logical fill (G7), measured in RTL first | B | unassigned | — |
| 9 | MX2b Slider value text, marks, vertical (React), then native spoken value per platform | B / A | unassigned | #387 (merged) |
| 10 | Phase 5a: first native UI test (simulator / emulator) for Switch on one platform | A | unassigned | CI runner decision D4 |
| 11 | BD-W4 first journey | C | unassigned | BD-W3b2 |
| 12 | Phase 6 per-component Motion section on docs pages, generated from a motion spec | D | unassigned | MX1 |

## 8. Verification strategy

Every PR runs, and its description records, what applies of: `pnpm typecheck` · `pnpm lint` · the changed packages'
unit tests · real-browser gates for any layout, focus, keyboard or timing claim (`check:a11y-browser`, `check:motion`,
the visual gates, `check:large-text`) · RTL · reduced motion (same end state) · forced colours · 200 % text (the library
gates, `check:large-text` and Angular's `largeText` pass, scale the root font size; site pages use CDP
`Page.setFontSizes`) · light and dark · registry and manifest checks
(`check:manifest`, `check:registry-deps`, `check:registry-motion`) · generators at a fixed point · bundle delta for
runtime changes · a negative control for any new or changed gate · CI green · Codex review.

What each instrument proves is stated narrowly: jsdom proves logic, not layout; a source scan proves wiring, not
rendering; a native unit test proves the helper's branches, not what a user sees on a device.

**This PR** is documentation only. It changes no source, token, generator or gate, so the applicable checks are: the
file renders on GitHub (Mermaid included), every repository path it names exists, every number in §2 was read from
the file cited next to it on `a6019a1`, and CI stays green.

## 9. Marketing dependencies

The 30-day plan in `marketing/roadmap.md` and the Qualified Evaluation definition in `marketing/analytics.md` are not
changed. Each milestone produces proof that can feed it, but nothing is published or scheduled by this roadmap and no
publication status is implied.

| Milestone | Reusable proof | Fits |
| --- | --- | --- |
| #388 Tabs indicator | Before / after capture from the browser gate, reduced-motion end state | Campaign 1 ("prove parity"), X / LinkedIn short |
| MX1 motion contract | Token table across five platforms; negative-control story | dev.to article on motion tokens (follows ART-002's token-boundary theme) |
| BD-W3b Use cases hub | Walkthrough from "I build checkout" to blocks and code | LinkedIn, docs landing |
| Angular graduation progress | The executable graduation matrix | GitHub README, Angular audience |
| First native UI test | Evidence that a native claim is runtime-verified | Campaign 1 |

Measurement stays on the existing events. New discovery surfaces get attribution `source` values so existing link
and CTA events are counted; no new event is added without updating the arrival-event list the dashboard SQL encodes.

## 10. Risks and owner decisions

| # | Decision or risk | Recommendation |
| --- | --- | --- |
| D1 | Motion tier names and values: brief's `instant/fast/normal/slow` = 100/200/300/400 vs shipped `instant/fast/base/slow/slower` = 100/200/300/500/1000; and the default transition tier (`instant` or `fast`) | Keep shipped names and values; decide the default tier in the MX1 thread. A rename is a breaking change on five platforms. |
| D2 | "Industry" vs "Business domain" as the UI label | Decide before BD-W3b2 ships. |
| D3 | "Use cases" in the main navigation | Decide with BD-W3b2. |
| D4 | Native UI tests need macOS (SwiftUI) and an Android emulator (Compose) in CI | Start with one platform and one component; the cost is CI minutes. |
| R1 | Parallel threads editing the same files (`tabs.tsx`, `segmented-control.tsx`, the motion gates) | Ownership table in §2.4; later PRs merge `main` and rerun gates. |
| R2 | Unreleased `ui` minor line keeps growing (#376, #385, #387, #388 if merged) | Release is a separate, explicit decision; this roadmap publishes nothing. |
| R3 | `verification.json` markers read as "verified" by a casual reader | Docs keep the source / evidence / runtime-verified distinction (§5). |
| R4 | Native "stable" maturity with near-zero native interaction evidence | Phase 5 adds runtime evidence before any new native claim. |

## 11. Next executable PR

After this roadmap, the smallest independent slice that no other thread owns is **#6 in §7: Angular `timeline` RTL and
large-text evidence.** It closes three of the four open Angular graduation criteria (RTL parity, large-text parity, and large text from a real browser) with one component, touches neither
motion files nor discovery files, and is measurable.

Acceptance criteria:

1. Reproduce: `node scripts/check-angular-graduation.mjs` reports `rtl` 21/22 and `largeText` 26/27, with `timeline`
   the missing component in both.
2. RTL: add `timeline` to the `rtl` pass of `scripts/angular-browser.mjs` (live Angular in Chromium), asserting
   logical geometry (marker and connector on the start side under `dir="rtl"`), not only that the attribute is set.
3. Large text: add `timeline` to the `largeText` pass of the same script, the browser instrument the graduation
   check requires, and fix any defect it finds in `packages/ui-angular` instead of allowlisting it.
4. Regenerate `verification.json` with `pnpm gen:verification`, then confirm the fixed point with `pnpm check:verification`; never hand-edit it.
5. The graduation check then reports 22/22, 27/27 and 27/27 for those three rows, leaving only the planned-entries criterion open.
6. Negative control: temporarily remove the fix or the new assertion and show the gate failing; restore it.
7. Angular's `maturity` stays `preview`: 27 catalogue entries are still planned.
