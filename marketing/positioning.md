# Positioning

## Category

**Infrastructure for teams that need one design language across multiple platforms.**

Not "another React component library". React is one of five implementation
platforms, and the React library is the *least* differentiated thing here.

## One-line

> KinetixUI compiles one DTCG token source into every platform's own token
> output, and ships a native component implementation per platform.

## The claim we can defend that others mostly cannot

Most cross-platform design-system claims are unverified. KinetixUI's are checked
against source in CI:

- `check:platform-source` — a component may only be listed for a platform whose
  source actually exists. It found `direction-provider` claiming three native
  platforms with no implementation on any of them, and `combobox` claiming a
  React component that does not exist.
- `check:block-source` / `check:blocks` — every block snippet on the site is
  extracted from a file the platform's CI compiles.
- `check:platform-code` — every native snippet on a component page is either
  matched against a compiled example or symbol-checked against the real package.
  It found `chart-demo` advertising a Compose `KinetixChart` that has no source
  file, under a comment describing Flutter's implementation.

**That is the story.** Not the component count. The count is a feature; the
verification is the position.

## What we are careful never to say

| Never | Because | Say instead |
| --- | --- | --- |
| "Write once, run everywhere" | We don't. Five implementations exist. | "One token architecture, native implementations" |
| "Single source" (of components) | Only the *tokens* have a single source. | "Shared token contract, separate implementations" |
| "Same components on all platforms" | Coverage is partial and documented. | "Verified coverage, with documented exceptions" |
| "Full Angular support" | Angular is preview, a subset of the catalogue. | "Angular in preview" |
| "npm install @kinetixui/angular" | Not published. | "Not published yet — it lives in the monorepo and is CI-validated" |

## Proof assets (all real, all in-repo)

- Per-platform coverage, generated: `platform-parity.json`
- Documented exceptions with reasons: `components.manifest.json` → `platformNote`
- CI workflows per native platform: `native-swiftui.yml`, `native-compose.yml`, `native-flutter.yml`
- Accessibility: `check:contrast` (WCAG AA), a browser axe pass over 19 site pages
  × 2 themes × 3 widths, and jsdom axe over every Storybook story
- RTL: `check:rtl` logical-property guardrail, plus RTL behaviour tests on
  Compose, Flutter and Angular components

## Positioning risks to manage honestly

1. **Angular is thin (11 of 98).** Lead with the architecture, not the catalogue.
2. **Blocks have no SwiftUI or Angular coverage.** Do not imply otherwise.
3. **No users to point at.** Use engineering proof, never invented adoption.
4. **Pro does not exist yet.** Do not market it. Core adoption is the goal.
