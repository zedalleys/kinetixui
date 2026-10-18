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

## What the repository says now (re-checked 2026-10-18 19:40 UTC on `main`, `984792b`)

Re-verified against the canonical metadata on today's `main`, not carried over from the earlier check: the figures
below are unchanged from the 2026-10-18 reading on `df596cf`, and `pnpm marketing:stats` and
`components.manifest.json` agree.

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

## The correction: one paragraph, dated rather than perpetual

An article is a dated argument, not a statistics page. "Ours, today" promises a figure that is current whenever it
is read, which is a promise the paragraph cannot keep and the reason it went stale in the first place. The
replacement names the day the snapshot was taken, so it stays true as written however long it sits there, and
nobody has to edit it again when the catalogue moves.

Figures only otherwise: the sentence structure, the argument and the tone are the author's and are untouched.

Replace this paragraph on dev.to:

> Ours, today: 98 catalogue entries — 97 components and one documented recipe.
> React 98, SwiftUI 90, Jetpack Compose 90, Flutter 90, and Angular 64 —
> published on npm and explicitly in preview. 90 of 98 on all four catalogue-complete platforms, with
> 8 documented exceptions that each carry a written reason. Angular sits outside
> that denominator because its catalogue is deliberately incomplete; folding it in
> would flatter the number.

with:

> Ours, as of 18 October 2026: 109 catalogue entries — 108 components and one documented recipe.
> React 109, SwiftUI 90, Jetpack Compose 90, Flutter 90, and Angular 80 —
> published on npm and explicitly in preview. 90 of 109 on all four catalogue-complete platforms, with
> 19 documented exceptions that each carry a written reason. Angular sits outside
> that denominator because its catalogue is deliberately incomplete; folding it in
> would flatter the number.

Five numbers change (98 → 109, 97 → 108, React 98 → 109, Angular 64 → 80, 8 → 19, and the denominator in
"90 of 98"), and "today" becomes "as of 18 October 2026" — the day the figures were read. Every other word is the
author's. Use 18 October even if the edit is made later: it dates the measurement, not the edit.

**It claims availability, and must not gain more.** Every figure here counts implementations that exist — what each
platform has a file for. None of it says anything was tested, and nothing in the replacement implies it. Do not add
"verified", "tested" or "production-ready" to this paragraph: of the five platforms, only Angular has runtime
evidence, for 60 of its 80 components, and no native platform has any; React, SwiftUI, Compose and Flutter have no
runtime-verified component at all. The article's verification argument lives in its own sections and is unaffected.

## What stays exactly as it is, and why

- **The historical before/after** (SwiftUI 91 → 90, Compose 90 → 89, Flutter 91 → 90, all-four 90 → 89), the 300
  snippets, and 164 / 182 / 175 symbols. They describe one commit and are pinned by `verify-evidence.mjs`.
- **The next paragraph** ("two of them no longer match the numbers earlier in this piece … taken both back to 90").
  Still true: Compose and the all-four figure are 90 today, against 89 after the correction.
- **"Six of a hundred-odd demo examples"** in the migration section. Today it is 6 of 113. `verify-package.mjs`
  fails its own `< 110` bound for "a hundred-odd", but 113 is still fairly "a hundred-odd". No edit is proposed;
  the bound in the script is the owner's call.
- **LI-001's approved copy.** It uses only historical, past-tense figures and is not touched.

## How to make the edit, by hand (nothing here does it for you)

The live article is edited only by its author, in the dev.to editor. No script in this repository touches dev.to,
and no approval given in a thread changes that.

1. Open <https://dev.to/zedalleys/your-cross-platform-design-system-may-be-lying-about-parity-4bj0> and press
   **Edit** (the dashboard route is `dev.to/dashboard`).
2. Find the paragraph starting "Ours, today: 98 catalogue entries". It appears once. Nothing else in the article
   contains "98 catalogue entries".
3. Replace that paragraph — from "Ours," to "would flatter the number." — with the replacement above. Leave the
   blank line before and after it, and leave the next paragraph ("Those are generated…") exactly as it is: it
   refers back to these numbers and still reads correctly.
4. Do **not** touch the historical before/after figures (SwiftUI 91 → 90 and the rest), the 300 snippets, the
   symbol counts, or the "six of a hundred-odd" line.
5. Save, then reload the published article and check the paragraph reads as intended and the rest is unchanged.
6. Say in the thread that it is done. The repository copy is updated to match in the same follow-up.

dev.to is not reachable from this environment, so neither the current text nor the saved result can be read back
from here; step 5 is the only check there is.

## What happens after the owner edits it

1. The owner pastes the replacement paragraph on dev.to and saves.
2. Claude updates `marketing/content/drafts/a01/article.md` and `devto.md` with the same paragraph, removes the
   `stale` flag from ART-001 in the content register, and runs `node marketing/content/drafts/a01/verify-package.mjs`
   and `pnpm check:content`.
3. `sources.md` and `publish-checklist.md` quote "0.25.0", a version no package has published, inside dated
   2026-10-09 snapshots. Those snapshots stay as written; `sources.md` now carries a 2026-10-18 re-derivation
   block beside them (Angular is 0.25.1 since 11 October). Neither file is on the live article.

Until the owner says the live article was edited, the repository copy stays matching what is live.
