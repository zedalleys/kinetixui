---
id: a02
type: source ledger
campaign: kx_count_isnt_coverage
status: drafted
baseline_commit: 75945b7
generated: 2026-09-24
---

# a02 — source ledger

Every factual claim in the a02 package, mapped to the file that produces it.
Regenerate with **`pnpm marketing:stats`**; it prints all of this from the
generated sources in one pass.

Nothing here was carried over from a previous campaign or from memory. a01 has
since been re-baselined too, so the two packages now state the same *current*
figures — but a01 additionally carries frozen before/after evidence (SwiftUI
91 → 90, Compose 90 → 89, Flutter 91 → 90, all-four 90 → 89) that is pinned to
commit `34e5b06` and is **not** a description of today. **Never quote an a01
number here.** Re-derive from the sources below instead; the two packages agree
because both read the manifest, not because either copied the other.

## Current-state facts — all volatile, all regenerate

| Claim in the copy | Value | Source | Generator |
| --- | --- | --- | --- |
| Components | 98 | `components.manifest.json` → `components` | — |
| React implementations | 98 | `platform-parity.json` → `components` | `gen:manifest` |
| SwiftUI implementations | 90 | same | `gen:manifest` |
| Jetpack Compose implementations | 90 | same | `gen:manifest` |
| Flutter implementations | 90 | same | `gen:manifest` |
| Angular implementations | 31 | same | `gen:manifest` |
| On all four catalogue-complete platforms | **90 / 98** | `platformDefinitions[].catalogComplete` → React, SwiftUI, Compose, Flutter | `gen:manifest` |
| Documented exceptions | 8 | the complement of the above; each has a `platformNote` | `gen:manifest` |
| Angular package maturity | `preview` | `platformDefinitions.Angular.maturity` | — |
| Angular catalogue-complete | `false` | `platformDefinitions.Angular.catalogComplete` | — |
| React package maturity | `stable` | `platformDefinitions.React.maturity` | — |
| React catalogue verification | `beta` | `platform-parity.json` → `catalogueVerification.React` | `gen:verification` |
| SwiftUI / Compose / Flutter verification | `experimental` | same | `gen:verification` |
| Component lifecycle | 97 stable, 1 beta | `component-status.json` | `gen:manifest` |
| Blocks | 20, all five platforms | `block-parity.json` | `gen:blocks` |
| Published on npm | `@kinetixui/{ui,cli,tokens}` 0.22.1 | live `npm view <pkg> version` | `marketing:stats` |
| Not published | `@kinetixui/angular` | live `npm view` returned 404 | `marketing:stats` |
| Version | 0.22.1 | `packages/ui/package.json` | — |

## The two claims that need their wording checked, not just their value

**"90 of 98 on the four platforms meant to carry the whole catalogue."**
The denominator is four, not five, because `catalogComplete` is `false` for
Angular. Writing "90/98 across all five" is false, and writing a bare "90/98"
invites the reader to supply the wrong denominator themselves.

**"Stable package, beta verification."**
Two different fields: `platformDefinitions.React.maturity` = `stable` and
`catalogueVerification.React` = `beta`. One is about the library's API, the
other about how much evidence stands behind its implementations. Never write one
and mean the other, and never average them into a single word like "mature".

## The eight documented exceptions

Named in the copy: `combobox` (a documented composition of `Command`, not a
component) and `native-select` (`KinetixSelect` already wraps each platform's own
picker). The full set, each with a `platformNote` in `components.manifest.json`:

`avatar-group` · `combobox` · `direction-provider` · `form` · `kanban-board` ·
`native-select` · `navigation-menu` · `tour`

They are three different kinds — a standing non-port, a composition that was
never a component, and a case the platform already solves — which is the point
the copy makes. Do not describe them as one thing.

## Historical examples — clearly separated

Used only in the standalone post S4, and framed as past events:

| Example | Evidence |
| --- | --- |
| The homepage fan hard-coded four platforms while Angular was already shipping | PR #213, `apps/web/src/components/hero-token-fan.tsx` before/after; the list was `["React","SwiftUI","Compose","Flutter"]` and the eyebrow read "one token → four platforms" |

Do not present a historical figure as a current one. a01's before/after numbers
belong to the correction it describes, and must not appear in a02 copy at all —
a02 has no historical column, and every figure it prints is current by default.

## Not claimed anywhere in this package

- No adoption, download or user numbers — we have none worth citing.
- No comparison to a named competitor.
- No install command for `@kinetixui/angular` or any native library.
- No claim that five catalogues are equal.
- No claim that a low verification level means the code does not work.
