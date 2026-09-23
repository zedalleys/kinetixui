---
id: a01
type: visual brief
supports: article.md, linkedin.md, x-thread.md
status: drafted
---

# a01 — visual brief

Five assets. Each makes **one** point. None is a product screenshot dressed up
as a diagram, and none shows a UI state that does not exist.

**Shared constraints**

- Real values only. Numbers come from `pnpm marketing:stats` on the day, not from
  this file.
- Light and dark variants for anything posted to X (dark-mode users are most of
  the developer audience there).
- Legible at 400px wide — LinkedIn and X both compress aggressively.
- Code images: the site's own token palette and mono stack, so the assets look
  like the product without pretending to be a screenshot of it.

---

## Asset 1 — Before / after coverage table *(priority: required)*

**Point:** correcting a false claim moves numbers *down*, and that is the
healthy direction.

**Used by:** LinkedIn variant A, article body.

| Platform | Claimed | Verified |
| --- | --- | --- |
| React | 98 | 98 |
| SwiftUI | 91 | **90** |
| Jetpack Compose | 90 | **89** |
| Flutter | 91 | **90** |
| On all four | 90 | **89** |

**Treatment:** the four changed cells in the destructive token colour, with a
small down-arrow. Caption: *"Corrected, not improved."* Do **not** style the
drop as negative-bad — the whole point is that it is positive.

**Do not include Angular in this table.** It did not exist at the time of the
before-state, and adding it invites a false comparison.

---

## Asset 2 — The three levels of verification *(priority: required)*

**Point:** most projects stop at Level 0 without noticing.

Three stacked bars, increasing width:

| Level | Checks | Catches | Cost |
| --- | --- | --- | --- |
| 0 — Spelling | the platform name is known | nothing real | free |
| 1 — Source exists | a file is there | "we never built this" | one script |
| 2 — It compiles | symbols and arguments resolve | wrong APIs | platform CI |

Annotate Level 0 with *"feels like validation — runs in CI, goes green"*.

---

## Asset 3 — The Chart snippet *(priority: high)*

**Point:** documentation is the one place code is written by hand and never
compiled.

A code card of the real snippet, with two callouts:

- `KinetixChart` → **no such symbol; no Chart.kt exists**
- `CustomPaint` → **this is a Flutter API**

Plus a small browser-chrome fragment showing the tab labelled **"Android"** —
drawn, not a screenshot, since the tab no longer exists.

**Caption:** *"Nobody lied. There was just no compiler between that sentence and
the reader."*

---

## Asset 4 — One file, two consumers *(priority: medium)*

**Point:** the fix is structural — the example and the compiled thing are the
same bytes.

```
        ┌──────────────────────────────┐
        │  UsageExamples.kt            │
        │                              │
        │  // kx-usage:button-demo     │
        │  KinetixButton(onClick =…) { │ ──┬──► Gradle compiles it
        │    Text("Button")            │   │
        │  }                           │   └──► the website quotes it
        │  // kx-usage:end             │
        └──────────────────────────────┘
                  drift check fails if they disagree
```

Single source file, two arrows. No transpilation arrow anywhere — that is the
claim we specifically do not make.

---

## Asset 5 — 30-second demo clip *(priority: medium; reusable)*

**Point:** the guardrail is real and it fails loudly.

**Script (no voiceover, terminal only):**

1. Open `components.manifest.json`, add `"Compose"` to a component that has no
   Compose source. *(3s)*
2. `pnpm check:platform-source` *(2s)*
3. Terminal prints:
   `✗ dialog: manifest says Compose, but no matching source in packages/ui-compose`
   *(hold 3s)*
4. Undo. Re-run. `check:platform-source ok — every declared platform is backed by
   real source.` *(hold 2s)*
5. End card: *"A claim with nothing behind it should fail the build."* + URL.

Record at 1280×720, large terminal font, the site's dark palette. Under 30s so it
autoplays fully on X and LinkedIn.

**This is the highest-reuse asset in the set** — it also serves campaign 1 and
the Product Hunt gallery.

---

## Not to be made

- A "platform parity ✅✅✅✅" grid. We do not have uniform parity and the
  checkmark grid is the visual form of the lie this piece is about.
- Any chart of stars, downloads or users. None are known.
- A screenshot showing Angular alongside the other four without its preview
  label.
