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
- Package maturity and catalogue verification as **separate** fields, never one
  number: `platformDefinitions[].maturity` and `catalogueVerification`
- Evidence behind each verification level, per platform: `verification.json`
- Blocks with real source on every platform they claim: `block-parity.json`
  (20/20 on all five), gated by `check:block-source`
- Documented exceptions with reasons: `components.manifest.json` → `platformNote`
- CI workflows per native platform: `native-swiftui.yml`, `native-compose.yml`, `native-flutter.yml`
- Accessibility: `check:contrast` (WCAG AA), a real-browser axe pass over 19 site
  pages × 2 themes × 4 widths (320/375/768/1280), and a second browser pass over
  every Storybook story
- RTL: `check:rtl` logical-property guardrail, plus RTL behaviour tests on
  Compose, Flutter and Angular components

## Positioning risks to manage honestly

1. **Angular is a preview subset (31 of 98).** Real, compiler-backed, and
   deliberately incomplete — `catalogComplete: false`. Lead with the
   architecture, not the catalogue, and never put Angular in a parity
   denominator its product model excludes.
2. **Verification depth sits below package maturity, on purpose.** React is a
   stable *package* whose *catalogue verification* is beta; SwiftUI, Compose and
   Flutter are stable packages at experimental verification. That gap is the
   measurement working, not the libraries failing — say it that way, and never
   imply a low verification level means the source does not run.
3. **Only the npm packages are published.** `@kinetixui/ui`, `@kinetixui/cli`
   and `@kinetixui/tokens` are on npm; `@kinetixui/angular` and the three native
   libraries are not. Never show an install command for an unpublished package.
4. **No users to point at.** Use engineering proof, never invented adoption.
5. **Pro does not exist yet.** Do not market it. Core adoption is the goal.

Removed 2026-09-24: *"Blocks have no SwiftUI or Angular coverage."* No longer
true — `block-parity.json` reports 20 Blocks with real source on all five
platforms. A risk that has been closed is worse than no risk list, because it
makes writers hedge a claim they are entitled to make.
