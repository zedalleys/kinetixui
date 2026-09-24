# a01 — sources

Every claim in `article.md`, `linkedin.md` and `x-thread.md` traces to a line
here. Re-run `pnpm marketing:stats` on the day of publishing and re-check the
numbers before posting — they move.

**Numbers verified:** 2026-09-23, against `main` @ `e29184c`, KinetixUI v0.22.1.
**Current-state figures re-derived:** 2026-09-24, against `main` @ `dfd0d81`, still
v0.22.1. Only the *current* columns moved — every historical figure below is tied
to a commit and is unchanged.

## Coverage figures used

From `pnpm marketing:stats` (reads `platform-parity.json` and
`components.manifest.json`, both generated):

| Claim in the piece | Value | Source |
| --- | --- | --- |
| 98 components | 98 | `components.manifest.json` |
| React | 98 / 98 | `platform-parity.json` → `coverage` |
| Angular (preview) | 31 / 98 | same, `platformDefinitions.Angular.maturity = "preview"` |
| SwiftUI | 90 / 98 | same |
| Jetpack Compose | 90 / 98 | same |
| Flutter | 90 / 98 | same |
| On all four complete-catalogue platforms | 90 / 98 | `catalogPlatforms` = React, SwiftUI, Compose, Flutter |
| Documented exceptions | 8 | 98 − 90 |

**Do not** write "all platforms" anywhere. There are five; 90/98 is across four,
and Angular is excluded from that denominator because its catalogue is
deliberately incomplete (`catalogComplete: false`).

## Finding 1 — `direction-provider` claimed three platforms it had none of

- **Before:** `platforms: ["React", "SwiftUI", "Compose", "Flutter"]`
- **After:** `platforms: ["React"]`
- **Evidence:** no direction/RTL provider source file exists in
  `packages/ui-swiftui`, `packages/ui-compose` or `packages/ui-flutter`.
- **Why it was wrong, not just missing:** native frameworks already carry layout
  direction — SwiftUI `environment(\.layoutDirection)`, Compose
  `LocalLayoutDirection`, Flutter `Directionality`. There was nothing to port,
  so the component is React-only *by design*. That is now its `platformNote`.
- **Effect on the published numbers:** SwiftUI 91 → 90, Compose 90 → 89,
  Flutter 91 → 90, full coverage 90 → 89.
- **Caught by:** `scripts/check-platform-source.mjs`, first run.

## Finding 2 — `combobox` claimed a React component that does not exist

- There is no `combobox.tsx` in `packages/ui/src/components` and no `Combobox`
  export in `packages/ui/src/index.ts`.
- It is a documented *recipe* over `Command` (`CommandInput` / `CommandList` /
  `CommandItem`), which the Storybook story builds by hand.
- Now marked `composition: "command"`, and the checker verifies the component it
  composes exists on the same platform rather than looking for a symbol that was
  never meant to exist.

## Finding 3 — `sonner` was a false negative

The checker initially flagged it. It is genuinely implemented everywhere; the
files are `Toaster.swift` and `toaster.dart` — the platform's own word for the
thing. Fixed with `sourceNames` **in the manifest**, next to the claim, not as a
lookup table inside the script.

Worth including in the piece: a verifier that only ever confirms your priors is
not a verifier. This one produced a false positive on its first run and the fix
belonged in the data.

## Finding 4 — the Chart page advertised a Compose API that did not exist

- `chart-demo`'s Compose snippet used `KinetixChart` and `KinetixChartPoint`.
- Neither symbol existed at `c3de388`. There was no `Chart.kt` in
  `packages/ui-compose`, and the manifest already said `chart` was not on Compose
  (`platformNote: "no Recharts equivalent wired for Compose yet"`).
- **Since then:** `Chart.kt` was written (`b604bbc`, 2026-09-23) and `chart` is
  now on Compose. The real `KinetixChart` / `KinetixChartPoint` are close to the
  invented ones — same `label` / `value` / `seriesIndex` shape — but `description`
  is a **required** parameter, so the published snippet still would not compile.
  The piece states this in past tense and says so explicitly; do not let it read
  as though the API were fictional today.
- The snippet's own comment read *"a hand-drawn CustomPaint bar chart"* —
  `CustomPaint` is **Flutter**. The Flutter rationale had been pasted onto an
  invented Compose API.
- The component page rendered it under a tab labelled **"Android"**, with no caveat.
- **Caught by:** `scripts/check-platform-code.mjs`.

## Finding 5 — `data-table-demo` had three faults in one snippet

| Written | Real |
| --- | --- |
| `KinetixDataColumn(...)` | `KinetixColumn<T>(header, cell, sortKey, weight)` |
| `rows = invoices` | `data = invoices` |
| `KinetixColumn("Invoice") { it.invoice }` (trailing lambda) | trailing lambda binds to `weight: Float`, not `cell` — use `cell = { … }` |

Only the first was visible to a symbol check. The other two needed reading the
real signature. **This is the honest limit of symbol-level verification and the
piece should say so.**

