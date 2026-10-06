---
id: ART-002
pillar: B — Design tokens past the web boundary
audience: P2 primary, S2 and P1 secondary
intent: awareness → evaluation
channels: [dev.to, kinetixui site later]
campaign: kx_p2_b_token_boundary
cta: /docs/tokens
status: published on dev.to — 2026-10-06
search_intent: "design tokens flutter", "design tokens swiftui", "design tokens jetpack compose", "dtcg design tokens"
derived_assets: [LI-005, X-004, X-010, VIS-003]
---

# Your design tokens stop at the web boundary

There is a moment in every multi-platform design system where the pipeline quietly ends.

It goes like this. You put your colours and spacing in a JSON file. You run a build step. Out comes a
stylesheet full of custom properties, and every web component starts referring to `--color-surface` instead
of a hex code. This is good. It works. You have a single source of truth.

Then the iOS app needs the same values.

And here is where almost every design system does the same thing, including mine, at first: somebody opens
the Swift project and types the numbers in.

## The copies are not the problem

It is tempting to treat this as a discipline failure. It isn't. The engineer who typed those values into
`Colors.swift` made a completely reasonable decision — there was no other mechanism available, and the app
needed to ship.

The problem is structural: **a value changed in the web pipeline has no route to a Kotlin constant.** Nothing
connects them. There is no build step that fails, no diff that shows up in review, no test that goes red.
The two files are related only by the fact that a person once made them agree.

So they agree on Tuesday and disagree by the following quarter, and nobody can point to the commit where it
happened, because there wasn't one. There were four commits, on four platforms, each locally correct.

This is worth naming precisely because the usual response — "we should be more careful" — cannot work.
Carefulness is not a mechanism. If the only thing keeping four platforms aligned is that everybody remembers
to check, they will diverge the first week somebody is busy.

## What "single source of truth" has to mean

A source of truth that only one consumer reads is just a file.

For it to be true across platforms, three things have to hold:

1. **Every platform's values are generated from it.** Not copied from it. Generated, by a build step, into
   files that people do not hand-edit.
2. **The generated files are visible.** Committed, diffed, reviewed. A token change should show up in a pull
   request as four files moving together.
3. **Editing a generated file is an error you notice.** Otherwise the first urgent hotfix puts a hand-written
   value back into the pipeline and nothing tells you.

That third one is the one people skip, and it is the one that decides whether the system survives contact
with a deadline.

## DTCG, briefly, and why the format matters less than you think

