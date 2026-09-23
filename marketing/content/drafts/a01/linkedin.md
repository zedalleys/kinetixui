---
id: a01
channel: linkedin
format: post
supports: article.md
cta: <DEV_ARTICLE_URL>
secondary_cta: /docs/platforms
status: drafted
---

# LinkedIn

Two posts. Ship **A** with the article. Keep **B** for ~3 weeks later, a
different entry point into the same piece. Do not run both in one fortnight.

Link goes in the post body. Hashtags: three at most, and only if they are
doing work — none is fine.

---

## A — default (216 words)

Hook → what we found → before/after → lesson → link.

---

I wrote a script to check whether our design system's platform claims were true.

They weren't.

We publish component implementations for React, SwiftUI, Jetpack Compose and
Flutter. Every component page listed its supported platforms. Every listing was
a hand-typed string, and nothing checked whether the implementation it claimed
existed.

First run: `direction-provider` — advertised on three native platforms — had no
implementation on any of them. Not a partial port. No file.

The reason was more interesting than the bug. SwiftUI, Compose and Flutter all
carry layout direction in the framework itself. There was never anything to
port. The component is React-only by design — a far better thing to document
than a claim that isn't true.

Correcting it moved our published numbers down:

SwiftUI 91 → 90
Compose 90 → 89
Flutter 91 → 90
On all four catalogue-complete platforms: 90 → 89

The numbers got worse. The documentation got true. Same event.

Nobody wrote anything false on purpose. The matrix was a description of code,
and descriptions decay — always in the flattering direction. Nobody forgets to
add a platform they just shipped.

The question worth asking about any cross-platform design system, including
mine: **what would fail if this claim were false?** If the answer is nothing,
the claim is decoration.

Full writeup, including the component page that documented an API nobody had
ever written: <DEV_ARTICLE_URL>

#designsystems #frontend

---

## B — alternative angle (198 words)

Led by the Chart finding. Same article, later slot.

---

Our documentation described an API that did not exist.

The Chart component page had an "Android" tab showing a `KinetixChart`
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

About 1% fiction — enough to publish an API that had never existed.

Those examples are moving into files our CI compiles, with the site quoting the
extracted region. Three of a hundred so far.

Writeup: <DEV_ARTICLE_URL>

---

## Do not

- Do not open with "Excited to share…".
- Do not name another library as the bad example.
- Do not claim this is solved — it is 89/98 with 9 documented exceptions.
- Do not make the CTA installation-focused. This is an awareness piece.
- Do not post before `<DEV_ARTICLE_URL>` is a real URL.
