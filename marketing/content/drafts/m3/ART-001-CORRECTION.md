---
id: ART-001
type: correction proposal for a live article
prepared: 2026-10-18
status: PROPOSED. Not applied. The live dev.to article is edited only by the owner, and only if the owner says so
---

# ART-001 — the smallest correction to the live article

ART-001 ([dev.to](https://dev.to/zedalleys/your-cross-platform-design-system-may-be-lying-about-parity-4bj0)) is
flagged `stale` in `marketing/content/register.json`. Of the article's sections, only the paragraph that begins
"Ours, today:" states current figures. Everything else is history tied to a commit, and stays as it is.

## What the repository says now (checked 2026-10-18 on `main`, `df596cf`)

`node marketing/content/drafts/a01/verify-package.mjs` re-derives every current figure from
`components.manifest.json`:

| Figure | Live article says | Repository now | Source |
| --- | --- | --- | --- |
| Catalogue entries | 98 (97 components + 1 recipe) | **109** (108 components + 1 recipe, `combobox`) | `components.manifest.json`, 109 entries |
| React | 98 | **109** | each entry's `platforms` |
| SwiftUI / Jetpack Compose / Flutter | 90 / 90 / 90 | **90 / 90 / 90** (unchanged) | same |
| Angular (preview) | 64 | **80** | same; still preview, still outside the denominator |
| On all four catalogue-complete platforms | 90 of 98 | **90 of 109** | React, SwiftUI, Compose, Flutter all listed |
| Documented exceptions | 8 | **19** | 109 − 90; each of the 19 carries a `platformNote` in the manifest, so "each carry a written reason" still holds |

The brief's reported figures (109, Angular 80) are confirmed. Two more figures in the same paragraph moved as well
(React 98 → 109, exceptions 8 → 19), so replacing only the two named numbers would leave the paragraph
contradicting itself.

## The correction: one paragraph, figures only

Replace this paragraph on dev.to:

> Ours, today: 98 catalogue entries — 97 components and one documented recipe.
> React 98, SwiftUI 90, Jetpack Compose 90, Flutter 90, and Angular 64 —
> published on npm and explicitly in preview. 90 of 98 on all four catalogue-complete platforms, with
> 8 documented exceptions that each carry a written reason. Angular sits outside
> that denominator because its catalogue is deliberately incomplete; folding it in
> would flatter the number.

with:

> Ours, today (updated 19 October 2026): 109 catalogue entries — 108 components and one documented recipe.
> React 109, SwiftUI 90, Jetpack Compose 90, Flutter 90, and Angular 80 —
> published on npm and explicitly in preview. 90 of 109 on all four catalogue-complete platforms, with
> 19 documented exceptions that each carry a written reason. Angular sits outside
> that denominator because its catalogue is deliberately incomplete; folding it in
> would flatter the number.

Only numbers change, plus "(updated 19 October 2026)" so a reader who saw the old figures knows the paragraph was
edited and when. If the edit lands on another day, use that day's date.

## What stays exactly as it is, and why

- **The historical before/after** (SwiftUI 91 → 90, Compose 90 → 89, Flutter 91 → 90, all-four 90 → 89), the 300
  snippets, and 164 / 182 / 175 symbols. They describe one commit and are pinned by `verify-evidence.mjs`.
- **The next paragraph** ("two of them no longer match the numbers earlier in this piece … taken both back to 90").
  Still true: Compose and the all-four figure are 90 today, against 89 after the correction.
- **"Six of a hundred-odd demo examples"** in the migration section. Today it is 6 of 113. `verify-package.mjs`
  fails its own `< 110` bound for "a hundred-odd", but 113 is still fairly "a hundred-odd". No edit is proposed;
  the bound in the script is the owner's call.
- **LI-001's approved copy.** It uses only historical, past-tense figures and is not touched.

## What happens after the owner edits it

1. The owner pastes the replacement paragraph on dev.to and saves.
2. Claude updates `marketing/content/drafts/a01/article.md` and `devto.md` with the same paragraph, removes the
   `stale` flag from ART-001 in the content register, and runs `node marketing/content/drafts/a01/verify-package.mjs`
   and `pnpm check:content`.
3. The internal `sources.md` and `publish-checklist.md` still quote "0.25.0", a version no package has published;
   that is fixed in the same follow-up. They are not on the live article.

Until the owner says the live article was edited, the repository copy stays matching what is live.
