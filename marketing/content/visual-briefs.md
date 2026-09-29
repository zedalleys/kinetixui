---
type: visual briefs
status: briefs only — no asset produced in Phase 4
---

# Visual briefs

Seven briefs (**VIS-001 … VIS-007**) for the strongest assets of the month. Two more already exist for the
reused campaigns: `drafts/a01/visual-brief.md` and `drafts/a02/visual-brief.md`, with production notes in
`visual-production-a01-a02.md`.

**Nothing is produced here.** The repository has no reliable automated visual generation, so generating
images in this phase would mean hand-made assets that drift from the product. These briefs feed Phase 5.

**Standing requirements for every asset:**

- Light and dark variants. The design system has both; shipping only light would be an odd advertisement.
- Legible at feed size — check at 30% zoom before calling one finished.
- Any product UI is a **real screenshot** of a real page, never a mockup. Any code is copied from a real
  file, never typed for the image.
- Tokens are the source for every colour and spacing value in the asset itself.
- No number that is not currently true. Re-derive from `pnpm marketing:stats` at production time.
- Alt text written with the brief, not after.

---

## VIS-001 · Drift over time · P2 · for LI-003, X-005

- **Purpose:** make cross-platform drift *visible* in one glance, before any architecture is mentioned.
- **Audience:** P2 — the team whose apps have quietly diverged.
- **Format / ratio:** static image, 1200×1200 (LinkedIn square), 16:9 variant for X.
- **Content:** two device frames side by side — a web card and a mobile card of the same component — at
  "launch" and at "six months". At launch they are identical. At six months: padding differs, radius
  differs, the primary colour is one step off, a label has a different weight.
- **Layout:** two rows. Top row labelled `DAY 1`, bottom `MONTH 6`. Differences in the bottom row marked
  with thin callout lines and the exact delta (`16 → 20`, `#1b3c53 → #1f4a63`).
- **Copy:** heading *"Nobody decided this."* Footer: kinetixui.com.
- **Product screen / code needed:** a real Card composition from `/components`, screenshotted, then the
  drifted variant produced by editing the values — **and labelled as a constructed illustration**, because
  it is. It is not a screenshot of a real broken app and must not look like a claim that it is.
- **CTA:** none in the image. The post carries it.

## VIS-002 · Manifest → every surface · P1 · for LI-004

- **Purpose:** show that one file drives the coverage table, the docs, the site and the checks.
- **Audience:** P1.
- **Format / ratio:** diagram, 1200×1200 and 16:9.
- **Content:** `components.manifest.json` at the top. Arrows down to four boxes: *coverage table*,
  *component pages*, *platform docs*, *marketing copy*. A fifth arrow to the side into a gate labelled
  `check:platform-source`, which points back at the manifest with a red "fails the build" edge.
- **Layout:** single source at top, fan-out below, the check as a feedback loop rather than a leaf.
- **Copy:** *"One file. Every surface. One check that reads it back."*
- **Product screen / code needed:** a real excerpt of a manifest entry showing `platforms` and a
  `platformNote`.
- **CTA:** none.

## VIS-003 · The token boundary · NEUTRAL · for LI-005, X-004, ART-002

- **Purpose:** the flagship diagram of the month — where the pipeline stops for most teams, and what
  crossing it looks like.
- **Audience:** P2 and S2.
- **Format / ratio:** diagram, 1200×1200 and 16:9.
- **Content:** left half, *usual*: DTCG source → build → CSS custom properties, then a dashed boundary line,
  and beyond it three greyed files — `Colors.swift`, `Colors.kt`, `colors.dart` — each tagged
  *hand-copied*. Right half, *generated*: the same source, four generators, four outputs, all solid, all
  tagged *build artifact*.
- **Layout:** vertical dashed line down the centre labelled **THE WEB BOUNDARY**.
- **Copy:** left *"Where most pipelines stop."* right *"One source. Four outputs. One commit."*
- **Product screen / code needed:** real snippets from the generated `dist/{web,ios,android,flutter}`
  artifacts — short enough to read at feed size, three or four lines each.
- **CTA:** none in the image.

## VIS-004 · A list cannot fail · P1 · for LI-006, X-006

- **Purpose:** make the bug class legible without dramatising the incident.
- **Audience:** P1 and general engineering.
- **Format / ratio:** diagram, 16:9 (thread header) and 1200×1200.
- **Content:** two panels. *Before*: component file → scanned; `utils.ts` → attached but **not** scanned,
  with its two imports greyed out; a hand-written package list beside it with a "matched against" arrow.
  *After*: the full delivered file set in a box, every file scanned, imports derived, the list crossed out
  and removed.
- **Layout:** before/after, the crossed-out list as the visual punchline.
- **Copy:** *"A list cannot fail. It can only be incomplete."*
- **Product screen / code needed:** the real `npmImportsOf` function, four or five lines.
- **CTA:** none.

## VIS-005 · Two trades · P2 · for LI-007, X-008

- **Purpose:** frame the runtime-versus-native-implementations choice as a trade, not a sales pitch.
- **Audience:** P2 and mobile engineers.
- **Format / ratio:** diagram, 1200×1200.
- **Content:** two columns. *Runtime*: one codebase → a layer → four platforms, with the layer highlighted
  and labelled *"where the edges are"*. *Native implementations*: a shared contract at the top, four
  independent implementations below, no layer, labelled *"where the cost is"*.
- **Layout:** deliberately symmetrical. Neither column is styled as the winner.
- **Copy:** *"Neither is a mistake. Know which one you are buying."*
- **Product screen / code needed:** none — this one is pure diagram and stronger for it.
- **CTA:** none.

## VIS-006 · Fraction, not tick · P1 · for LI-008, X-007

- **Purpose:** show the reporting difference in the most literal possible way.
- **Audience:** P1, S5.
- **Format / ratio:** 1200×1200.
- **Content:** the same matrix twice. Left: green ticks everywhere, looks perfect. Right: the real
  fractions, including the low ones and the zero, with the zero **not** styled as an error — just a number.
- **Layout:** side by side, identical grid, only the cell contents differ.
- **Copy:** *"Same data. One of these is useful."*
- **Product screen / code needed:** **a real screenshot of the live coverage table** at `/docs/platforms`,
  with values re-derived on the day.
- **CTA:** none in the image.

## VIS-007 · The adoption ladder · P2 · for LI-009, X-010

- **Purpose:** show that stopping at rung one is a legitimate outcome.
- **Audience:** P2.
- **Format / ratio:** 1200×1200.
- **Content:** three rungs — **tokens**, **components**, **blocks** — each with one line on what changes in
  your codebase. Rung one annotated *"your components stay exactly as they are"*. An explicit "you can stop
  here" marker beside rung one.
- **Layout:** ascending, but the emphasis is on the first rung, not the last. Do not draw it as a funnel
  toward full adoption; that is the opposite of the message.
- **Copy:** *"Three ways in. Stopping at the first is a real answer."*
- **Product screen / code needed:** the Flutter theme-adapter snippet for rung one.
- **CTA:** none in the image.

---

## Production order for Phase 5

1. **VIS-003** — the flagship, serves an article and two posts.
2. **VIS-001** — carries the week-one P2 message.
3. **VIS-006** — highest credibility-per-pixel, and it is a screenshot plus a comparison.
4. **VIS-004**, **VIS-002** — the P1 diagrams.
5. **VIS-007**, **VIS-005** — useful, least blocking.

A post ships without its visual if the visual is not ready. An unillustrated good post beats a delayed one,
and none of these assets depends on its image to make sense.
