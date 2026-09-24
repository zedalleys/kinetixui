---
id: a01
channel: x
format: thread
supports: article.md
cta: <DEV_ARTICLE_URL>
status: drafted
---

# X — thread (9 posts)

No "🧵👇". Post 1 stands alone if nobody reads on. Every post should still make
sense quoted out of context. Link only at the end.

---

**1/**

I wrote a script to check whether my design system's platform claims were true.

First run: a component we advertised on SwiftUI, Compose and Flutter had no
implementation on any of them.

Not partial. No file.

---

**2/**

The component was `direction-provider`.

Turns out SwiftUI, Compose and Flutter all carry layout direction in the
framework itself:

`environment(\.layoutDirection)`
`LocalLayoutDirection`
`Directionality`

Nothing to port. React-only by design — a better thing to document than a claim
that isn't true.

---

**3/**

Fixing it moved our published numbers down.

SwiftUI 91 → 90
Compose 90 → 89
Flutter 91 → 90
On all four catalogue-complete platforms: 90 → 89

The numbers got worse. The documentation got true.

---

**4/**

A platform matrix isn't code. It's a description of code.

And it decays in one direction: toward optimism.

Nobody forgets to add a platform they just shipped. People forget to remove one
they abandoned — or never started.

---

**5/**

Three levels of verification:

0. the platform name is spelled correctly
1. a source file exists
2. it compiles

Most projects stop at 0 without noticing, because 0 has a script, runs in CI,
and goes green.

---

**6/**

Level 2 found this on our Chart page:

> `KinetixChart` is a hand-drawn CustomPaint bar chart…

`KinetixChart` didn't exist. There was no Chart in our Compose package.

`CustomPaint` is Flutter. The Flutter rationale had been pasted onto an invented
Compose API.

Rendered under a tab labelled "Android".

*[attach: code card, visual-brief asset D]*

---

**7/**

Symbol checking is cheap and catches a lot. It isn't enough.

This passed the audit:

```kotlin
KinetixDataColumn("Invoice", sortKey = { … }) { it.invoice }
```

Wrong class name — caught.
Wrong param name (`rows` vs `data`) — missed.
Trailing lambda binds to `weight: Float`, not `cell` — missed.

Only a compiler catches those.

---

**8/**

The rule I'd actually recommend:

When documentation turns out to be wrong, don't just fix the documentation.

Ask what would have caught it, write that, and run it against everything you've
already published.

Mine found five more problems on its first run.

---

**9/**

Examples are migrating into files CI compiles, with the site quoting the
extracted region. Five of a hundred-odd so far.

Current coverage is generated from the manifest — edit it by hand and the build
fails.

<DEV_ARTICLE_URL>

---

# Standalone posts

Not thread excerpts. Space them across the following week.

**A.**
A platform matrix is documentation until CI can make it fail.

**B.**
The numbers got worse. The documentation got true.

Those were the same event.

**C.**
Ask this about any cross-platform library, including your own:

What would fail if this platform claim were false?

If the answer is nothing, the claim is decoration.

**D.**
When your verification script is wrong, fix the data — not the script.

A checker full of exceptions stops being a specification.
