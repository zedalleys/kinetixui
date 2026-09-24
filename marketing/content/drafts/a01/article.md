---
id: a01
pillar: A — Cross-platform design systems
audience: design-system engineers, frontend leads
intent: awareness
channels: [dev.to, linkedin]
cta: /docs/platforms
status: drafted
title_options:
  A: "Your cross-platform design system may be lying about parity"   # default
  B: "Your cross-platform parity numbers may be wrong"
  C: "Your cross-platform design system is probably lying about parity"
---

# Your cross-platform design system may be lying about parity

Mine was. Not deliberately — nobody sat down to write something false. But the
documentation said a thing that was not true, and nothing in the repository
could tell.

We publish component implementations for React, SwiftUI, Jetpack Compose and
Flutter. Every component page listed its supported platforms. Every listing was
a string in a JSON file that a human typed, and nothing checked whether the
implementation it claimed actually existed.

Then I wrote a script that checked. On its first run it reported that
`direction-provider` — advertised on SwiftUI, Compose and Flutter — had no
implementation on any of them. Not a partial port. No file.

## Parity is a claim, and claims decay

A single-platform library has a useful property: the docs and the code live in
the same repository, in the same language, usually generated from the same
source. Delete a component and the docs break.

A cross-platform design system loses that immediately. The React implementation
is TypeScript. The iOS one is Swift, compiled by a different toolchain, on a
different machine, in a job the web build knows nothing about. The matrix tying
them together is not code — it is a description of code.

And it decays in one direction: **toward optimism.** Nobody forgets to add a
platform they just shipped. People forget to remove one they abandoned, or never
started. The gap widens silently, always in the flattering direction, and the
only signal is an issue from someone who tried to use what you said existed.

So the useful question about any cross-platform design system — including this
one — is not "how many components does it have?" It is:

> **What would fail if this claim were false?**

If the answer is "nothing", the claim is decoration.

## Three levels of verification

**Level 0 — the name is spelled correctly.** Our original check did this. It
validated that `"SwiftUI"` was a known platform string. It could not tell you
whether any SwiftUI existed.

**Level 1 — source exists.** A file, named for the component, in that platform's
package. Cheap, scriptable from anywhere, catches the whole class of "we never
built this."

**Level 2 — it compiles.** The platform's own compiler resolves the symbol and
its arguments. The only level that catches a *wrong* API rather than a missing
one.

Most projects that verify anything stop at Level 0 without noticing, because
Level 0 feels like validation: it has a script, it runs in CI, it goes green.

## What Level 1 caught

- **`direction-provider`** claimed three native platforms and had none. The
  reason turned out to be interesting: SwiftUI, Compose and Flutter all carry
  layout direction in the framework itself — `environment(\.layoutDirection)`,
  `LocalLayoutDirection`, `Directionality`. There was never anything to port.
  React-only *by design* is a much better thing to document than a claim that
  is not true.

- **`combobox`** claimed a React component that does not exist. There is no
  `combobox.tsx`, no `Combobox` export. It is a recipe built from `Command`
  primitives — genuinely useful, genuinely not a component. It says so now.

Correcting those moved the published numbers down: SwiftUI 91 → 90, Compose
90 → 89, Flutter 91 → 90. Components on all four catalogue-complete platforms:
90 → 89.

The numbers got worse. The documentation got true. Same event.

### The check should insult you

A verifier that only confirms what you already believe is not a verifier.

On its first run mine also flagged `sonner` as missing on SwiftUI and Flutter.
It was wrong — the component exists on both, filed as `Toaster.swift` and
`toaster.dart`, because that is what those platforms call the thing.

The fix matters more than the bug. The tempting move is a lookup table inside
the script, and now the script carries knowledge the manifest does not. Instead
the alias went into the manifest, beside the claim:

```json
"sonner": {
  "platforms": ["React", "SwiftUI", "Compose", "Flutter"],
  "sourceNames": { "SwiftUI": "Toaster", "Flutter": "toaster" }
}
```

**When the checker is wrong, fix the data, not the checker.** A checker full of
exceptions stops being a specification.

## What Level 2 caught

Source existing is not source being correct, and the gap is worst in
documentation — the one place where code is written by hand and never compiled.

Our component pages carried 300 hand-written native snippets. I checked every
`Kinetix*` identifier in all of them against the real packages. SwiftUI: 164
symbols, all real. Flutter: 175, all real. Compose: 182, of which **three did
not exist**.

