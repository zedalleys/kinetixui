# kinetix_ui (Flutter)

Flutter port of KinetixUI — the fourth platform alongside React
(`@kinetixui/ui`), [Jetpack Compose](../ui-compose) and
[SwiftUI](../ui-swiftui). Built in batches on a CI `flutter analyze`
path; each widget mirrors its `packages/ui/src/components/*.tsx`
counterpart 1:1, with a doc comment stating anything not carried over.

**The full React component surface** bar the documented non-ports (see
[`components.manifest.json`](../../components.manifest.json)). Controls, the full input + field set, display primitives,
data (Table / DataTable / Carousel), disclosure/navigation, the overlay &
menu classes (Dialog, Sheet, Popover, Dropdown/Context menus, Command,
Tooltip, Toaster), plus `KinetixCalendar` (over `CalendarDatePicker`) and
a hand-drawn `KinetixChart` bar chart. `kinetix_ui.dart` is the full
export list.

## Three ways to use it

You do not have to adopt the widgets to get the design language. Pick whichever
fits — they compose, and all three read the same generated tokens.

**1. Kinetix widgets.** The full component surface, themed by `KinetixTheme`:

```dart
KinetixTheme(
  child: KinetixButton(onPressed: () {}, child: const Text('Save')),
)
```

**2. Raw tokens, no widgets.** Every family is a plain constant — see
[Foundation tokens](#foundation-tokens):

```dart
Container(
  padding: const EdgeInsets.all(KinetixSpacing.space4),
  decoration: BoxDecoration(
    color: KinetixColors.light.card,
    borderRadius: BorderRadius.circular(KinetixRadius.container),
    boxShadow: KinetixShadow.md,
  ),
  child: Text('No Kinetix widget here', style: KinetixType.bodyMd),
)
```

**3. Native Flutter widgets, Kinetix theming.** Build a Material `ThemeData` or a
`CupertinoThemeData` from the tokens and keep using `Card`, `FilledButton`,
`CupertinoButton` — see [Theme adapters](#theme-adapters):

```dart
MaterialApp(
  theme: KinetixMaterialTheme.light(),
  darkTheme: KinetixMaterialTheme.dark(),
);

CupertinoApp(
  theme: KinetixCupertinoTheme.light(),
);
```

### Not ported (deliberate)

Matching the Compose / SwiftUI ports' stance:

- **`Form`** — `KinetixField` (+ `Label` / `Description` / `Message`) is
  the equivalent; there's no `react-hook-form`-shaped context to wrap.
- **`NavigationMenu`** — a hover-triggered desktop mega-menu with no
  touch idiom.
- **`Combobox`** — a recipe (Popover + Command) on the web, not a
  standalone component; compose `KinetixPopover` + a filtered list, or
  use `KinetixSelect`.

- `lib/src/theme.dart` — `KinetixColors` (the semantic set), the
  `KinetixTheme` `InheritedWidget`, and `KinetixTheme.of(context)`. The
  Flutter analogue of Compose's `KinetixColorScheme` / SwiftUI's
  `@Environment(\.kinetixColors)`.
- `lib/src/*.dart` — one file per component.
- `lib/src/kinetix_color_scheme.dart` / `.dark.dart` — **generated,
  vendored.** Do not hand-edit. Re-run
  `node scripts/vendor-flutter-tokens.mjs` (or `pnpm vendor:flutter`)
  after `pnpm build:tokens`.

## Standalone package

There's no `package.json` here — `pnpm-workspace.yaml`'s `packages/*`
glob only registers a directory with a `package.json`, so this stays
invisible to `pnpm install` / Turborepo, exactly like `packages/ui-compose`
(Gradle) and `packages/ui-swiftui` (SwiftPM). It lives in the monorepo
only for proximity to the token source it depends on.

Not on pub.dev (`publish_to: none`). Consume it from a repo checkout:

```yaml
dependencies:
  kinetix_ui:
    path: ../kinetixui/packages/ui-flutter
```

## Tokens: a real dark pass

The pre-existing Flutter token output (`packages/tokens/dist/flutter/`:
`app_colors.dart`, `app_theme.dart`, `app_text.dart`) is **light-only**
and uses the class names `KinetixColors` / `KinetixTheme` — which would
collide with this package's `KinetixColors` value type and `KinetixTheme`
widget. So the token engine emits an **additive** Flutter-`Color` semantic
set for this library — `KinetixColorScheme` (light) /
`KinetixColorSchemeDark` (dark) — from the `flutter-color-scheme` platform
block in `style-dictionary/sd.config.mjs`, running on **both** Style
Dictionary passes. The existing three files are untouched. Same split as
the SwiftUI `KinetixColorsSwiftUI` output.

After any token change:

```bash
pnpm build:tokens && pnpm vendor:flutter
```

## Usage

```dart
import 'package:flutter/material.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

class Demo extends StatelessWidget {
  const Demo({super.key});

  @override
  Widget build(BuildContext context) {
    return KinetixTheme(
      child: Column(
        children: [
          KinetixButton(onPressed: () {}, child: const Text('Save')),
          KinetixButton(
            variant: KinetixButtonVariant.outline,
            size: KinetixButtonSize.sm,
            onPressed: () {},
            child: const Text('Cancel'),
          ),
          const KinetixButton(onPressed: null, child: Text('Disabled')),
        ],
      ),
    );
  }
}
```

## Type scale

`lib/src/app_text.dart` is **generated, vendored** (same flow as the
colour set — `pnpm build:tokens` then `pnpm vendor:flutter`). The widgets
apply it as `AppText.<style>.copyWith(color: …)`; `lib/src/kinetix_type.dart`
re-exports it and aliases `KinetixType = AppText`. A handful of 13px
small-captions stay literal — there's no 13px step on the M3 scale.

## Foundation tokens

Every token family, all generated from `tokens/**` and all usable on their
own — no `Kinetix*` widget, no `KinetixTheme`, no `BuildContext` required.
`kinetix_ui.dart` exports all of them; `lib/src/kinetix_foundation.dart` is
a barrel over just this set if you want to read the list in one place.

| Family | API | Example |
|---|---|---|
| Colours | `KinetixColors.light` / `.dark` | `KinetixColors.light.action` |
| Typography | `KinetixType` | `KinetixType.bodyMd` |
| **Spacing** | `KinetixSpacing` | `KinetixSpacing.space4` → `16` |
| **Radius** | `KinetixRadius` | `KinetixRadius.container` → `12` |
| **Shadows** | `KinetixShadow` / `KinetixShadows` | `KinetixShadow.md` |
| Motion | `KinetixDuration`, `KinetixEasing` | `KinetixDuration.fast` |
| Opacity | `KinetixOpacity` | `KinetixOpacity.disabled` |
| Z-index | `KinetixZIndex` | `KinetixZIndex.overlay` |

Where they come from — all **generated, vendored**, never hand-edited
(`pnpm build:tokens` then `pnpm vendor:flutter`):

- `lib/src/kinetix_motion.dart` — `KinetixDuration` (`Duration`),
  `KinetixEasing` (`Curve`, via `Cubic`), `KinetixOpacity` (`double`),
  `KinetixZIndex` (`double` — advisory only; Flutter has no native z-index,
  stacking follows widget order in a `Stack`), plus **`KinetixSpacing`** (the
  8-unit grid with a 4-unit half-step) and **`KinetixRadius`** (the step scale
  `none`…`full` plus the role aliases `field` / `control` / `container` /
  `surface`). Spacing and radius live in this file because one generator emits
  the whole theme-independent foundation; they are not motion tokens.
- `lib/src/kinetix_shadow.dart` / `.dark.dart` — `KinetixShadow` (the
  `sm` / `md` / `lg` / `xl` elevation scale plus the `focus*` rings) and
  `KinetixShadowDark`. Each is a `List<BoxShadow>`, so it drops straight into
  a `BoxDecoration`; multi-layer tokens stay multi-layer.

Only the focus rings change with brightness — the elevation scale is
theme-independent black-alpha. `KinetixShadows.forBrightness(…)` (or
`KinetixShadows.of(context)`) picks the right set when you need one:

```dart
Container(
  decoration: BoxDecoration(
    borderRadius: BorderRadius.circular(KinetixRadius.control),
    boxShadow: KinetixShadows.of(context).focus,
  ),
);
```

## Theme adapters

`KinetixMaterialTheme` and `KinetixCupertinoTheme` turn the same tokens into
Flutter's own theme objects, so an app using stock widgets inherits the design
language. Both are pure static construction — no JSON, no filesystem, no
runtime parsing — and both have a real dark variant built from the generated
dark palette, never a transform of the light one.

```dart
MaterialApp(
  theme: KinetixMaterialTheme.light(),
  darkTheme: KinetixMaterialTheme.dark(),
  home: Scaffold(
    body: Padding(
      padding: const EdgeInsets.all(KinetixSpacing.space2),
      child: const Card(child: Text('Hello')),
    ),
  ),
);
```

**Material colour mapping.** `primary`/`onPrimary` ← `action`/`actionForeground`
(the interactive fill is the role Material's `primary` actually plays),
`primaryContainer` ← `primary`, `secondaryContainer` ← `accent`, `tertiary` ←
`brand`, `error` ← `destructive`, `surface`/`onSurface` ← `background`/`foreground`,
`outline` ← `border`, `outlineVariant` ← `input`. The Kinetix palette is larger
than Material's role set, so `link`, `focus`, `ring`, `actionHover`,
`actionPressed`, `muted*`, `tertiary*` (the Kinetix neutral — not Material's
accent), `warning*`, `success*`, `info*`, `card*`, `popover*` and `chart` have no
slot and stay on `KinetixColors`. The type scale maps 1:1 onto Material 3's 15
`TextTheme` slots; `KinetixType.titleDialog` is the one extra role, applied
directly where you need it.

**Cupertino** maps what Cupertino has: `brightness`, `primaryColor`,
`primaryContrastingColor`, `scaffoldBackgroundColor`, `barBackgroundColor` and
the text theme. Cupertino widgets keep their native behaviour — the adapter
changes colour and type, it does not make them look like Material.

**Spacing stays a layout API, deliberately.** `ThemeData` has no global spacing
scale and there's no honest place to put one, so padding and gaps stay explicit
via `KinetixSpacing`. Same for shadows outside the few slots Flutter themes
expose: use `KinetixShadow.*` in a `BoxDecoration` rather than inventing
elevation integers that don't correspond to the tokens.

**Not themed on purpose:** `cardTheme`, `dialogTheme`, `inputDecorationTheme`
and `appBarTheme`. Flutter renamed those slots' types in 3.32+ (`CardTheme` →
`CardThemeData`, and so on) and `flutter analyze` treats a deprecation as a
failure, so there is no single spelling that is correct across the versions this
package supports. Style those surfaces directly with `KinetixRadius`.

**Mixing.** Kinetix widgets and native widgets coexist — theme the app with the
adapter and scope the Kinetix widgets with `KinetixTheme`:

```dart
MaterialApp(
  theme: KinetixMaterialTheme.light(),
  darkTheme: KinetixMaterialTheme.dark(),
  home: KinetixTheme(child: /* Kinetix + native widgets together */),
);
```

`KinetixTheme` resolves its own brightness from the platform
(`MediaQuery.platformBrightness`), so it follows the system automatically. If
you drive brightness yourself with `MaterialApp(themeMode: …)`, pass it through
explicitly — `KinetixTheme(brightness: Theme.of(context).brightness, …)` — so
both systems agree.

## Verification

The dev environment has no Flutter toolchain.
`.github/workflows/native-flutter.yml` (`flutter pub get` + `flutter
analyze` + `flutter test`, path-filtered to `packages/ui-flutter/**` +
`tokens/**` + `style-dictionary/**`) is the sole compiler feedback.
`flutter analyze` here is fatal on `info`-level lints, not just
errors/warnings.
