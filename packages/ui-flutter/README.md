# kinetix_ui (Flutter)

Flutter port of KinetixUI — the fourth platform alongside React
(`@kinetixui/ui`), [Jetpack Compose](../ui-compose) and
[SwiftUI](../ui-swiftui). Built in batches on a CI `flutter analyze`
path; each widget mirrors its `packages/ui/src/components/*.tsx`
counterpart 1:1, with a doc comment stating anything not carried over.

**43 components so far.** Controls, the full input + field set, display
primitives, disclosure/navigation, and the mobile chrome — everything bar
the overlay & menu classes (next batch) and the deliberate non-ports.
`kinetix_ui.dart` is the full export list.

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

## Verification

The dev environment has no Flutter toolchain.
`.github/workflows/native-flutter.yml` (`flutter pub get` + `flutter
analyze`, path-filtered to `packages/ui-flutter/**` + `tokens/**` +
`style-dictionary/**`) is the sole compiler feedback.
