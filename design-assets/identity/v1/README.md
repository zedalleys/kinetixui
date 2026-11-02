# KinetixUI — Kinetic Weave identity (draft)

Rebrand direction: original three-ribbon **K** geometric symbol and a five-color brand palette.

## Scope of this draft
- Introduces canonical vector brand mark, dark app icon, and animated SVG variant.
- Swaps website header/footer marks and favicon; updates wordmark capitalization and brand color.
- Documents the proposed palette without changing the published DTCG component contract.
- This is intentionally a **draft**, **not** the completed cross-platform color migration.

## Color roles
- Electric Indigo `#6054F4` — brand, candidate light-theme action (5.16:1 against white).
- Soft Violet `#A78BFA` — dark-theme action candidate (6.80:1 on `#0C1229`).
- Electric Cyan `#28C7D9` — motif, chart/accent. Not small text on white.
- Midnight Navy `#17233D` — light foreground.
- Cloud White `#F6F7FC` — light neutral / dark foreground.
- Deep Canvas `#0C1229` — dark background.

## Blocking follow-up before merge
1. Update `tokens/primitives/color.json` with new ramps and `tokens/semantic/color.{light,dark}.json` role mappings. Keep alerts/status semantics distinct.
2. Rebuild `@kinetixui/tokens` via Style Dictionary; regenerate web, SwiftUI, Compose, Flutter and Angular outputs from the canonical DTCG source. Do not edit generated outputs manually.
3. Update the website's `globals.css` forced `.theme-light` token parity overrides, chart palette, hero, documentation, marketing shares, OG image, example screenshots, and Figma assets.
4. Make hero motion meaningful but subtle; respect reduced motion, reflow, RTL and contrast.
5. Run full `check:contrast`, token-parity, website screenshot, browser accessibility, text resize, release tests and five-platform build gates.
6. Verify header/footer logo legibility at 16/24/32 px, monochrome and low-resolution favicon, and color-aware dark mode.

Publishing and merging remain blocked until visual and functional verification. Existing 0.27.0 release remains unchanged.