## Finding 6 — the Blocks page shipped 33 unverified snippets

- `blocks-content.tsx` was 952 lines: each block's preview as JSX plus
  hand-typed "same" code for React, Compose and Flutter.
- The React snippet had **already drifted from the preview beside it**: Sign in
  displayed `id="email"` while rendering `id="bl-email"`, and the preview
  carried a `defaultValue` the snippet never showed.
- The CTA banner block claimed *"React, SwiftUI, Compose and Flutter from a
  single source"* in four places — with no SwiftUI source at all, and three
  independently hand-written strings.

## The guardrails, as they run in CI

From `.github/workflows/ci.yml`:

| Step | Script | What it proves |
| --- | --- | --- |
| Component manifest check | `check:manifest` | the manifest is internally valid, gaps have reasons |
| Declared platforms are backed by real source | `check:platform-source` | a platform claim has source behind it |
| Component snippet verification | `check:platform-code` | no snippet names an API that does not exist |
| Usage example drift | `check:usage` | migrated snippets match their compiled source |
| Block source verification | `check:block-source` | every block platform has a real file |
| Block snippet drift | `check:blocks` | shown block code is the current file contents |

Verification strength is **stated per platform, not implied uniform**: React and
Angular are checked structurally against package exports; SwiftUI, Compose and
Flutter are checked at file level here and compiled by their own workflows
(`native-swiftui.yml`, `native-compose.yml`, `native-flutter.yml`).

## Things the piece must NOT claim

- No adoption, download, star or user numbers — none are known.
- Not "we solved parity". Coverage is 90/98 with 8 documented exceptions.
- Not that symbol checking proves correctness. See Finding 5.
- Angular must read as preview wherever it appears.
- No competitor named as doing this badly. The category problem is the subject.

## Pre-fix vs. current — do not confuse these

The article quotes the audit **as it stood before the fixes landed**, in past
tense. Both states are recorded here so a later reader does not mistake one for
the other.

| Figure | At audit (pre-fix) | Today on `main` |
| --- | --- | --- |
| Native snippets in `platform-code.ts` | 300 (100 demo keys × 3) | 290 (97 keys; 3 migrated out, 1 deleted) |
| SwiftUI symbols used / unknown | 164 / 0 | 162 / 0 |
| Compose symbols used / unknown | 182 / **3** | 177 / **0** |
| Flutter symbols used / unknown | 175 / 0 | 172 / 0 |
| SwiftUI · Compose · Flutter coverage | 91 · 90 · 91 | 90 · 90 · 90 |
| On all four catalogue platforms | 90 | 90 |
| Demo keys backed by compiled source | 0 | 5 (`button`, `badge`, `switch`, `chart`, `direction-provider`) |

If the piece is published later than 2026-09-24, re-run `pnpm marketing:stats`
and `node marketing/content/drafts/a01/verify-package.mjs` before posting. The
migration line ages fastest — it is the one number most likely to be wrong by
publication, and it has already moved once (3 → 5) between drafting and QA.

## Git verification — every claim traced to a commit

Re-verified 2026-09-23 against `main` @ `e29184c` by reading the commits, not
from recollection. Each row was reproduced with the command shown.

| Claim in the piece | Commit | Verified by |
| --- | --- | --- |
| `check-platform-source.mjs` introduced | `34e5b06` | `git log --diff-filter=A -- scripts/check-platform-source.mjs` |
| `check-platform-code.mjs` introduced | `c3de388` | same, for that path |
| Coverage before the correction: React 98, SwiftUI **91**, Compose **90**, Flutter **91**, all-four **90** | `34e5b06~1` | counted from `git show 34e5b06~1:components.manifest.json` |
| Coverage after: SwiftUI **90**, Compose **89**, Flutter **90**, all-four **89** | `34e5b06` | same, at the commit |
| `direction-provider` claimed all four and had no native source | `34e5b06~1` | entry was `platforms: ["React","SwiftUI","Compose","Flutter"]`, no `platformNote` |
| …corrected to React-only with a written reason | `34e5b06` | entry is now `["React"]` + `platformNote` |
| `combobox` was an unexplained "standing non-port" | `34e5b06~1` | `platformNote: "standing non-port"`, no `composition` |
| …now declared `composition: "command"` | `34e5b06` | current manifest |
| `sonner` had no `sourceNames` (hence the false positive) | `34e5b06~1` | entry had no alias; now `{SwiftUI: "Toaster", Flutter: "toaster"}` |
| 100 demo keys × 3 = **300** hand-written snippets | `c3de388~1` | parsed from `platform-code.ts` at that commit |
| Symbols used: SwiftUI **164**, Compose **182**, Flutter **175** | `c3de388~1` | same parse |
| `chart-demo` Compose snippet used `KinetixChart` / `KinetixChartPoint` under a "hand-drawn CustomPaint" comment | `c3de388` | removed lines in `git show c3de388 -- apps/web/src/registry/platform-code.ts` |
| `data-table-demo`: `KinetixDataColumn` → `KinetixColumn(..., cell = …)`, `rows =` → `data =` | `c3de388` | the `-`/`+` lines in that diff |
| `blocks-content.tsx` was **952 lines** | `41fe16b~1` | `git show 41fe16b~1:… \| wc -l` |
| Sign in displayed `id="email"` while rendering `id="bl-email"` | `41fe16b~1` | lines 58 and 149 of that file |
| "from a single source" appeared **4** times | `41fe16b~1` | `grep -c` on that file |

