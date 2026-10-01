---
type: x assets
month: first 30 days
status: finished copy. Which of these has published is recorded per asset in register.json and
  ../distribution/register.json, never restated here
---

# X — finished assets

Nine new assets (**X-003 … X-011**). Two threads already exist and are reused: **X-001**
(`drafts/a01/x-thread.md`) and **X-002** (`drafts/a02/x-thread.md`). Eleven in total.

Written for the medium. Where an asset shares an idea with a LinkedIn post or an article, it is a different
piece of writing about that idea, not a shortened copy — the register records the relationship.

**Re-run `pnpm marketing:stats` before posting anything with a number in it.**

---

## X-003 · P1 · Pillar C · Single post

**Campaign:** `kx_p1_c_manifest` · **Destination:** `/docs/platforms`

> A design system claim worth stealing:
>
> if a component says it supports SwiftUI, CI checks there is SwiftUI source. No source, no claim, build
> fails.
>
> First run caught one of ours claiming three native platforms with an implementation on none.
>
> The coverage numbers went down. Good.

---

## X-004 · NEUTRAL · Pillar B · Thread (5)

**Campaign:** `kx_p2_b_token_boundary` · **Destination:** `/docs/tokens` · **Visual:** VIS-003

> **1/** Design tokens have a boundary problem.
>
> They stop at the web.
>
> **2/** The usual pipeline: JSON → build step → CSS custom properties. Genuinely good. Solves the web.
>
> Then iOS needs the same numbers. Someone copies them into Swift. Android gets Kotlin. Flutter gets Dart.
>
> **3/** Three copies, made once, maintained never.
>
> Your "single source of truth" is now a single source of truth for one of four platforms.
>
> **4/** They don't drift from carelessness. They drift because nothing connects them. A value changed on
> the web has no route to a Kotlin constant.
>
> **5/** Fix is boring: treat native outputs as build artifacts, not files people edit. One source, a
> generator per target, generated files committed so the diff shows up in review.
>
> Change once, all four move in one commit.
>
> https://kinetixui.com/docs/tokens

---

## X-005 · P2 · Pillar A · Single post

**Campaign:** `kx_p2_a_drift` · **Destination:** `/docs/platforms`

> Cross-platform drift is not a discipline problem.
>
> Teams that care a lot still drift, because caring is not a mechanism.
>
> If the only thing keeping four platforms aligned is that everyone remembers to check, they diverge the
> first week someone is busy.

---

## X-006 · P1 · Pillar G · Thread (6)

**Campaign:** `kx_p1_g_dependency_list` · **Destination:** `/docs/installation` · **Visual:** VIS-004

> **1/** Our install command exited 0 and left people with a project that couldn't build.
>
> The bug class is more interesting than the bug.
>
> **2/** The CLI copies a component in and installs the npm packages it needs.
>
> That package list came from a generated registry file. The generator had two defects, and the second hid
> the first.
>
> **3/** Defect one: it matched dependencies against a hand-written list of package names.
>
> Defect two: it scanned only the component file — then attached a shared `utils.ts` ten lines later
> without scanning it.
>
> **4/** `utils.ts` imports two packages.
>
> So 91 of 97 components shipped a file whose dependencies they never declared. npm said success. The build
> said no.
>
> **5/** The fix was not to extend the list.
>
> A hand-maintained list cannot fail. It can only be incomplete — which is a quieter kind of broken.
>
> Deleted it. Derived imports from source. Computed deps from the full delivered file set.
>
> **6/** Deriving instead of listing immediately caught a second case the list could never have caught.
>
> When a check is a list of things to look for, the failure mode isn't a wrong answer. It's silence.
>
> https://kinetixui.com/docs/installation

---

## X-007 · P1 · Pillar D · Single post

**Campaign:** `kx_p1_d_partial_evidence` · **Destination:** `/docs/platforms`

> Replaced every green tick in our accessibility matrix with a fraction.
>
> "Has RTL support" tells you nothing about whether the component you need was tested.
>
> A fraction tells you the shape of the risk — including where ours is thin, and where it's zero.
>
> Worse-looking. Worth reading.

---

## X-008 · P2 · Pillar F · Thread (4)

**Campaign:** `kx_p2_f_two_trades` · **Destination:** `/components` · **Visual:** VIS-005

> **1/** "Cross-platform UI" means one of two things. Worth knowing which you're being sold.
>
> **2/** Option A: a runtime that draws your UI everywhere. One codebase, one implementation, a layer
> between you and the platform.
>
> Option B: separate native implementations agreeing on a contract. More code, no layer.
>
> **3/** Neither is a mistake. Different trades.
>
> The runtime buys one codebase and charges you at the edges — where a platform has an opinion your
> abstraction didn't anticipate.
>
> **4/** We took B. A SwiftUI view is a SwiftUI view. Angular is directives on real elements, not React in
> a bridge.
>
> Cost: five implementations, coverage not identical everywhere.
>
> We publish the gaps instead of hiding them.
>
> https://kinetixui.com/components

---

## X-009 · NEUTRAL · Pillar C · Single post

**Campaign:** `kx_neutral_c_copy_under_test` · **Destination:** `/docs/platforms`

> Our marketing copy is under CI.
>
> A stale platform list, a blanket parity claim, or an install command for a package you can't actually
> install — all fail the build.
>
> Sounds excessive until you remember which part of a project is least often checked against reality.

---

## X-010 · P2 · Pillar B · Single post

**Campaign:** `kx_p2_b_token_boundary` · **Destination:** `/docs/tokens`

> The reason teams don't adopt a design system isn't disagreement. It's that the smallest version of it is
> still a migration.
>
> So make a smaller one: take the token layer, keep every component you already have.
>
> On Flutter the theme adapter means stock widgets inherit the values. Nothing of ours in your tree.

---

## X-011 · P1 · Pillar A · Single post

**Campaign:** `kx_p1_a_denominator` · **Destination:** `/docs/platforms`

> If a cross-platform design system quotes you one coverage number, ask what the denominator is.
>
> Ours is four platforms, not five — one is a deliberate preview subset, and putting it in the denominator
> would make the other four look worse than they are.
>
> Stating that is part of the number.

---

## Publishing notes

- **Pacing:** 2–3 a week. Threads on weekdays, single posts any time.
- **Never post a thread and its LinkedIn sibling on the same day.** Same audience, same feed-adjacent
  attention, and the second one reads as a repost.
- **Replies are the channel.** The single posts are deliberately short enough to invite "how?" — answer with
  a link to source, not a pitch.
- **No hashtags.** They do nothing here and they cost credibility with this audience.
