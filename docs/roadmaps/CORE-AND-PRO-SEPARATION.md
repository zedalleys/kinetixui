# Core and Pro — the separation, as a draft

**Written:** 2026-10-23, post-R1 · **Baseline:** `origin/main` at `45cdaf11` · **Status:** a **draft for the
owner**, not a decision and not an announcement.

> **Pro does not exist.** Nothing in this repository is behind a paywall, no licence check exists, no row is
> `existing` and `pro` at the same time, and `scripts/gen-business-roadmap.mjs` refuses one that tries. "Pro
> candidate" is an internal planning label. This document does not create a tier; it writes down where a line
> *would* fall if one were drawn, so that the decision can be made once, on evidence, rather than drifting into
> place one component at a time.

This is a companion to [`KINETIXUI-MASTER-ROADMAP.md`](KINETIXUI-MASTER-ROADMAP.md) (owner decision **D-10**) and
it **does not supersede** [`docs/BUSINESS-CAPABILITY-ROADMAP.md`](../BUSINESS-CAPABILITY-ROADMAP.md) §2.3, which
owns the rules. Where the two differ, that file wins.

---

## 1. What is already decided, and is not reopened here

§2.3 of the capability roadmap carries four owner-approved rules. They are quoted rather than paraphrased, because
this draft's whole job is to add to them without quietly re-editing them:

1. **Never paywalled:** accessibility, reduced motion, RTL, dark mode and high contrast, security fundamentals,
   basic forms, navigation, overlays, the essential table, default motion, and truthful IoT state.
2. **Pro is decided by organisational value, not difficulty.** SeatMap is hard and Core; PivotTable is analyst
   tooling and a Pro candidate. The test: does it serve a team's *advanced* workflow (analysis, planning at scale,
   brand tooling) rather than a person completing a task?
3. **The boundary is drawn above what shipped.** Owner decision 2026-09-21: DataGrid stays Core; any Pro line sits
   above it — grouping with totals, pivoting, export, server models.
4. **Core never depends on Pro.**

Rule 3 is the one that protects users who already depend on the library: **a shipped capability does not move to
Pro.** The generator enforces it as an invariant — `a Pro row cannot be existing` — so the rule is not a promise,
it is a build failure.

### The eight Pro candidates, and what each sits above

All eight are `planned` and all are phase 10. Each names a Core row it sits above — and **not one of those Core
rows is `existing` yet.**

| Candidate | Family | Sits above | Status of what it sits above |
| --- | --- | --- | --- |
| DataGrid advanced — aggregation, multi-level grouping with totals, spreadsheet export, million-row server model, master/detail | Data & analytics | `DataGrid` | `partial`, phase 3 |
| PivotTable | Data & analytics | `DataGrid` | `partial`, phase 3 |
| GanttChart | Data visualization | `TimelinePlanner`, `DataGrid` | `planned` phase 8 (as an alias), `partial` phase 3 |
| Advanced workflow tooling (visual designer, simulation) | Workflow & approvals | `ApprovalFlow` | `planned`, phase 4 |
| GeofenceEditor | Maps, logistics & fleet | `Map controls` | `planned`, phase 7 |
| Gantt | Scheduling | `TimelinePlanner` | `planned` phase 8 (as an alias) |
| DependencyGraph | Project & work management | nothing named | — |
| Pro motion | Motion | `Core motion` | `partial` |

**Three things found in `docs/business-capabilities.json` while reading this, none of them about the Core/Pro line
itself:**

- **`GanttChart` and `Gantt` are two rows for one capability** — Data visualization and Scheduling, both Pro, both
  phase 10, with different `dependsOn`. One should be the other's alias or be removed.
- **`dependsOn` is unvalidated free text.** Across the whole file **58 distinct dependency names resolve to no
  row**, because the field mixes component primitives that are not capability rows (`Button`, `Card`, `Tag`) with
  real rows reachable only through a slash-joined alias — `TimelinePlanner` exists solely inside
  `Scheduler / AvailabilityGrid / TimelinePlanner`, which is why both Gantt rows point at a name that cannot be
  looked up. Nothing checks this, so nothing reports it.
- **`"—"` is the file's convention for "no dependency"**, used by `DependencyGraph`, `AmountDisplay` and
  `SignaturePad`. An em dash as a dependency *name* rather than an empty list is readable in the rendered table and
  unusable to any checker.

The second one matters to this draft specifically: **the feasibility test below cannot be applied by a script
while a dependency name does not resolve to a row.** All three belong in whichever slice next regenerates that
file, not in a documentation PR.

---

## 2. The gap this draft exists to close

**Rule 1 promises far more than any gate enforces.** The enforced floor is eight name patterns in
`scripts/gen-business-roadmap.mjs`:

```
Core motion · IoT * · RequestedState · StatusBanner · AppShell · OTPInput · FileUploader · Calendar
```

A row matching one of those cannot be marked `pro`. Everything else in rule 1's prose — accessibility, reduced
motion, RTL, dark mode, high contrast, security fundamentals, basic forms, navigation, overlays, the essential
table — is **unenforced**, because those are not row names. They are *properties that cut across every row*, and a
floor built from row names cannot express them.

The owner's directive of 2026-10-23 names two commitments explicitly: **foundational accessibility and platform
compatibility are never paywalled.** Neither is expressible in `CORE_FLOOR` as it stands. That is the gap.

### Proposed: state the floor as properties, and gate it

Rather than lengthening a list of names, the floor should say what can never be sold, and the generator should
check *that*:

