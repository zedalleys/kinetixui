---
id: a01
channel: x
format: thread
supports: article.md
cta: /docs/platforms
status: drafted
---

# X — thread (9 posts)

Rules applied: one idea per post, no thread-announcing ("🧵👇"), code as images
where it reads better, the link only at the end. Post 1 must stand alone if
nobody reads on.

---

**1/**

I wrote a script to check whether my design system's platform claims were true.

First run: a component we advertised on SwiftUI, Compose and Flutter had no
implementation on any of them.

Not partial. No file.

---

**2/**

The claim lived in a JSON manifest. A human typed `"SwiftUI"` into an array.

Nothing read that array and checked it against the repository.

A cross-platform coverage matrix isn't code. It's a *description* of code, and
descriptions drift.

---

**3/**

They drift in one direction: toward optimism.

Nobody forgets to add a platform they just shipped.

People forget to remove one they abandoned — or never started.

---

**4/**

The component was `direction-provider`.

Turned out SwiftUI, Compose and Flutter all carry layout direction in the
framework itself:

`environment(\.layoutDirection)`
`LocalLayoutDirection`
`Directionality`

There was never anything to port. React-only by design — a much better thing to
document.

---

**5/**

Fixing it moved our published numbers down.

SwiftUI 91 → 90
Compose 90 → 89
Flutter 91 → 90
On all four: 90 → 89

Numbers got worse. Docs got true. Same event.

---

**6/**

Then I checked the code samples.

300 hand-written native snippets across our component pages.

SwiftUI: 164 symbols, all real.
Flutter: 175, all real.
Compose: 182 — three didn't exist.

---

**7/**

The worst one, on the Chart page:

> `KinetixChart` is a hand-drawn CustomPaint bar chart…

`KinetixChart` doesn't exist. There's no Chart in our Compose package.

And `CustomPaint` is Flutter. The Flutter rationale had been pasted onto an
invented Compose API.

Rendered under a tab labelled "Android".

*[attach: code screenshot of the snippet]*

---

**8/**

Symbol checking is cheap and catches a lot. It's also not enough.

This passed the audit:

```kotlin
KinetixDataColumn("Invoice", sortKey = { … }) { it.invoice }
```

Wrong class name (caught), wrong param name (missed), and the trailing lambda
binds to `weight: Float`, not `cell` (missed).

Only a compiler catches those.

---

**9/**

So the examples are migrating into files CI actually compiles, and the site
quotes the extracted region. 3 components down, ~100 to go.

The pattern I'd recommend: when docs turn out wrong, don't just fix the docs.
Write the check that would've caught it, then run it against everything.

Mine found 5 more.

[article link]

---

# Standalone posts

Reusable on their own, not part of the thread. Space them out.

**A.**
The useful question about a cross-platform design system isn't "how many
components does it have".

It's "what would fail if this claim were false".

If the answer is nothing, the claim is decoration.

**B.**
When your verification script is wrong, fix the data — not the script.

A checker full of exceptions stops being a specification.

**C.**
Documentation is the one place where code is written by hand and never compiled.

Then we're surprised when some of it turns out to be fiction.

**D.**
Our platform counts are generated from the manifest.

If someone edits them by hand, the build fails.

That's the entire trick.
