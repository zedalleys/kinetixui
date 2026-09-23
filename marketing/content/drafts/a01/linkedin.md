---
id: a01
channel: linkedin
format: post
supports: article.md
cta: /docs/platforms
status: drafted
---

# LinkedIn — primary post

**Length:** ~230 words. One idea: the matrix is a claim, and claims decay toward
optimism. Post the article link in the body; LinkedIn's link penalty is
overstated and a first-comment link costs more reach than it saves.

**Visual:** the before/after coverage table (see `visual-brief.md`, asset 1).

---

I wrote a script to check whether our design system's platform claims were true.

They weren't.

We publish component implementations for React, SwiftUI, Jetpack Compose and
Flutter. Every component page listed its supported platforms. Every listing was
a hand-typed string, and nothing verified that the thing it claimed existed.

On its first run the check found `direction-provider` — advertised on three
native platforms — had no implementation on any of them. No partial port. No
file.

The reason was actually interesting: SwiftUI, Compose and Flutter all carry
layout direction in the framework itself. There was never anything to port. The
component is React-only by design — which is a far better thing to document than
a claim that isn't true.

Correcting it moved our numbers down. SwiftUI 91 → 90. Compose 90 → 89. Flutter
91 → 90. Components on all four platforms: 90 → 89.

The numbers got worse. The documentation got true. Same event.

The useful question about any cross-platform design system isn't "how many
components?" It's: **what would fail if this claim were false?** If the answer is
nothing, the claim is decoration.

Full writeup, including the Chart page that advertised a Compose API nobody had
ever written: [link]

---

# Variant B — the Chart finding as the hook

Use if variant A underperforms, or ~3 weeks later for a different slice of the
feed. Same article, different entry point.

---

Our documentation described an API that did not exist.

The Chart component page had an "Android" tab. It showed a `KinetixChart`
composable, with a comment explaining it was "a hand-drawn CustomPaint bar
chart".

Two problems.

`KinetixChart` doesn't exist — there's no Chart implementation in our Compose
package at all, and our own manifest said so correctly.

And `CustomPaint` is a Flutter API. The Flutter implementation's rationale had
been pasted onto an invented Compose one.

Nobody lied. Someone wrote a plausible snippet for a component they expected to
build, and there was no compiler between that sentence and the reader. That's
the whole failure mode: documentation is the one place where code is written by
hand and never compiled.

I checked all 300 native snippets on our component pages against the real
packages. SwiftUI: 164 symbols, all real. Flutter: 175, all real. Compose: 182,
three fictional.

1% fiction was enough to publish an API that had never existed.

The examples are migrating into files our CI actually compiles, with the website
quoting the extracted region. Three components down, about a hundred to go.

Writeup: [link]

---

## Do not

- Do not open with "Excited to share…".
- Do not name another library as the bad example. The category problem is the subject.
- Do not claim this is solved. It is 89/98 with 9 documented exceptions.
- Do not post both variants in the same fortnight.
