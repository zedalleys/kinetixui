# Arabian Editorial Engraving — KinetixUI's website decorative direction

Established 2026-10-19 against `main` `07bf383`. This document is the single canonical specification of
KinetixUI's **website decorative art direction**. Claude project instructions §28 points here and does not
restate it, so the two cannot drift.

**Scope of this document: documentation only.** Establishing the direction changes no component, no token,
no generated artifact and no product claim. Each rollout stage in §8 beyond stage 1 needs its own
authorization.

Evidence words used below, weakest first:

- **direction** — an approved decision recorded here, not yet a rendered fact.
- **source** — read from the repository.
- **rendered** — measured in a browser against a real build.
- **reference** — observed or measured in the canonical screenshots (§2). A reference statement is about
  what the approved footer looks like; it is never an accessibility or performance result.

---

## 1. What the direction is

KinetixUI's website decoration is **fine topographical engraving**: etching, cross-hatching, stippling and
line-based shading, in the manner of a 19th-century copperplate landscape plate.

| Dimension | The direction |
| --- | --- |
| Technique | Etching, cross-hatching, stippling, line-based shading. **By day**, tone comes from line density, never from a soft airbrushed gradient. **At evening** the plate carries its tone as masses instead — see "two registers" below, which is the direction for night and not a relaxation of it. |
| Ink | Deep indigo by day. At night the same indigo family, re-lit: the land reads as near-black masses against a slightly lighter sky, with edges rather than hatching carrying the form. |
| Paper | Pale, slightly cool printed surface by day, with restrained grain. Not warm parchment. In dark mode the sheet is the dark `accent`, and the grain stays. |
| Subject | Arabian dunes, sandstone mesas, oasis water, palms, expansive skies. Figures (a small caravan) read at the scale of staffage, not as a focal subject. |
| Composition | Spacious contemporary editorial. Generous empty sky, a low horizon, clear space around text and navigation. |
| Typography | The site's existing type system, unchanged. The direction adds no display face and no lettering inside the art. |
| Themes | **One scene, two plates: day and evening.** Each theme gets its own plate of the same landscape, inked in that theme's values of the same tokens. Never an inversion of one plate into the other, and never one plate filtered into the other. Approved by Ziad on 2026-10-19 and shipped for the footer by PR #435. |
| Frequency | Selective illustration and page framing. A shared decorative vocabulary, not illustration in every section. |

