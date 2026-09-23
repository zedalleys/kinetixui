---
id: a01
pillar: A — Cross-platform design systems
audience: design-system engineers, frontend leads
intent: awareness
channels: [dev.to, linkedin]
cta: /docs/platforms
status: drafted
canonical: https://kinetixui.com/docs/platforms
---

# Your cross-platform design system is probably lying about parity

Not maliciously. Mine was.

We publish a component library with implementations for React, SwiftUI, Jetpack
Compose and Flutter. Every component page listed the platforms it supported.
Every one of those listings was a string in a JSON file that a human typed, and
nothing anywhere checked whether the thing it claimed actually existed.

Then I wrote a script that checked. On its first run it told me that
`direction-provider` — a component the site advertised on SwiftUI, Compose and
Flutter — had no implementation on any of them. Not an incomplete one. None.
There was no file.

That is the normal state of a cross-platform design system, and it is worth
being precise about why.

## Parity is a claim, and claims decay

A single-platform library has a useful property: the documentation and the code
live in the same repository, in the same language, and are usually generated
from the same source. If you delete a component, the docs break.

A cross-platform design system loses that property immediately. The React
implementation is TypeScript. The iOS one is Swift, compiled by a different
toolchain, on a different machine, in a CI job that the web build knows nothing
about. The coverage matrix that ties them together is not code — it is a
*description* of code, and descriptions drift.

They drift in a specific, predictable direction: **toward optimism.** Nobody
forgets to add a platform they just shipped. People forget to remove a platform
they abandoned, or never quite started. The gap between the matrix and the
repository widens silently, always in the flattering direction, and the only
signal is an issue from someone who tried to use the thing you said existed.

So the interesting question about any cross-platform design system — including
this one — is not "how many components does it have?" It is:

> **What would fail if this claim were false?**

If the answer is "nothing", the claim is decoration.

## What "verified" has to mean

Three levels, and the difference matters more than it sounds.

**Level 0 — the name is spelled correctly.** Our original check did this. It
validated that `"SwiftUI"` was a known platform string. It could not tell you
whether any SwiftUI existed.

**Level 1 — source exists.** A file, named after the component, in that
platform's package. Cheap, scriptable from anywhere, catches the entire class of
"we never built this."

**Level 2 — it compiles.** The platform's own compiler sees the symbol and the
arguments. This is the only level that catches a *wrong* API as opposed to a
*missing* one.

Most projects that verify anything stop at Level 0 without noticing, because
Level 0 feels like validation — it has a script, it runs in CI, it goes green.

Here is what moving to Level 1 found in a repository I thought was in good shape:

- **`direction-provider`** claimed three native platforms and had none. The
  correct answer turned out to be interesting: SwiftUI, Compose and Flutter all
  carry layout direction in the framework itself — `environment(\.layoutDirection)`,
  `LocalLayoutDirection`, `Directionality`. There was never anything to port.
  The component is React-only *by design*, which is a much better thing to
  document than a lie.

- **`combobox`** claimed a React component that does not exist. There is no
  `combobox.tsx`, no `Combobox` export. It is a documented recipe built from
  `Command` primitives — genuinely useful, genuinely not a component. It now
  says so.

Correcting those moved the published numbers down: SwiftUI 91 → 90, Compose
90 → 89, Flutter 91 → 90. Components on all four platforms: 90 → 89.

The numbers got worse. The documentation got true. Those are the same event.

## The check will insult you, and that is the point

A verifier that only confirms what you already believe is not a verifier.

On its first run, mine also flagged `sonner` as missing on SwiftUI and Flutter.
It was wrong: the component is implemented on both, filed as `Toaster.swift` and
`toaster.dart`, because that is what those platforms call the thing. A false
positive on run one.

The fix is worth dwelling on, because it is where this kind of tooling usually
goes wrong. The tempting move is a lookup table inside the script —
`sonner → Toaster` — and now the script carries knowledge the manifest doesn't,
and the next person has to know the script exists to understand the data.
Instead the alias went into the manifest, next to the claim:

```json
"sonner": {
  "platforms": ["React", "SwiftUI", "Compose", "Flutter"],
  "sourceNames": { "SwiftUI": "Toaster", "Flutter": "toaster" }
}
```

The rule I would now apply generally: **when a checker is wrong, fix the data,
not the checker.** A checker full of exceptions stops being a specification.

## Level 2, and where documentation goes fictional

Source existing is not the same as source being *correct*, and the gap shows up
worst in documentation — because documentation is the one place where code is
written by hand and never compiled.

Our component pages carried 300 hand-written native snippets: one per demo, per
platform. I checked every `Kinetix*` identifier in all 300 against the real
packages. SwiftUI: 164 symbols, all real. Flutter: 175, all real. Compose: 182,
of which **three did not exist**.

The worst one was on the Chart page:

```kotlin
// KinetixChart is a hand-drawn CustomPaint bar chart over the
// --chart-1…5 palette (no charting dependency). Line/area are a follow-up.
KinetixChart(
  points = listOf(
    KinetixChartPoint("Jan", 186f, seriesIndex = 0),
  ),
)
```