### A verification mistake worth keeping

The first pass at this table was wrong, and the way it was wrong is on-topic.

`git show 34e5b06^:components.manifest.json` was run through `execSync`, which
uses `cmd.exe` on Windows — where `^` is the escape character. The ref silently
became `34e5b06`, so the "before" and "after" were the same commit and the diff
showed no change at all. Using `~1` fixed it.

A check that quietly compares something to itself reports success. That is the
same failure the article is about, one layer up, so it is worth remembering
before trusting any tooling that "found nothing".

---

# Current repository state — 2026-09-24

Use this for the "ours, today" paragraph. `main` @ `dfd0d81`, v0.22.1 MIT. From
`pnpm marketing:stats`:

| | |
| --- | --- |
| Components | 98 |
| Lifecycle | 97 stable, 1 beta |
| React | 98 / 98 |
| Angular | 31 / 98 — **preview**, `catalogComplete: false` |
| SwiftUI | 90 / 98 |
| Jetpack Compose | 90 / 98 |
| Flutter | 90 / 98 |
| On all four catalogue-complete platforms | **90 / 98** |
| Documented exceptions | 8 |
| Blocks | 20, on all five platforms |
| npm | `ui`, `cli`, `tokens` at 0.22.1; **`angular` unpublished** |

Snippet migration, counted directly (not covered by `marketing:stats`):

| | |
| --- | --- |
| Demo keys carrying native code | 101 |
| With ≥1 native snippet from a compiled file | **5** (`button`, `badge`, `switch`, `chart`, `direction-provider`) |
| Compiled native snippets | 13 |
| Still hand-written in `platform-code.ts` | 97 keys / **290 snippets** |
| Angular examples, all compiler-extracted | 33 |

The article's migration line is the fastest-ageing sentence in the piece. It read
"three of a hundred" at the 2026-09-23 freeze and is **five** as of 2026-09-24 —
one day, one change. `verify-package.mjs` now fails the package when it drifts
again, so this does not have to be caught by eye.

## Historical vs current — never mix these

The article quotes the audit *as it stood*, in past tense, tied to commits.
Current figures appear only in the "ours, today" paragraph.

| Figure | Historical (commit) | Current (`dfd0d81`) |
| --- | --- | --- |
| SwiftUI · Compose · Flutter | 91 · 90 · 91 (`34e5b06~1`) | 90 · 90 · 90 |
| On all four | 90 (`34e5b06~1`) | 90 |
| Snippets in `platform-code.ts` | 300 (`c3de388~1`) | 290 |
| Symbols used SwiftUI/Compose/Flutter | 164 / 182 / 175 (`c3de388~1`) | not re-counted; 0 unknown |
| Unknown Compose symbols | 3 (`c3de388~1`) | 0 |
| Demo keys from compiled source | 0 | 5 |
| `chart` on Compose | no (`c3de388`) | yes (`b604bbc`) |

**Do not refresh the historical column.** Replacing 91/90/91 with today's
numbers would destroy the before/after that the article rests on.

**The all-four figure now reads 90 in both columns, and that is not an error.**
The correction took it 90 → 89; a Compose chart written afterwards took it back
to 90. The article says this explicitly rather than leaving a reader to notice
that its "before" and its "today" agree. Same number, different reason — one was
a claim, the other is an implementation.

## Re-verification, 2026-09-23

All 27 commit-derived claims re-checked programmatically against git.
Result: **27/27 verified.** Refs use `~1` throughout.

Covered: coverage before/after (`34e5b06~1` vs `34e5b06`); the
`direction-provider`, `combobox` and `sonner` entries in both states;
`platform-code.ts` key/snippet/symbol counts at `c3de388~1`; the `chart-demo`
and `data-table-demo` diff lines in `c3de388`; `blocks-content.tsx` line count,
the `id="email"` / `id="bl-email"` drift and the four "from a single source"
occurrences at `41fe16b~1`; and the commits that introduced
`check-platform-source.mjs` (`34e5b06`), `check-platform-code.mjs` (`c3de388`)
and `check-block-source.mjs` (`41fe16b`).

### The `^` mistake — keep this

The first attempt at the table reported **no change at all** between before and
after. `git show 34e5b06^:…` was run through `execSync`, which uses `cmd.exe` on
Windows, where `^` is the escape character. The ref silently became `34e5b06`,
so "before" and "after" were the same commit. Using `~1` fixed it.

A check that quietly compares something to itself reports success. That is the
article's own thesis one layer up, and the reason every ref in the verification
script is `~1`.

**Internal only.** The public article does not mention it — it is a shell quirk,
and the piece is about design-system verification, not Windows escaping.
