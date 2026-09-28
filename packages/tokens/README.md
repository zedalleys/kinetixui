# @kinetixui/tokens

The compiled KinetixUI token contract. One DTCG token source, built by Style Dictionary into each
platform's own output — CSS custom properties and a typed object for the web, plus colour, type, motion
and theme files for SwiftUI, Jetpack Compose and Flutter.

**Beta.** Versioned together with `@kinetixui/ui` and `@kinetixui/cli` on one line.

```bash
npm install @kinetixui/tokens
```

Zero runtime dependencies.

## What it is

357 token definitions — 215 primitives (colour ramps, spacing, radius, type, motion, opacity, z-index)
and 142 semantic aliases (light and dark colour roles, shadows, text styles) — compiled to:

| Target | What ships |
| --- | --- |
| Web | 277 CSS custom properties (light) + 52 (dark), a typed `tokens` object, and two "extras" stylesheets |
| iOS | `KinetixColors`, `KinetixColorsSwiftUI` (light + dark), `KinetixType`, `KinetixMotion`, `Theme` — Swift |
| Android | `Color`, `Theme` (light + dark), `KinetixType`, `KinetixMotion` — Kotlin, plus `colors.xml` / `dimens.xml` |
| Flutter | `app_colors`, `app_text`, `app_theme`, colour schemes and shadows (light + dark) — Dart |

The web output is what the JavaScript entry points serve. **The iOS, Android and Flutter files ship
inside this tarball as generated source to copy into a native project** — they are not importable
modules for those toolchains, and this package is not published to Swift Package Manager, Maven Central
or pub.dev. See [Native output](#native-output).

## Minimal usage

Import the stylesheets in your global CSS. Light is the base; dark is applied under a `.dark` ancestor.

```css
@import "@kinetixui/tokens/css";
@import "@kinetixui/tokens/css/dark";
```

Then use the semantic roles, never a raw value:

```css
.panel {
  background: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-control);
}
```

Or read them in TypeScript:

```ts
import { tokens } from "@kinetixui/tokens";
```

## Entry points

| import | contains |
| --- | --- |
| `@kinetixui/tokens` | the typed `tokens` object |
| `@kinetixui/tokens/css` | `:root` — the light semantic layer |
| `@kinetixui/tokens/css/dark` | `.dark` — the dark semantic layer |
| `@kinetixui/tokens/css/extras` | additional composites (shadows, text styles) |
| `@kinetixui/tokens/css/extras/dark` | the dark half of those composites |

`sideEffects` is declared as `["*.css"]`, so the stylesheets survive bundling while the JavaScript entry
stays shakeable.

## Native output

The generated Swift, Kotlin and Dart files are in the package under `dist/ios`, `dist/android` and
`dist/flutter`. They are the same values as the web output, emitted in each language's idiom, and they
exist so a native project can vendor them rather than re-typing hex codes.

To use them today you copy the files in. There is no package manager distribution for them — nothing here
is on Swift Package Manager, Maven Central or pub.dev. The KinetixUI native component implementations
consume these same files the same way, by vendoring; see
[kinetixui.com/docs/platforms](https://kinetixui.com/docs/platforms).

## Dark mode

Dark is a second set of values for the same semantic names, not a different set of names. `--card` means
"card surface" in both themes; only the value changes. That is what makes a single component
implementation work in both, and it is why every component is accessibility-tested in both.

Every semantic token pair is audited against WCAG AA contrast in CI, in light and dark.

## Limitations

- Pre-1.0: token names are stable in practice but not under a compatibility guarantee yet.
- The native files are source to copy, not a distributed package.
- Tailwind consumers should use the preset from `@kinetixui/ui/tailwind.config`, which maps these
  variables onto Tailwind's scales; this package ships the values, not the Tailwind wiring.

## Links

- Tokens documentation — <https://kinetixui.com/docs/tokens>
- Theming — <https://kinetixui.com/docs/theming>
- Dark mode — <https://kinetixui.com/docs/dark-mode>
- Colour reference — <https://kinetixui.com/docs/colors>
- Source — <https://github.com/zedalleys/kinetixui>

## License

MIT
