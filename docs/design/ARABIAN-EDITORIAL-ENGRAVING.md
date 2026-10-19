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
| Technique | Etching, cross-hatching, stippling, line-based shading. Tone comes from line density, never from a soft airbrushed gradient. |
| Ink | Deep indigo. |
| Paper | Pale, slightly cool printed surface, with restrained grain. Not warm parchment. |
| Subject | Arabian dunes, sandstone mesas, oasis water, palms, expansive skies. Figures (a small caravan) read at the scale of staffage, not as a focal subject. |
| Composition | Spacious contemporary editorial. Generous empty sky, a low horizon, clear space around text and navigation. |
| Typography | The site's existing type system, unchanged. The direction adds no display face and no lettering inside the art. |
| Themes | The same pale printed surface in light and dark. Dark mode dims the sheet; it never inverts it. |
| Frequency | Selective illustration and page framing. A shared decorative vocabulary, not illustration in every section. |

**This direction supersedes earlier suggestions** of bright-blue woodcuts, mandatory warm parchment and
architecture-heavy scenes (a Najdi town). Those were explored on the footer branch and set aside; the
approved footer is the reference, and the superseded versions survive only in that branch's commit history
and in the Figma working file. *(source: PR #432 description, "The PR went through earlier art directions".)*

### Why these choices, not merely what

- **Engraving rather than flat vector or photography.** Line density is a tonal system, so one plate holds
  foreground, middle distance and sky without colour; it sits beside a token-driven interface without
  competing with it for colour meaning.
- **One pale sheet in both themes.** An engraving inverted for dark mode reads as a photographic negative —
  the lines become light-on-dark, which is a different printing process and a different object. Dimming
  preserves the object. *(source: `apps/web/src/components/site-footer.tsx` on PR #432 carries this
  reasoning at the component; its implementation is `dark:brightness-[0.85]` over `.kx-print-surface`.)*
- **Spacious composition.** Decoration earns its place by giving editorial surfaces air, not by filling
  them. Empty sky is where the bottom bar and the headings sit.

## 2. Canonical visual references

The canonical references are Ziad's two approved footer screenshots, **`azink-1440.png`** (light) and
**`azink-dark-1440.png`** (dark).

Both were approved and supplied on 2026-10-19 and have been read. They show the PR #432 footer at a 1440px
viewport, light and dark, and they are what later surfaces are compared against. What they establish, as
measurements taken from the two images rather than from a browser session:

- **The paper is `accent`.** The plain panel samples `#f0f7ff` in the light screenshot — `blue.50`, the
  value §3 records from source. The sheet is pale and slightly cool, not warm. *(reference)*
- **Dark dims; it does not invert.** Across 11,454 colour channels sampled at random from the two images,
  the dark screenshot is a uniform **0.850×** the light one (1st–99th percentile 0.839–0.864), and **not one
  sampled channel is lighter in dark mode than in light**. There is no second plate and no negative: the
  dark sheet is the light sheet, dimmed. *(reference)*
- **The grain is present and restrained.** Rows of plain paper carry a standard deviation of about 0.5 of
  255 — visible as texture, far below anything that would disturb the type on it. *(reference)*
- **The composition matches §1.** Low horizon, open cloud band, palms and oasis pool centred, flat-topped
  mesas across the middle distance, a small caravan at the left, cross-hatched dunes in the foreground.
  Tone is carried by line density throughout; there is no soft gradient in the art. *(reference)*
- **Text sits on paper, not on line work.** The four link columns, the tagline and the mark are all on the
  plain panel above the plate; the plate fades in beneath the divider, so the copyright and credit bar sits
  in the empty sky rather than over the engraving. *(reference)*

These are visual observations. They are **not** accessibility or performance results: contrast ratios, axe
runs, layout-shift and payload figures come from the measurements PR #432 and #434 record, and §3 and §5
keep them separate on purpose.

Repository-side references, in priority order:

1. `design-assets/kinetixui-footer-arabian-landscape.png` — the 2880×960 master plate. *(source, PR #432)*
2. `design-assets/kinetixui-footer-arabian-engraving.png`, `…-panorama.png`, `…-panorama.webp` — companion
   masters. *(source, PR #432)*
3. `apps/web/public/footer/arabian-landscape-{960,1920,2880}.webp` and `paper-grain.webp` — the shipped
   derivatives. *(source, PR #432)*
4. The Figma working file, which keeps every version including the superseded directions.

The screenshots are the canonical reference for what the direction *looks like*; the repository assets stay
the production source of truth for the plate itself.

## 3. The approved footer as the baseline

The footer on PR #432 is the first and, as of this document, the only surface carrying the direction. It is
the baseline every later surface is measured against. Recorded here so later work does not re-derive it:

| Element | How it is made | Evidence |
| --- | --- | --- |
| Paper | The `accent` semantic token — `blue.50` `#f0f7ff`, a pale cool white — as the footer panel, with the plate printed on that same paper so the engraved sky runs into the link area. | source |
| Ink | The `azure` ramp that `primary` comes from: `azure.1000` `#0f172a` and `azure.950` `#172554` for the ink, `azure.900` `#1e3a8a` for mid-tones. Baked into the image; the component carries no hex value. | source |
| Grain | One seamless 384px tile blended `overlay` across the whole footer, so panel and plate read as one sheet. | source |
| Theme behavior | `.kx-print-surface` re-points `foreground`, `primary`, `primary-foreground`, `border`, `ring`, `accent` and `surface-grouped` to their light-theme aliases inside the footer; dark mode dims to 85%. No token value changes, no token is added. | source |
| Accessibility | The plate is an `aria-hidden` `<img alt="">` — out of the accessibility tree, out of selection, out of contrast audits. Text sits on the paper, not on the art. | source |
| Subject | Palm grove, oasis pool, flat-topped sandstone mesas, cross-hatched dunes, a small camel caravan at left, a wide cloud band over an open sky. The oasis sits in the middle 30–70% of the plate so phone crops keep it. | source (master plate + component comment) |
| Appearance at 1440 | The canonical screenshots confirm it: paper `#f0f7ff`, dark a uniform 0.850× of light with nothing inverted, grain present at about 0.5/255 on plain paper, the plate fading in below the divider so the bottom bar sits in open sky. §2 has the measurements. | reference |
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
3. Print it on the same pale paper, in the same indigo ink, with the same grain.
4. Keep the text off the line work; measure contrast against the paper.
5. Check light, dark, RTL, 390/768/1440 and 200% text.
6. Confirm the page weight cost, and that the art lazy-loads.
7. Record the surface in §8 as shipped.

## 8. Staged rollout

| Stage | What | Status |
| --- | --- | --- |
| 1 | Establish documentation and canonical references — this document and Claude instructions §28. | In progress (this change). |
| 2 | Validate the approved footer as the baseline. | Partly done. The canonical screenshots are in hand and the footer's **appearance** is confirmed against them (§2). What remains is not a visual question: PR #432 is still open and unmerged, so the baseline is not yet on `main`. |
| 3 | Pilot **one** restrained homepage accent. | Not started. One accent, one measurement, one decision. |
| 4 | Extend selectively to marketing and editorial surfaces. | Not started. |
| 5 | Consider minimal documentation and catalogue framing, **after** the overlapping catalogue work (CAT-1 #413, CAT-QF #428, CAT-2 #430) is reconciled. | Not started, and explicitly blocked on that reconciliation. |

**Each stage from 2 onward requires separate authorization before any implementation.** A stage is not
started because the previous one landed.

## 9. Open questions

- Whether the direction gets a gate of its own (for example, one that fails if decorative art enters the
  accessibility tree, or if a decorative surface ships without a dark-mode check) is a stage-3 question, not
  a stage-1 one.