The [Design Tokens Community Group](https://www.designtokens.org/) format gives you a standard way to write
tokens: a JSON structure where each token has a `$type` and a `$value`, and groups nest.

```json
{
  "color": {
    "blue": {
      "500": { "$type": "color", "$value": "#1b3c53" }
    }
  },
  "space": {
    "4": { "$type": "dimension", "$value": "16px" }
  }
}
```

The honest take: the specific format matters less than the fact that you have one. What DTCG buys you is a
typed, tool-readable structure and an ecosystem that already knows how to transform it — most usefully
[Style Dictionary](https://styledictionary.com/), which takes a token file and emits platform-specific output.

What it does *not* buy you is the interesting part. The interesting part is the layer you build on top.

## The layer that actually matters: primitives versus semantics

Here is the mistake I made early, and I think it is the most common one.

I generated `blue-500` into every platform, felt good about it, and moved on. Six months later the design
changed and I discovered that "blue 500" appeared in forty places across four platforms, and only some of
them meant "the primary action colour". The rest meant "the colour of a link", or "the border of a focused
input", or "that blue we use on the marketing site".

A ramp of primitives is not a design system. It is a palette with build tooling.

The layer that makes tokens survive a redesign is the **semantic** one:

```
primitive:  color.azure.700  = #1d4ed8
semantic:   color.primary    = {color.azure.700}
            color.ring       = {color.azure.700}
            color.brand      = {color.blue.500}
```

Now `color.primary` and `color.ring` (the focus ring) happen to be the same value, and the day they need to
stop being the same value, that is a one-line change rather than an archaeology project. It has already
happened once: `primary` used to be the navy that `color.brand` still is, and moving it to a brighter blue for
contrast changed an alias, not the components. Components refer only to semantics. Primitives are an
implementation detail of the semantic layer.

The practical test: **can you answer "what is this colour for?" from the token name alone?** If the answer is
"it's blue", you have a palette.

## Generating for platforms that are not the web

This is where the boundary gets crossed, and it is less work than it looks.

Style Dictionary's model is: parse the tokens, apply transforms, run a format per target. A transform turns
`16px` into whatever that platform wants — `16.0` for Swift, `16.dp` for Compose, `16.0` for Dart. A format
decides what the output file looks like.

Roughly, the four targets want:

| Platform | Shape | Notes |
| --- | --- | --- |
| Web | CSS custom properties | Usually two sets, light and dark, toggled by a class or media query |
| iOS | A Swift enum or struct of static constants | `Color`, `CGFloat`, and a way to express light/dark |
| Android | A Kotlin object of `Color`/`Dp`/`TextStyle` | Compose wants `Dp` and `sp`, not raw numbers |
| Flutter | A Dart class of constants | Plus, ideally, a `ThemeData` adapter — see below |

The dark-mode question is the one that catches people. On the web, light and dark are two sets of values
behind one contract, and the contract is what components use. That same idea has to survive into native: you
do not want `KinetixColors.blueLight` and `KinetixColors.blueDark` referenced directly in views. You want a
semantic accessor that resolves by the current colour scheme, so the view code is identical in both.

If your generated native output forces every view to branch on the colour scheme, the tokens have technically
crossed the boundary and practically have not.

## The step almost nobody takes: make the tokens adoptable alone

Here is the thing I did not expect, and it came from a real request rather than from planning.

Someone wanted to use our Flutter tokens without our Flutter widgets.

My first reaction was that this was a slightly odd thing to want. My second reaction, which was correct, was
that it is the single most useful way into a design system, and that almost nobody offers it.

Think about the position that team is in. They have an app. It has widgets. Those widgets work. What they do
not have is agreement with the web app about what "surface" means. They do not need anybody's Button; they
need the numbers.

So we built a theme adapter — a function that turns the generated tokens into Flutter's own `ThemeData`:

```dart
MaterialApp(
  theme: KinetixMaterialTheme.light(),
  darkTheme: KinetixMaterialTheme.dark(),
  home: const MyApp(),
);
```

After that, stock Material widgets inherit the design system. An `ElevatedButton` you already had picks up
the right colour, radius and type scale, and there is not a single custom widget in the tree.

The equivalent exists for Cupertino, and the same idea generalises: on Android, a Compose `MaterialTheme`
wrapper; on iOS, an environment-injected theme. In KinetixUI those two are not built yet: today the
stock-widget adapters are Flutter's, and the Compose and SwiftUI themes style KinetixUI's own components.

What this changes strategically is the size of the first step. Adoption stops being a migration and becomes
an afternoon. And the thing that actually drifts — the values, not the markup — gets fixed first.

## Keeping it honest

Two checks are worth having from the start, and both are cheap.

**A contract test.** Assert that every semantic token exists on every platform's generated output. Not that
the values match — transforms legitimately change them — but that the *names* do. This catches the case where
someone adds a semantic token, regenerates the web output, and does not notice the native targets were not
part of that build.

**A no-hand-editing check.** Either regenerate in CI and fail on a dirty diff, or check the generated files
against a fresh generation. This is the one that protects you from the urgent hotfix.

In our repository both run on every pull request: a test that finds every role in the semantic colour
contract in each platform's generated output and resolves it back to the source, and a regenerate-and-diff
step. Alongside them is a contrast check over the colour pairs components render. That one resolves the
source; the SwiftUI package repeats it against the generated Swift colours, which is the version with the
interesting property: run against the output rather than the source, it catches a bad *transform* as well
as a bad value.

## What this does not solve

Tokens are not components. Getting your spacing scale onto four platforms does not make a button on iOS
behave like a button on the web, and it should not — a SwiftUI view that behaves like a React component is a
bug, not a feature.

Tokens also do not settle the harder governance questions: who is allowed to add a semantic token, what
happens when a platform genuinely needs a value the others do not, how you deprecate. Those are people
problems and a pipeline does not fix them.

What a token pipeline does is narrow the problem to the parts that need human judgement, and remove the part
that was never a judgement call in the first place: whether the number in the Kotlin file is the same number
as the one on the web.

---

### If you want to look at a working one

KinetixUI's token pipeline is the one described here: a DTCG source, Style Dictionary, generated output for
web, iOS, Android and Flutter, with the theme adapters and the CI checks. It is MIT, and the generated
artifacts are committed, so you can read the output without building anything.

The token contract, and what it generates: **https://kinetixui.com/docs/tokens**

And if the honest answer is that you only want the ideas and not the library — that is a completely
legitimate outcome of reading this, and the Style Dictionary configuration is the part worth stealing.

---

## Notes for publication

- **Numbers:** this article deliberately contains almost none. The primitive/semantic example's values are
  checked against the token source by `apps/web/src/lib/tokens-page.test.tsx` (it used to show
  `primary = {color.blue.500}`, which stopped being true when `primary` moved to `azure.700`).
- **Claims check:** tokens generated (A1) ✅ · components hand-written, stated explicitly in *What this does
  not solve* (A2) ✅ · no install command for an undistributed platform ✅ · no activation promise (D1) ✅ ·
  no accessibility claim beyond the contrast gate ✅.
- **Length:** ~1,500 words. Not padded to hit an SEO target; the *Generating for platforms* table and the
  theme-adapter section are the parts that answer the search intent.
- **Canonical:** publish on dev.to first. Per `seo.md`, `/blog` does not get built until at least three
  articles have run off-site and one has measurable traffic.