| # | Never paywalled, as a property | Why it cannot be a Pro feature |
| --- | --- | --- |
| **F1** | **Accessibility of anything that ships.** Accessible name, role, keyboard operation, focus visibility, announcement, contrast, reduced motion, forced colours. | A paid accessibility tier means the free tier ships a product that excludes people. There is no version of that which is acceptable, and the evidence ladder exists to prove the floor, not to price it. |
| **F2** | **Platform compatibility.** That a component works on the platforms it claims — RTL and logical layout, dark mode, text scaling to 200%, touch and pointer, the five platform targets it declares. | A claim is either true or it is not. Charging for the true version makes the published claim a lie. |
| **F3** | **Correctness and security fundamentals** of a shipped capability: it does what it says, and input handling is not a hazard. | Nobody may be charged for a bug fix. |
| **F4** | **The task-completion path.** Basic forms, navigation, overlays, the essential table, default motion, truthful IoT state — a person completing one task, which is rule 2's own line. | This is rule 2 restated as a floor rather than a test, so it binds even where nobody is applying the test. |

**How a gate could hold F1 and F2** without inventing new data: both are already *measured* per component in
`verification.json` — `accessibility`, `rtl`, `largeText`, `reducedMotion` evidence, and `platform-parity.json`
for claims. So the rule a generator can enforce is: **no row may be `pro` whose Core counterpart's accessibility
or compatibility evidence would be reduced by the split**, and **no evidence dimension may be a Pro-only
dimension.** That is a real check, not a slogan, and it is the only part of this draft that would need code.

---

## 3. Proposed: how a Pro candidate earns prioritisation

Rule 2 decides **whether** something *could* be Pro. It says nothing about **when** anything should be built,
which is how a planning label becomes a backlog of eight phase-10 rows that nobody can sequence. The owner's
directive names the three tests to apply — demonstrated demand, maintenance cost, feasibility — so this draft
turns them into an intake with evidence requirements, in the same spirit as the evidence ladder.

| Test | What counts as evidence | What does **not** count |
| --- | --- | --- |
| **Demonstrated demand** | A named request from an identified user or team, a measured search or navigation signal on the site, an evaluator who stopped at its absence, or a block/recipe people are already assembling by hand. **At least two independent instances.** | A competitor having it. A sense that enterprises want it. A roadmap row's own existence. |
| **Maintenance cost** | The per-platform surface it adds, how many existing components it couples to, whether it needs a new dependency, and **what it would cost to keep accessible on five platforms** — stated as a number of components and gates, not an adjective. | "It's just a wrapper." |
| **Feasibility** | A named Core row it sits above that is already `existing`, and a rendered-evidence path: which gate would prove it works, in which environment. | A design. An API sketch. |

**A candidate is not ready while the Core row beneath it is not `existing`.** On that test **none of the eight is
ready today**: four sit above `partial` rows (`DataGrid` three times, `Core motion` once), two above `planned`
rows, two above a name that does not resolve to a row at all. So the honest answer to "when is Pro?" is **after
Core is complete enough that the line is obvious** — which is what the capability roadmap's phase 10 already says.
This draft agrees with it and adds the evidence bar.

### Today's reading of the eight

None has two independent demand instances recorded anywhere in this repository. That is not an argument that the
demand is absent; it is that **nobody has been collecting it**, which is the cheapest thing on this page to fix.

> **Proposed first step, needing no decision about Pro at all:** record demand where it appears. The evaluator
> journey work, the Cmd-K search projection and the use-case hub already observe what people look for. A capability
> row gaining a `demand` field with dated, sourced instances would, within a quarter, answer a question that is
> currently answered by intuition.

---

## 4. What this draft deliberately does not do

- **It does not fragment the architecture.** No package split, no `@kinetixui/pro` namespace, no licence check, no
  build flag, no entry point that behaves differently by tier. The Core/open-source architecture is unchanged, and
  rule 4 means a Core consumer never needs to know a tier exists.
- **It does not move anything that shipped.** Rule 3, enforced by the generator.
- **It does not price anything**, name a plan, or assume the answer is a subscription. "Pro" names a capability
  boundary here, not a business model; support, hosting, design tooling and services are different questions and
  are out of scope.
- **It does not announce.** Nothing here goes on the website, in a README, or in marketing copy until the owner
  decides there is a tier. A public hint of a paid tier changes how an evaluator reads the whole library, and that
  is an irreversible first impression.

---

## 5. What the owner is being asked

| # | Decision | Recommendation |
| --- | --- | --- |
| **D-10a** | Adopt **F1–F4** as the stated never-paywalled floor, replacing the prose list in rule 1 while keeping its content? | **Yes.** It loses nothing and says the two things the directive asks for in a form a gate can hold. |
| **D-10b** | Implement the F1/F2 generator check (no Pro-only evidence dimension; no split that reduces a Core row's accessibility or compatibility evidence)? | **Yes, as a small slice.** It is the only code this draft implies, and without it rule 1 stays unenforced for everything but eight names. |
| **D-10c** | Adopt the demand / cost / feasibility intake, with the two-independent-instances bar? | **Yes**, and start the cheap half now: record demand as it appears, whatever is later decided about a tier. |
| **D-10d** | Does a Pro tier exist at all? | **Not yet, and not a question to answer this quarter.** No candidate sits above a shipped Core row, Angular is still Preview at 7 of 13, and no native platform is published. The answer costs nothing to defer and a great deal to get wrong early. |

**D-10 as it stood — "Pro stays a research item; the Core/open-source architecture is unchanged" — is unchanged by
this draft.** What this adds is the floor stated so it can be enforced, and a bar a candidate must clear before it
competes for anyone's time.
