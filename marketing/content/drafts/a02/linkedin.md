---
id: a02
type: linkedin
campaign: kx_count_isnt_coverage
status: drafted
link: https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_count_isnt_coverage&utm_content=li_primary
---

# a02 — LinkedIn (primary)

**242 words.** Every number regenerates from `pnpm marketing:stats`; re-run it
before posting and replace anything that moved. See `sources.md`.

---

Our design system has 98 components.

That number is on our own homepage, and on its own it tells you almost nothing.

Here is what it actually decomposes into today:

React 98. SwiftUI 90. Jetpack Compose 90. Flutter 90. Angular 31, in preview.

So "98 components" is really "98 on one platform." The honest cross-platform
figure is 90 of 98 on the four platforms that are meant to carry the whole
catalogue. Angular is deliberately not one of them yet — it is real and
compiler-backed, and its catalogue is intentionally incomplete.

Then there is a second question the count cannot answer: how much of that is
actually verified?

We track those separately, because they are different claims. Our React package
is stable. The evidence behind the React catalogue is only at *beta* on our
verification ladder — every component builds and passes accessibility checks,
but interaction, RTL and visual evidence is partial. Stable package, beta
verification. Both true at once.

And eight of the gaps are not gaps. `combobox` is a documented composition, not
a component. `native-select` exists because each platform already wraps its own
picker. Counting those as "missing" would make the number look worse and the
system look better.

If you are evaluating a design system, the count is the least interesting thing
on the page. Ask which platforms have implementations, which gaps are
deliberate, and what evidence stands behind each one.

Ours is published, per platform, here: kinetixui.com/docs/platforms

---

## Notes

- Opens with our own number used against itself — no competitor, no strawman.
- The count → distribution → verification → deliberate-gaps ladder is the whole
  argument; each rung is one short paragraph.
- No "all five platforms." No scorecard. Angular is named as preview at its real
  figure, never as unsupported and never as parity.

---

# a02 — LinkedIn (alternative)

**A different post, not a re-headline.** The primary uses our own number against
itself. This one hands the reader a checklist they can run against *someone
else's* design system — same thesis, opposite direction, and it travels further
because it is useful without us.

**223 words.**

---

Four questions I would ask before trusting a design system's component count.

**1. Ninety-eight of what, on which platforms?**
A catalogue number is usually one platform's number. Ask for the breakdown. Ours
is React 98, SwiftUI 90, Compose 90, Flutter 90, Angular 31 in preview — and the
cross-platform figure is 90 of 98, across the four platforms meant to carry the
full catalogue.

**2. Which gaps are deliberate?**
"Missing" and "decided against" look identical in a count. Eight of ours are
documented decisions — a composition rather than a component, or a native API
already doing the job. If nobody can tell you why something is absent, the
absence is not a decision.

**3. Is the package mature, or is the evidence?**
These get collapsed into one word constantly. Our React package is stable; the
evidence behind the React catalogue is at beta. Both are true, and they answer
different questions.

**4. What would fail if the claim became false?**
This is the one that matters. If a platform count is a number someone typed,
nothing catches it when it drifts. If it is generated, something does.

None of these are hostile questions. They are the questions a maintainer should
already be able to answer about their own system — and the ones I now expect to
be asked about ours: kinetixui.com/docs/platforms

---

## Notes

- Alternate link uses `utm_content=li_alt` so the two variants stay separable.
- Question 4 is the bridge back to a01 without restating it: a01 argued parity
  claims need proof, this asks what *breaks* when the claim goes stale.
- Still no competitor named. The checklist points at us last, on purpose.
