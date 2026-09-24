---
id: a02
type: visual brief
campaign: kx_count_isnt_coverage
status: drafted
---

# a02 — visual brief

One image. It has to make the argument before anyone reads the post, because on
both channels most people will only see the image.

## The concept: the number, then what it decomposes into

A large `98`, and immediately under it the breakdown that shows 98 was never a
cross-platform number.

```
                98
          components

     React                98
     SwiftUI              90
     Jetpack Compose      90
     Flutter              90
     Angular              31   preview

     90 / 98  on the four platforms meant
              to carry the full catalogue

     Count tells you availability.
     Not maturity. Not verification.
```

## Rules

**Bars must be proportional, or there must be no bars.** If the four 90s and the
31 are drawn the same width, the graphic says the opposite of the post. A plain
right-aligned numeric column is safer than a bar chart and reads better at
thumbnail size — prefer it.

**Angular is visibly different.** `31` plus the word `preview`, in the muted
foreground rather than the action colour. Different, not diminished: no red, no
warning icon, no "incomplete" label. It is a deliberate product state.

**The 90/98 line must name its denominator.** Never a bare "90/98", and never
"90/98 across all five" — Angular is excluded from that denominator by
`catalogComplete: false`, and the caption has to say which four.

**No verification matrix.** The 7×5 evidence grid is real and it is the wrong
image for a social post. The last two lines carry that idea in words instead.

**No scorecard.** No ranking, no percentages, no grades, no green ticks against
red crosses. Platforms are not competing.

## Treatment

Site tokens and mono type — same family as `/docs/platforms`, so the image and
the page a reader lands on look like the same system. `98` in the display face
at the top; the rows in mono so the numeric column aligns. Generous whitespace;
this should be legible as a 400px-wide thumbnail.

**Both a light and a dark surface are required.** An earlier version of this
brief specified dark only, which is right for X and wrong for the pair: a01
exports light and dark, and two posts from the same account a fortnight apart,
one light and one dark, do not read as one campaign. Dark stays the default on
X. See `marketing/content/visual-production-a01-a02.md` for what the two assets
share.

## Variants

- **LinkedIn** — 1200×1200. The square gives the numeric column room.
- **X** — 1600×900. Same content, the breakdown set to the right of the `98`.

Each variant is exported on both surfaces. Four files, not two.

## Alt text

> KinetixUI component counts by platform: React 98, SwiftUI 90, Jetpack Compose
> 90, Flutter 90, Angular 31 in preview. 90 of 98 components are on all four
> platforms that carry the full catalogue. Caption: count tells you
> availability, not maturity or verification.

## Do not

- Do not draw five equal bars.
- Do not write "98 components on 5 platforms".
- Do not put a checkmark next to any platform.
- Do not include a logo wall or a competitor.
- Do not use numbers older than the `marketing:stats` run in the checklist.
