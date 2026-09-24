---
type: visual production brief
covers: [a01, a02]
status: brief finalized — no asset built, nothing published
---

# a01 + a02 — visual production

One brief for two assets that have to look like one campaign family in a
LinkedIn feed a fortnight apart, without being the same picture.

**This file does not authorise anything.** No asset is built, exported or posted
by it. It is the specification the two assets are built from. Both campaign
briefs are final on `main` as of `6ffa03d`
([#215](https://github.com/zedalleys/kinetixui/pull/215)), and this file is
written against them rather than against a draft.

---

## 1. Why a shared system needs writing down at all

The two briefs were written independently and specify different things in the
one place that matters most to a feed: a01 exports **light and dark**, a02
specifies a **dark surface only**. Each is defensible alone. Together, two posts
from the same account a fortnight apart, one light and one dark, do not read as
one campaign — they read as two unrelated graphics.

The resolution: **a02 gains a light variant.** Both assets ship light and dark;
the channel picks, and dark stays the default on X.

`drafts/a02/visual-brief.md` is amended in the same commit as this file, so no
window exists in which the brief says "dark surface" and the specification says
both. A brief that contradicts the thing it produced is the exact failure mode
a01 is about, and it would be a poor campaign that introduced one while
documenting it.

---

## 2. The family contract

Everything in this section is identical across both assets. It is what makes
them a set; section 3 and 4 are what makes them two pictures.

### Typography — the site's own three faces

Taken from `apps/web/src/app/layout.tsx`, not chosen for this campaign:

| Role | Face | Where |
| --- | --- | --- |
| Display | **Space Grotesk** (`--font-display`) | The one large figure or headline |
| Sans | **Inter** (`--font-sans`) | Captions, the closing distinction, body labels |
| Mono | **JetBrains Mono** (`--font-mono`) | Every number, every identifier, every script name |

**Every numeral in both assets is mono.** This is not decoration — it is what
makes a right-aligned numeric column align, and it is the same face the reader
meets on `/docs/platforms` one click later. The only exception is a02's large
display figure (section 4).

### Colour — site tokens, not picked values

| Token | Value | Use |
| --- | --- | --- |
| `--foreground` / `--background` | flips per theme | Surface and primary text |
| `--muted-foreground` | neutral-600 | Angular's row, secondary labels, units |
| `--border` | blue-100 | Rules, dividers, column keylines |
| `--primary` | `#1d4ed8` | The single accent. One accent per asset. |
| `--destructive` | red-500 | a01's failure callout **only**. Never in a02. |

`--destructive` appearing in a02 would turn Angular's 31 into a warning. It is a
product state, not a fault.

### The frame treatment — the strongest family signal available

`apps/web/src/app/globals.css` already defines the site's two structural motifs,
and they are what a reader recognises before they read a word:

- **`.kx-frame`** — 10px L-shaped corner ticks, inset 5px, drawn in `--primary`
  at 65% opacity. Not a box: four corners only.
- **`.kx-edges`** — full-height hairline rules at the container's left and right
  margins. Graph-paper structure.

**Both assets carry the corner ticks at the outer frame, at identical inset and
tick length.** a01 additionally uses the edge rules to separate its four gates;
a02 uses a single edge rule to separate the figure from the numeric column. Same
vocabulary, different sentence.

### Spacing

The 8-unit base with a 4-unit half-step (`scripts/check-grid.mjs`). All padding,
gaps and column offsets are multiples of 4; hairlines and optical nudges are
exempt, as in the codebase. Nothing here is checked by a script — it is followed
so the two assets have the same rhythm.

### Legibility floor

**Every label must be readable at 400px wide.** Both briefs state this
independently. It is the binding constraint on both compositions: the feed
thumbnail is what most people will see, and neither asset gets a second look if
its labels dissolve.

---

## 3. a01 — primary asset

Built from `drafts/a01/visual-brief.md` as merged. **Unchanged.** Reproduced
here only as the half of the pair that sets the system.

- **Subject:** *What has to be true before a platform appears on our site* — four
  gates, left to right, then an outcome.
- **Form:** horizontal flow. `① CLAIM → ② SOURCE → ③ API → ④ COMPILER →
  PUBLISHED COVERAGE`, each gate naming its real script (`check:manifest`,
  `check:platform-source`, `check:platform-code`, `native-*.yml`).
- **Failure callout**, offset below gate ②, in `--destructive`: the
  `direction-provider` correction, `91/90/91 → 90/89/90`.
- **Dimensions:** 1200 × 627 landscape; optional 1080 × 1080 square with the
  gates stacked vertically and the callout still attached to gate ②.
- **Themes:** light **and** dark. Dark is the default on X.

**The caption trap, restated because it is easy to lose in production:** the
checks do not run as a pipeline in that order — they are separate CI steps and
the native workflows run in parallel jobs. Caption it *"what has to be true"*.
Never *"our pipeline"*.

**Derivative D** (the Chart code card) carries a trap that post-dates the brief:
a Compose chart now exists, so the component page has a real Android tab. **Draw
the removed snippet; do not screenshot the page.** A screenshot would show
working code beside a caption calling it fiction.

---

## 4. a02 — primary asset

Built from `drafts/a02/visual-brief.md`, with the hierarchy below. That brief
now requires both surfaces; this section says what goes on them.

### Hierarchy

```
            98
        components

        98 where?

   React                98
   SwiftUI              90
   Jetpack Compose      90
   Flutter              90
   Angular              31   preview

   90 / 98  on the four platforms
            meant to carry the full catalogue

   Availability ≠ maturity ≠ verification
```

Four beats: the number, the question, the answer, the distinction. The question
is what makes this a different picture from a01 rather than a restyled one —
a01 shows a process, a02 asks a question and answers it with a column.

### Composition — distinct from a01 by axis

a01 reads **left to right** (a sequence). a02 reads **top to bottom** (a
decomposition). That difference is the whole of the visual distinction, and it
is why no further differentiation is needed or wanted.

- `98` in **Space Grotesk**, display scale, the largest element on the canvas.
- `98 where?` in Inter, roughly one-third the figure's size, directly beneath —
  close enough to read as one unit with the figure, not as a separate headline.
- The platform rows in **JetBrains Mono**, labels left-aligned, numerals
  **right-aligned** so the column edge is a straight line. `98 / 90 / 90 / 90 /
  31` aligning on the right is the argument, made typographically.
- `Availability ≠ maturity ≠ verification` in Inter, `--muted-foreground`,
  separated from the column by a single `.kx-edges` hairline.

### Rules carried from the merged brief

- **Proportional bars, or no bars.** Four 90s and a 31 drawn the same width says
  the opposite of the post. **Prefer no bars** — a right-aligned numeric column
  reads better at thumbnail size and cannot lie about proportion.
- **Angular is different, not diminished.** `31` plus the word `preview`, in
  `--muted-foreground`. No red, no warning icon, no "incomplete".
- **The 90/98 line must name its denominator.** Never a bare "90/98", never
  "90/98 across all five".
- **No verification matrix.** The 7×5 evidence grid is real and is the wrong
  image for a social post. The closing line carries it in words.
- **No scorecard**, no ranking, no percentages, no grades, no ticks against
  crosses.

### Variants

| Channel | Size | Notes |
| --- | --- | --- |
| LinkedIn | 1200 × 1200 | Square; the column gets room. Light **and** dark. |
| X | 1600 × 900 | Breakdown set to the right of the `98`. Dark default. |

### Alt text

> KinetixUI component counts by platform: React 98, SwiftUI 90, Jetpack Compose
> 90, Flutter 90, Angular 31 in preview. 90 of 98 components are on all four
> platforms that carry the full catalogue. Caption: availability is not the same
> as maturity, which is not the same as verification.

The `≠` glyph is spelled out in words. A screen reader announcing "not equals"
three times is not the sentence.

---

## 5. What neither asset may contain

Merged from both "Never make" lists, plus two additions.

- A parity grid of ✅ across platforms. Coverage varies per component; a row of
  checkmarks is the visual form of the claim a01 exists to attack.
- Any chart of stars, downloads or users. None are known.
- Angular alongside the other four without its preview label.
- A screenshot presented as a diagram, or a diagram presented as a screenshot.
- Five equal bars, or the words "98 components on 5 platforms".
- A logo wall, a competitor, or any named alternative.
- **The 20 Blocks.** Blocks are 20 on all five platforms and it is the one number
  in the set that looks like five-platform parity. It is true, it is not what
  either post argues, and on a primary asset it would undo the denominator
  argument in a glance. Keep it out of both primaries. If it ever appears, it is
  a separate asset with its own caption.
- **Anything implying five complete catalogues.** Angular is `catalogComplete:
  false`. Any layout that puts all five platforms in one undifferentiated column
  or one denominator implies otherwise, whatever the caption says.

---

## 6. Numbers protocol

**Every numeral in either asset is re-read from `pnpm marketing:stats`
immediately before export, and never copied from this file or from a brief.**

This is not ceremony. Compose moved 89 → 90 in the single day between a02 being
drafted and its QA. The figures below are what the command printed on 2026-09-24
and are here to be *diffed against*, not used:

```
98 components — 97 stable, 1 beta
React 98 · Angular 31 preview · SwiftUI 90 · Jetpack Compose 90 · Flutter 90
90 of 98 on the four catalogue-complete platforms
8 documented exceptions
Blocks 20 on all five
@kinetixui/angular — NOT PUBLISHED
```

```bash
pnpm marketing:stats
```

If any figure has moved, the asset is not exported until the brief, the post
copy and the alt text all agree with the new reading. A stale number on an image
cannot be corrected after posting; the image is what gets reshared.

---

## 7. Export matrix

| Asset | Size | Theme | Format |
| --- | --- | --- | --- |
| a01 primary | 1200 × 627 | light + dark | PNG |
| a01 primary (square) | 1080 × 1080 | light + dark | PNG, optional |
| a02 primary | 1200 × 1200 | light + dark | PNG |
| a02 primary (X) | 1600 × 900 | light + dark | PNG |

**Tooling:** the repository has an OG-card generator
(`apps/web/src/app/opengraph-image.tsx`, Satori at Next build time) and **not** a
marketing-graphics pipeline. `new ImageResponse(...)` outside a Next runtime
hangs and produces nothing. Both assets are produced in a design tool from this
spec. If campaign visuals become routine, that is the moment to decide whether a
pipeline earns its maintenance — not on the first two.

---

## 8. Sequence

Assets are needed on the days the sequence document already fixes
(`marketing/content/campaign-sequence-a01-a02.md`): a01's primary on **day 0–1**
with LinkedIn A, a02's primary on **day 15** with its LinkedIn post — and day 15
only if a01's day-14 decision says go.

Build a01's first. a02's asset should be made **after** a01's, not in parallel,
so the family resemblance is inherited from a finished artefact rather than
negotiated between two drafts.

**Nothing in this file publishes, schedules or posts anything.** Assets are
produced, reviewed, and attached by a person on the day.