The worst was on the Chart page:

```kotlin
// KinetixChart is a hand-drawn CustomPaint bar chart over the
// --chart-1…5 palette (no charting dependency). Line/area are a follow-up.
KinetixChart(
  points = listOf(
    KinetixChartPoint("Jan", 186f, seriesIndex = 0),
  ),
)
```

Neither symbol exists. There is no Chart implementation in our Compose package,
and the manifest already said so correctly. And `CustomPaint` is a **Flutter**
API — the Flutter implementation's rationale had been pasted onto an invented
Compose one. The website rendered this under a tab labelled **"Android"**, beside
real examples, with nothing marking it as different.

Nobody lied. Someone wrote a plausible snippet for a component they expected to
build, and there was no compiler between that sentence and the reader.

## Where symbol checking stops

Symbol checking is cheap and catches a lot. Any article recommending it should
say where it stops. The same audit passed this:

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
`weight: Float`, not `cell`. It would not have compiled.

I found those by reading the signature, not by running a script. Which is the
argument for Level 2. So the examples are migrating into files the platform's CI
actually builds, wrapped in markers, with the website quoting the extracted
region:

```kotlin
// kx-usage:button-demo
KinetixButton(onClick = save) {
    Text("Button")
}
// kx-usage:end
```

One file. The compiler sees it, the website quotes it, a drift check fails if
they disagree. Three of a hundred demo examples have moved so far. Saying
"three" is more useful than saying "we're migrating."

## The same failure, one layer up

Our Blocks page — composed examples like a sign-in card — had the identical
problem at a different scale. One 952-line file held each block's live preview as
JSX, and beside it hand-typed copies of "the same" code for React, Compose and
Flutter.

The React snippet had already drifted from the preview rendering directly above
it. The page displayed `id="email"`; the component rendered `id="bl-email"`. Two
copies of one thing, no check, already different.

And the CTA banner block — whose own copy read *"React, SwiftUI, Compose and
Flutter from a single source"* — had no SwiftUI source, and its three existing
snippets were independently typed strings. The sentence was wrong twice in eleven
words, on our own website, inside the example meant to demonstrate the claim.

Every block snippet now comes from a file that compiles.

## Five questions worth asking

Whether you are evaluating a design system or maintaining one:

1. **Where does the platform matrix live, and what reads it?** A hand-maintained
   table in a README is a description, not a specification.
2. **What happens in CI if a component is listed for a platform with no source?**
   If the answer is "nothing", the listing means nothing.
3. **Are the documentation snippets compiled?** If not, assume some fraction is
   fiction. Ours was about 1% — enough to publish an API that never existed.
4. **Does it distinguish "not ported" from "ported"?** Ours shows a native tab
   for components deliberately never ported, because the composition to use
   instead is the genuinely useful answer — but that tab now says **"Not a
   Flutter port"** and gives the reason. Before, it just said "Flutter".
5. **What are the real numbers?** Not catalogue size. The count per platform, and
   what the denominator excludes.

Ours, today: 98 components. React 98, SwiftUI 90, Jetpack Compose 89, Flutter
90, and Angular 11 — explicitly in preview. 89 of 98 on all four
catalogue-complete platforms, with 9 documented exceptions that each carry a
written reason. Angular sits outside that denominator because its catalogue is
deliberately incomplete; folding it in would flatter the number.

Those are generated. Edit them by hand and the build fails.

## The part that matters

The guardrails are not impressive engineering. The platform-source check is
about a hundred lines, and the most sophisticated thing it does is compare two
lists.

What made them worth writing is that each came from a specific bug rather than a
hypothetical. The platform check exists because `direction-provider` was wrong.
The snippet check exists because the Chart page advertised an API nobody had
written. The block checks exist because a sentence about a single source was
printed above three independently typed strings.

That is the only pattern I would actually recommend: when documentation turns out
to be wrong, do not just fix the documentation. Ask what would have caught it,
write that, and run it against everything else you have already published.

Mine found five more problems on its first run. You will not enjoy that run.
Run it anyway.

---

*KinetixUI is an open-source design system: one DTCG token source compiled to
every platform's token output, with native component implementations per
platform. [See the current generated platform
coverage](https://kinetixui.com/docs/platforms) — it is derived from the
component manifest, not maintained by hand.*