Neither symbol exists. There is no `Chart.kt` in the Compose package. The
manifest already said, correctly, that `chart` is not on Compose. And
`CustomPaint` is a **Flutter** API — the Flutter implementation's rationale had
been pasted onto an invented Compose one.

The website rendered this under a tab labelled **"Android"**, next to real
examples, with no indication it was different.

Nobody lied. Someone wrote a plausible snippet for a component they expected to
build, and there was no compiler between that sentence and the reader.

## The honest limit of cheap verification

Symbol checking is cheap and catches a lot. It is also not enough, and any
article recommending it should say where it stops.

The same audit passed this snippet:

```kotlin
KinetixDataTable(
  columns = listOf(
    KinetixDataColumn("Invoice", sortKey = { it.invoice }) { it.invoice },
  ),
  rows = invoices,
)
```

`KinetixDataColumn` was the one fault a symbol check could see — the class is
`KinetixColumn<T>`. Two more were invisible to it: the parameter is `data`, not
`rows`; and that trailing lambda binds to the constructor's last parameter,
which is `weight: Float`, not `cell`. The code would not have compiled.

I found those by reading the real signature, not by running a script. Which is
the argument for Level 2: the only reliable check on whether code is right is a
compiler that has opinions about it.

So the examples are migrating. Each one moves into a file the platform's CI
actually builds, wrapped in extraction markers, and the website shows the
extracted region:

```kotlin
// kx-usage:button-demo
KinetixButton(onClick = save) {
    Text("Button")
}
// kx-usage:end
```

One file. The compiler sees it, the website quotes it, and a drift check fails
if they disagree. Three components have moved so far, of roughly a hundred.
Saying "three" is more useful than saying "we're migrating", so: three.

## The same disease, one layer up

Our Blocks page — composed examples like a sign-in card — had the identical
problem at a different scale. One 952-line file held each block's live preview as
JSX, and beside it hand-typed copies of "the same" code for React, Compose and
Flutter.

The React snippet had already drifted from the preview rendering three
centimetres above it. The page displayed `id="email"`; the component rendered
`id="bl-email"`. Two copies of one thing, no check, and they were already
different.

And the CTA banner block — the one whose marketing copy read *"React, SwiftUI,
Compose and Flutter from a single source"* — had no SwiftUI source, and its
three existing snippets were independently typed strings. The sentence was
wrong twice in eleven words, printed on our own website, inside the example
meant to demonstrate the claim.

Every block snippet now comes from a file that compiles. The count dropped to
what was real and climbed back as the source got written.

## What I would ask of a design system now

If you are evaluating one — or maintaining one — these questions separate a
verified claim from a decorative one:

1. **Where does the platform matrix live, and what reads it?** If it is a
   hand-maintained table in a README, it is a description, not a specification.
2. **What happens in CI if a component is listed for a platform it has no source
   for?** If the answer is "nothing", the listing means nothing.
3. **Are the documentation snippets compiled?** If not, assume some fraction is
   fiction. Ours was about 1%, and 1% was enough to publish an API that had
   never existed.
4. **Does the project distinguish "not ported" from "ported"?** Ours shows a
   native tab for components that were deliberately never ported, because the
   composition to use instead is genuinely the useful answer — but that tab now
   says **"Not a Flutter port"** and gives the reason. Before, it just said
   "Flutter".
5. **What are the real numbers?** Not the catalogue size. The count per
   platform, and what the denominator excludes.

Ours, today: 98 components. React 98, SwiftUI 90, Jetpack Compose 89,
Flutter 90, Angular 11 and explicitly in preview. 89 of 98 on all four
complete-catalogue platforms, with 9 documented exceptions that each carry a
written reason. Angular is excluded from that denominator because its catalogue
is deliberately incomplete, and folding it in would flatter the number.

Those are generated, not typed. If I edit them by hand, the build fails.

## The part that actually matters

The guardrails are not impressive engineering. `check-platform-source.mjs` is
about a hundred lines and the most sophisticated thing it does is compare two
lists.

What made them worth writing is that each one was born from a specific bug
rather than a hypothetical. The platform-source check exists because
`direction-provider` was wrong. The snippet check exists because the Chart page
advertised an API nobody had written. The block checks exist because a marketing
sentence about a single source was printed above three independently typed
strings.

That is the only pattern I would actually recommend: when documentation turns
out to be wrong, do not just fix the documentation. Ask what would have caught
it, write that, and let it run against everything else you have already
published. Mine found five more problems on its first run.

You will not enjoy the first run. Run it anyway.

---

*KinetixUI is an open-source design system with one DTCG token source compiled
to every platform's token output, and native component implementations per
platform. Current coverage — generated, not typed — is at
[kinetixui.com/docs/platforms](https://kinetixui.com/docs/platforms). The
guardrails described here are in the repo:
[`scripts/check-platform-source.mjs`](https://github.com/zedalleys/kinetixui/blob/main/scripts/check-platform-source.mjs),
[`check-platform-code.mjs`](https://github.com/zedalleys/kinetixui/blob/main/scripts/check-platform-code.mjs),
[`check-block-source.mjs`](https://github.com/zedalleys/kinetixui/blob/main/scripts/check-block-source.mjs).*
