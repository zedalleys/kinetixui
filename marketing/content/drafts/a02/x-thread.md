---
id: a02
type: x thread
campaign: kx_count_isnt_coverage
status: drafted
link: https://kinetixui.com/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=kx_count_isnt_coverage&utm_content=x_thread
---

# a02 — X thread (8 posts)

Every post carries its own claim. Quote any one of them out of context and it
still says something true and complete — no "2/" cliffhangers, no fragments.

Numbers regenerate from `pnpm marketing:stats`. Re-run before posting.

---

**1/**

Our design system has 98 components.

I put that number on our homepage, and on its own it tells you almost nothing.

Here is what it hides.

---

**2/**

A catalogue count is almost always one platform's count.

Ours decomposes like this:

React 98
SwiftUI 90
Jetpack Compose 90
Flutter 90
Angular 31 · preview

"98 components" was really "98 on one of them."

---

**3/**

The honest cross-platform number is 90 of 98 — across the four platforms meant
to carry the whole catalogue.

Angular is not in that denominator, because its catalogue is intentionally
incomplete. Putting it there would flatter nobody and mislead everybody.

---

**4/**

Angular being at 31 is not a shortfall we are hiding.

It is real, it is compiler-backed in CI, and it is marked preview with
`catalogComplete: false` in the manifest the site reads from.

"Preview" is a claim too. It should be in the data, not just the copy.

---

**5/**

Availability is not maturity.

A component existing on a platform tells you someone wrote it. It does not tell
you the API has settled, and it does not tell you what has been tested.

Three different questions. We stopped answering them with one word.

---

**6/**

So we measure package maturity and verification separately.

Our React package is stable. The evidence behind the React catalogue is at
*beta* on our ladder: everything builds and passes accessibility checks;
interaction, RTL and visual evidence is still partial.

Stable package, beta verification. Both true.

---

**7/**

Eight of our 98 are not on all four. Those are not holes.

`combobox` is a documented composition, not a component.
`native-select` exists because each platform already wraps its own picker.

Counting deliberate decisions as gaps makes the number worse and the system
look better. That trade is backwards.

---

**8/**

If you are evaluating a design system, the component count is the least
interesting number on the page.

Ask: which platforms have implementations, which gaps are deliberate, and what
evidence stands behind each one.

Ours, per platform:
kinetixui.com/docs/platforms

---

## Notes

- 8 posts. 1 hooks, 2–3 distribution, 4 Angular, 5–6 the maturity split,
  7 deliberate gaps, 8 CTA.
- Post 4 and post 7 are the two most quotable in isolation — both make a
  complete argument without the thread.
- No platform is ranked. No competitor appears. Angular is never "only 31".

---

# a02 — standalone X posts

Four derivatives, deliberately different in kind. Post one at a time, days
apart. Each carries the campaign link only if it is the one being measured —
see `measurement.md`.

---

## S1 — numerical (`utm_content=x_numbers`)

98 components.

React 98
SwiftUI 90
Compose 90
Flutter 90
Angular 31 · preview

90 of 98 across the four platforms meant to carry the full catalogue.

The count was never the claim. The distribution is.

---

## S2 — principle (`utm_content=x_principle`)

A design system's component count tells you what exists.

It does not tell you:
— on which platforms
— which absences were decided
— whether the API has settled
— what has actually been tested

Four questions. One number cannot answer them, and it is usually asked to.

---

## S3 — checklist (`utm_content=x_checklist`)

Before you trust a design system's catalogue number, ask:

1. Ninety-eight of what, on which platforms?
2. Which gaps are deliberate, and where is that written down?
3. Is the *package* mature, or the *evidence*?
4. What breaks if the claim goes stale?

If 4 has no answer, 1–3 will drift.

---

## S4 — build-in-public (`utm_content=x_buildlog`)

We shipped a fifth platform and the homepage diagram still said "four."

Not a typo — a hard-coded array nothing checked. It had been wrong for weeks
while the number right next to it was generated and correct.

Now the diagram reads the same manifest as everything else. The lesson is
boring and keeps being true: a number nothing regenerates is a number that is
already drifting.

---

## Notes

- S4 is the only one that admits a mistake, and it is the most likely to travel.
  It is also true: the fan hard-coded its platform list until #213.
- S1 is the most quotable and the least explanatory — pair it with the thread,
  not alone, if engagement is the goal.
- None of the four repeat a01's parity-proof framing.