**This direction supersedes earlier suggestions** of bright-blue woodcuts, mandatory warm parchment and
architecture-heavy scenes (a Najdi town). Those were explored on the footer branch and set aside; the
approved footer is the reference, and the superseded versions survive only in that branch's commit history
and in the Figma working file. *(source: PR #432 description, "The PR went through earlier art directions".)*

### Why these choices, not merely what

- **Engraving rather than flat vector or photography.** Line density is a tonal system, so one plate holds
  foreground, middle distance and sky without colour; it sits beside a token-driven interface without
  competing with it for colour meaning.
- **Two plates rather than one inverted plate.** An engraving inverted for dark mode reads as a
  photographic negative: the lines become light-on-dark, which is a different printing process and a
  different object. The rule that matters is **never invert**; the way to honour it in dark mode is a second
  plate of the same scene at night, not a filter over the first. Dimming one pale sheet was the earlier
  reading of the same rule, and the evening plate replaces it — see §2's note on what that supersedes.
  *(direction, decided 2026-10-19; shipped by PR #435, merged to `main` as `295dae91`.)*
- **Two registers, one technique.** The day plate is the direction at full line density. The evening plate
  is deliberately quieter: its tone is carried by masses, silhouettes and lit edges rather than by
  hatching. **That is the art direction for night, not a shortfall in it.** Measured on the shipped
  plates, line detail is 45.49% by day against 2.45% at evening; refined higher-density candidates were
  built and reviewed, and the owner chose to keep the shipped evening plate. So a later session should
  read the evening figure as the intent, and should **not** raise line density, contrast, brightness or
  strength to close the gap. *(direction, decided 2026-10-21; measured on
  `arabian-landscape-1920.webp` and `arabian-landscape-evening-1920.webp`.)*
- **Spacious composition.** Decoration earns its place by giving editorial surfaces air, not by filling
  them. Empty sky is where the bottom bar and the headings sit.

## 2. Canonical visual references

The canonical reference for **light mode** is Ziad's approved footer screenshot **`azink-1440.png`**,
supplied on 2026-10-19 and read. It shows the footer at a 1440px viewport and is what later light surfaces
are compared against.

The canonical reference for **dark mode** is **`azink-dark-evening-1440.png`**, approved by Ziad on
2026-10-21. It is the footer in dark mode at the same framing and density as the light reference —
2880 × 1572, a 1440 × 785 logical frame at `deviceScaleFactor: 2` — rendered from a production build of
the committed footer, which serves `arabian-landscape-evening-2880.webp` at that pixel ratio.

The two are different kinds of artefact and the difference matters when citing them. The light reference
is a design screenshot: it records the intent. The dark one is a render of the shipped page: it records
what the build produces. There is no dark design screenshot of the evening scene, and inventing one would
be generating artwork. So the dark reference answers "has the evening footer changed?" rather than "does
the evening footer match the intent?", and a future dark surface is compared to it on that basis.

What the approval covers is **how the dark footer looks**. It is not an accessibility or performance
result; those stay with the measurements, as below.

`azink-dark-1440.png`, supplied in the same batch as the light reference, shows the dimmed-pale-sheet
treatment the evening plate replaces (see "What the dark screenshot now documents" below). It is the
record of a superseded treatment and not a reference.

What the light screenshot establishes, as measurements taken from the images rather than from a browser
session:

- **The paper is `accent`.** The plain panel samples `#f0f7ff` in the light screenshot — `blue.50`, the
  value §3 records from source. The sheet is pale and slightly cool, not warm. *(reference)*
- **Neither plate is an inversion of the other.** This is the rule that outlives any one treatment, and it
  is cheap to re-check on a future surface: sample both themes at the same points and compare. On the two
  supplied screenshots, 11,454 random colour channels gave the dark image as a uniform **0.850×** the light
  one with **not one channel lighter in dark mode** — that is a dim, which is also not an inversion. The
  evening plate satisfies the rule a different way: it is a separate drawing of the same scene at night,
  so no pixel of it is derived from the light plate at all. *(reference, for the dim; source, for the
  evening plate.)*
- **The grain is present and restrained.** Rows of plain paper carry a standard deviation of about 0.5 of
  255 — visible as texture, far below anything that would disturb the type on it. *(reference)*
- **The composition matches §1.** Low horizon, open cloud band, palms and oasis pool centred, flat-topped
  mesas across the middle distance, a small caravan at the left, cross-hatched dunes in the foreground.
  Tone is carried by line density throughout; there is no soft gradient in the art. *(reference)*
- **Text sits on paper, not on line work.** The four link columns, the tagline and the mark are all on the
  plain panel above the plate; the plate fades in beneath the divider, so the copyright and credit bar sits
  in the empty sky rather than over the engraving. *(reference)*

What the dark reference establishes, read from the approved render:

- **The evening plate is the same scene, not the light one processed.** Palm grove, oasis pool, flat-topped
  mesas, cross-hatched dunes and the caravan at left are all in their §1 positions, at night. *(reference)*
- **The two registers of §1 are visible.** The cloud band carries engraved line work; the land below reads
  as tonal masses and lit edges rather than as hatching. This is what "tone carried as masses at evening"
  looks like at the size the plate is served, and it is why the plate's line-detail figure should not be
  read as a density target missed. *(reference)*
- **Text sits on paper here too.** The columns, tagline and mark are on the dark `accent` panel, and the
  bottom bar sits in the empty sky above the plate, as in light mode. *(reference)*

These are visual observations. They are **not** accessibility or performance results: contrast ratios, axe
runs, layout-shift and payload figures come from the measurements PR #432 and #434 record, and §3 and §5
keep them separate on purpose. That applies to the dark reference exactly as it does to the light one —
its approval says the footer looks right, not that it measures right.

### What the dark screenshot now documents

`azink-dark-1440.png` shows the footer as it was before PR #435: one pale plate, dimmed to 85% in dark
mode, with `.kx-print-surface` pinning the footer's tokens to their light aliases. `main` no longer renders
that — PR #435 merged as `295dae91` on 2026-10-19. Keep the file as the record of what the first reading of
"never invert" looked like, but do not compare a new dark surface to it.

Repository-side references, in priority order:

1. `design-assets/kinetixui-footer-arabian-landscape.png` — the master day plate. *(source)*
2. `design-assets/kinetixui-footer-arabian-landscape-evening.png` — the master evening plate, and
   `design-assets/source/oasis-engraving-source-1920.png`, the untinted engraving both are inked from.
   *(source, on `main` since `295dae91`.)*
3. `design-assets/kinetixui-footer-arabian-engraving.png`, `…-panorama.png`, `…-panorama.webp` — companion
   masters. *(source)*
4. `apps/web/public/footer/arabian-landscape-*.webp`, `arabian-landscape-evening-*.webp` and
   `paper-grain.webp` — the shipped derivatives, the evening set and the 3840/5760 widths included.
   *(source)*
5. The Figma working file, which keeps every version including the superseded directions.

An approved screenshot is the canonical reference for what the direction *looks like*; the repository
assets stay the production source of truth for the plates themselves.

## 3. The approved footer as the baseline

The site footer, merged to `main` as `da03a56` (PR #432) on 2026-10-19, is the first and, as of this
document, the only surface carrying the direction. It is the baseline every later surface is measured
against.

Its dark half changed the same day: PR #435 merged as `295dae91` on 2026-10-19 and replaced the dimmed pale
sheet with the evening plate. The rows below record the current state, and mark the superseded one where
knowing it still matters. Recorded here so later work does not re-derive it:

| Element | How it is made | Evidence |
| --- | --- | --- |
| Paper | The `accent` semantic token — `blue.50` `#f0f7ff`, a pale cool white — as the footer panel, with the plate printed on that same paper so the engraved sky runs into the link area. | source |
| Ink | The `azure` ramp that `primary` comes from: `azure.1000` `#0f172a` and `azure.950` `#172554` for the ink, `azure.900` `#1e3a8a` for mid-tones. Baked into the image; the component carries no hex value. | source |
| Grain | One seamless 384px tile blended `overlay` across the whole footer, so panel and plate read as one sheet. | source |
| Theme behavior | Two plates: the day plate is `dark:hidden`, the evening plate `hidden dark:block`, each `object-cover object-bottom`. Dark mode's paper is the dark `accent` — `blue.700` `#102432` — over the dark `background` `blue.900` `#050c11`, with the footer's tokens resolving normally. No token value changes, no token is added. | source (`main` at `295dae91`) |
| Theme behavior, superseded | PR #432 shipped `.kx-print-surface`, which re-pointed `foreground`, `primary`, `primary-foreground`, `border`, `ring`, `accent` and `surface-grouped` to their light-theme aliases inside the footer, and dimmed dark mode to 85%. PR #435 removed both the class and the dim. Recorded because the gate work in PR #434 was written against it. | source |
| Accessibility | The plate is an `aria-hidden` `<img alt="">` — out of the accessibility tree, out of selection, out of contrast audits. Text sits on the paper, not on the art. | source |
| Subject | Palm grove, oasis pool, flat-topped sandstone mesas, cross-hatched dunes, a small camel caravan at left, a wide cloud band over an open sky. The oasis sits in the middle 30–70% of the plate so phone crops keep it. | source (master plate + component comment) |
| Appearance at 1440, light | The canonical screenshot confirms it: paper `#f0f7ff`, grain present at about 0.5/255 on plain paper, the plate fading in below the divider so the bottom bar sits in open sky. §2 has the measurements. | reference |
| Appearance at 1440, dark | `azink-dark-evening-1440.png`, approved 2026-10-21, confirms it: the same oasis scene at night, the palms, mesas, dunes and oasis water carried as tonal masses and lit edges, the cloud band carrying line work, the caravan readable at left, and the bottom bar in open sky. Sampled from `arabian-landscape-evening-1920.webp`: sky top `(15,36,50)`, horizon `(10,18,24)`, foreground land `(5,15,21)`, water `(13,25,32)`. | reference, for the appearance; source, for the samples |
| What the evening plate does not contain | **No glow at the horizon:** the brightest sky is the lit cloud band *above* it, at 25% of plate height, about 43/255 against a 31/255 upper sky; below that band the plate darkens to about 16/255, monotonically at 1920w and with small rises near 45% and 65–70% at 2880w. **No legible stars:** the upper sky carries scattered stipple specks, the brightest 26.4/255 above its local background, only four pixels above 16/255 and none above 30/255, visible only under a roughly 3× brightness boost. **No rim-lit edges on the land.** None of these is a defect — the plate is the approved art direction for night, per §1's two registers. The row exists because the component comment on `main` describes all three as present; PR #437 corrects that comment. Measured on `arabian-landscape-evening-2880.webp`, except the line-detail figures in §1, which are 1920w. | source |
| Accessibility and performance results | PR #432 records Chromium checks at 1440/768/390, light and dark, LTR and RTL, with no horizontal overflow, no axe violation and CLS delta 0.0000; PR #434 re-measures contrast, tree, layout and motion through `check:engraving`. **The screenshots do not establish any of these** and this document does not re-verify them. | source (those PRs' records) |

## 4. What the direction does not touch

The decorative scope stops at decoration. Outside it, permanently:

- Functional controls and any component state.
- Charts and data visualization.
- Code samples.
- Component thumbnails and catalogue previews.
- Live demos and previews.
- Every native component on SwiftUI, Compose and Flutter, and every Angular component.

And, as rules rather than surfaces:

- **No token value changes.** The direction is expressed with existing semantic tokens and existing palette
  steps. A decorative need is never a reason to move a token. *(The footer baseline meets this: no file
  under `tokens/` appears in PR #432's diff — source, its changed-file list.)*
- **No new product claim.** Decoration says nothing about platform coverage, verification, maturity or
  readiness. Nothing in this direction may be cited as evidence for a capability claim.
- **No new public API.** Decorative surfaces are composed in `apps/web`, not exported from `packages/ui`.
- **The core library stays neutral and themeable.** This is the *website's* decorative vocabulary, not a
  theme KinetixUI's consumers inherit. A product team adopting KinetixUI gets the neutral system; it does
  not get Arabian engravings.

## 5. Accessibility contract for decorative art

Non-negotiable for every surface that adopts the direction:

1. Decorative art is `aria-hidden` with an empty `alt`, never a described image, because it carries no
   information a reader would otherwise miss.
2. **Text never sits on engraved line work.** It sits on the plain paper area. Contrast is measured against
   the paper, and all of it — including secondary text — must hold WCAG 2.1 AA at its size.
3. Focus visibility is unaffected. A focus ring over a decorative surface keeps its contrast against that
   surface, which is why the footer sets `ring-offset-accent` rather than inheriting a page-background
   offset.
4. RTL: the art does not mirror (a landscape is not a directional glyph), but the layout around it does, and
   a decorative surface must not introduce horizontal overflow under `dir="rtl"`.
5. Large text: at 200% the decorative box must yield before the text does. Art is clipped or shortened;
   copy is never shrunk, clipped or hidden to make room for art.
6. Responsive: a decorative image declares its intrinsic ratio so it reserves its space and nothing shifts
   when it loads.
7. Reduced motion: decorative art is static by default. Any motion added to it later must follow `MOTION.md`
   in full — a trigger, a property, a purpose, a duration, an easing and a reduced-motion form — and under
   `prefers-reduced-motion` the surface reaches its correct final state with no movement.
8. Weight is an accessibility concern too: decorative images lazy-load and never block the route.

## 6. What this direction explicitly preserves

Recorded so that adopting it is never read as relaxing anything:

- The product mission, and the neutral, themeable core design system.
- Native, idiomatic platform implementations, and truthful coverage claims.
- Semantic tokens, component contracts and the generated-source architecture.
- Accessibility, focus visibility, RTL, large text, responsive behavior and reduced motion.
- The existing marketing strategy, roadmap, publication gates and analytics.
- Active PR boundaries and stacked-branch dependencies.

## 7. How a surface adopts the direction

1. Name the surface and the reason decoration helps it. "It would look nicer" is not a reason; "this page is
   a wall of text and needs an editorial break" is.
2. Reuse an existing plate or crop before commissioning a new one.
3. Print it on the same pale paper, in the same indigo ink, with the same grain — and, where the surface
   carries art in both themes, give dark its own plate of the same scene rather than a filter over the light
   one.
4. Keep the text off the line work; measure contrast against the paper.
5. Check light, dark, RTL, 390/768/1440 and 200% text.
6. Confirm the page weight cost, and that the art lazy-loads.
7. Record the surface in §8 as shipped.

## 8. Staged rollout

| Stage | What | Status |
| --- | --- | --- |
| 1 | Establish documentation and canonical references — this document and Claude instructions §28. | In progress (this change). |
| 2 | Validate the approved footer as the baseline. | **Done, both themes.** Light: PR #432 merged to `main` as `da03a56` on 2026-10-19, appearance confirmed against `azink-1440.png`. Dark: the evening plate merged as `295dae91` on 2026-10-19, the owner chose it over two refined candidates on 2026-10-21, and its appearance is confirmed against `azink-dark-evening-1440.png`, approved the same day. |
| 3 | Pilot **one** restrained homepage accent. | Not started. One accent, one measurement, one decision. |
| 4 | Extend selectively to marketing and editorial surfaces. | Not started. |
| 5 | Consider minimal documentation and catalogue framing, **after** the overlapping catalogue work (CAT-1 #413, CAT-QF #428, CAT-2 #430) is reconciled. | Not started, and explicitly blocked on that reconciliation. |

**Each stage from 2 onward requires separate authorization before any implementation.** A stage is not
started because the previous one landed.

## 9. Open questions

- Whether the direction gets a gate of its own (for example, one that fails if decorative art enters the
  accessibility tree, or if a decorative surface ships without a dark-mode check) is a stage-3 question, not
  a stage-1 one.
- ~~An approved dark screenshot of the evening footer is still needed.~~ **Closed 2026-10-21:**
  `azink-dark-evening-1440.png` is approved and §2 carries it. Dark-mode statements about *appearance* are
  now **reference**; dark-mode measurements remain what they were.
- PR #434 (`.kx-paper`, `check:engraving`) was written against the dimmed-sheet footer, which PR #435 has
  since rewritten on `main`. It has been reconciled: `main` is merged in, the dark dim and
  `.kx-print-surface` are gone, and every ratio was re-measured against the rendered two-plate footer.
  §10.1 and §10.3 record the result.

---

## 10. Decorative primitives (AE-2A)

Stage 1 of §8 established the direction. AE-2A establishes the parts of it that are the same on every
surface, so that stages 3 onward compose them rather than re-deriving them. It adopts no new surface: the
footer is still the only one printing on the direction.

### 10.1 Shipped

**`.kx-paper`** — the printed sheet, in `apps/web/src/app/globals.css`. It is the `accent` panel, the
`foreground` text colour and the 384px grain tile at 0.22 blended `overlay`, in one class. Those values
were inline on `site-footer.tsx`; a second surface would have copied them and the copies would have
drifted. It adds no token, no colour and no asset — the tile is the one PR #432 already ships.

The footer carries `kx-paper overflow-hidden` and no grain `<div>`. **Its rendering is unchanged**: 0.000%
of pixels differ between that form and the literal declarations it replaced, in both themes.
*(rendered — `check:engraving`, `parity`.)*

**It carries no theme branch.** AE-2A was first written against the footer PR #432 shipped, where one pale
plate was dimmed to 85% for dark mode and `.kx-print-surface` pinned the footer's tokens light so there was
something to dim. PR #435 (`295dae91`) replaced that with a second plate drawn for the dark theme and
removed both. `.kx-paper` lost the dim with them, and `.kx-print-surface` is gone from the stylesheet
altogether — the `ships` row now fails if it comes back, because its return is how the two-plate footer
would quietly regain a light-pinned dark theme.

This is the better shape of the rule in §5, not a concession to #435. **A surface that needs a dark
treatment supplies dark artwork; it does not dim the light one, and it never inverts it.** The sheet is
`accent` and `foreground` resolving per theme, and the art on top is the plate inked for that theme.

The owner ratified the shipped evening plate on 2026-10-21, so the arrangement `.kx-paper` is shaped
around is settled rather than provisional: two assets, one per theme, with no filter between a plate and
the sheet. What currently holds that is the `paper` row, which asks the question of the rendered values.
Asking it of the files as well is recorded as an open item in §10.3.

### 10.2 Specified, and deliberately not shipped

Three further primitives are specified here and will land in the stage that first uses them:

| Primitive | What it is |
| --- | --- |
| `.kx-hatch` | the plate's tonal system as CSS — one hairline of `--foreground` every `--kx-hatch-step` at `--kx-hatch-ink` alpha. Tone from line density is what makes the art an engraving rather than a gradient, and it is the one part of the plate CSS can reproduce at zero bytes. A backdrop, never a bed for copy. |
| `.kx-rule-engraved` | the site's `border-b border-border` section seam in the plate's vocabulary: a hairline ink rule with the hatch above it fading off both ends. |
| `.kx-plate-crop` | the framing contract the footer worked out — declared intrinsic ratio so nothing shifts on load, `object-cover`, and a top fade into the paper instead of a cut line. |

They are not in `globals.css` because **they would not reach a visitor.** Tailwind's content scan removes a
hand-written `@layer components` rule that no file under the content globs names. This was measured, not
assumed: with all four primitives in `globals.css` and only `.kx-paper` referenced, the built stylesheet
under `apps/web/.next/static/css` carried `.kx-paper` three times and `.kx-hatch`, `.kx-rule-engraved` and
`.kx-plate-crop` not at all. *(rendered.)*

So a decorative primitive in this codebase ships with its first consumer, and a stage that adds one adds
its CSS in the same change. Safelisting them instead would put CSS no visitor uses into every page, which
§5 of this document treats as an accessibility concern and not only a performance one.

### 10.3 The gate

`pnpm check:engraving` (`scripts/engraving-visual.mjs`) measures the sheet in Chromium against the built
site. It is **not** wired into CI: §9 above makes a gate of its own a stage-3 question, and
`.github/workflows/ci.yml` is contested by PRs #427 and #430. It is run by hand and its output recorded in
the PR that changes a decorative surface.

| Row | What it proves |
| --- | --- |
| `ships` | `.kx-paper` survives the content scan into the built stylesheet, and `.kx-print-surface` stays absent |
| `paper` | the sheet follows the theme and does not invert — the dark footer is darker than the light footer and still lighter than the dark page behind it |
| `grain` | suppressing `.kx-paper::before` moves pixels on a patch of plain paper, in both themes. The comparison is its own negative control |
| `text` | the footer's headings and 70% secondary text clear 4.5:1 against the paper, composited through the text's own alpha |
| `tree` | the plate is an `aria-hidden` `<img alt="">` with nothing focusable in it, and the grain is a pseudo-element, which cannot enter the tree at all |
| `leak` | `.kx-paper` is on a `<footer>` and on nothing else, across a component page with live previews, charts, an interactive docs example, blocks and the homepage, LTR and RTL |
| `layout` | no sideways scroll at 320/390/768/1280/1440, LTR and RTL, at 100% and 200% text — 20 combinations |
| `motion` | the sheet is static with and without `prefers-reduced-motion` (§5.7) |
| `parity` | `.kx-paper` paints what the inline declarations painted |

Measured on the two-plate footer at 1440, against the rendered background in each theme:

| | light | dark |
| --- | --- | --- |
| column heading, `foreground` | 18.32:1 | 14.73:1 |
| link and bottom bar, `foreground/70` | 7.36:1 | 7.86:1 |

Those reproduce the four ratios `site-footer.tsx` records (18.2, 7.3, 14.7, 7.8) to within 0.1, which is
what makes them evidence rather than a restatement. The figures AE-2A first recorded for dark mode — 13.0
and 6.3 — were the dimmed sheet's and no longer describe anything; the evening plate's own tokens read
higher than the dimmed light ones did.

Four things the instrument had to learn, recorded so a later gate does not relearn them:

1. A `filter` on an ancestor is never folded into a computed colour, and `.kx-print-surface` used to pin
   the footer's tokens light so `getComputedStyle` returned the same colours in both themes. A contrast
   row built on computed colours alone therefore reported the light ratio for dark mode and could not see
   a dark-mode regression at all. `main` has neither any more, so the row reads the real thing — but it
   still reads the filter and folds in whatever it finds, rather than assuming there is none.
2. Playwright's `addStyleTag` takes no `id`. Removing an injected tag by a guessed id removes nothing, and
   the next theme then measures a page that still has the previous theme's override applied. The handle it
   returns is the only way back to the tag.
3. The `parity` row cannot reinstate the pre-refactor form by its Tailwind class names. Those utilities had
   one call site between them, so removing it removed them from the bundle; the row rebuilds the old form
   from literal declarations instead.
4. **A row this gate cannot be shown to fail is not yet evidence, and one was dropped for it.** A
   `plates` row was written to ask the two-plate rule of the *files* rather than of the values: two plate
   images, each theme rendering only its own, the two being different assets, and no `filter` between a
   plate and the sheet. It passes on `main`'s footer, three runs out of three. It could not be made to
   fail on demand. Three attempts — both plates rendered at once, a `filter: brightness(0.85)` restored
   over the dark sheet, and the day plate served to both themes — all died the same way instead, on
   `scrollIntoViewIfNeeded` inside `checkSheet`: *element is not stable*, 30s, before the row under test
   was reached. The homepage is the suspect, since `checkSheet` navigates to `/` and that route's trace
   layer runs a `ResizeObserver` known to grow without bound in headless Chromium — but the first
   explanation, that a taller footer never settles, does not survive the filter-only control, which
   changed no geometry and timed out identically. The cause is unresolved, so the row is **not in this
   change**. Shipping it would mean a gate row whose green means nothing, which is the failure this
   document's own §9 gate question exists to avoid. Two things for whoever picks it up, probably when the
   gate enters CI with stage 3: the rows that navigate to `/` could use any quieter route, since the
   footer is on all of them; and the instability under a patched build is worth understanding on its own,
   because it makes every negative control for this gate unreliable, not only this one's.

### 10.4 What AE-2A did not do

- No page adopted the direction. The homepage, catalogue, marketing and documentation surfaces are
  untouched; they are §8 stages 3 to 5 and each needs its own authorization.
- No image asset was added or replaced. The plates, their derivatives and the masters are PR #432's and
  PR #435's, carried across unchanged; site image payload is unchanged.
- No token moved, no component changed, no claim moved.
- Nothing was asserted about how dark mode *looks* **on the strength of this work**. The dark rows above
  are measurements of the rendered page, which is what they say they are. The evening footer does now have
  a visual sign-off — `azink-dark-evening-1440.png`, approved 2026-10-21 and recorded in §2 — but that is
  the owner's approval of the footer, arrived at separately, and it grades appearance only. It makes none
  of the figures above a reference and confirms no contrast, axe, layout or payload result.
