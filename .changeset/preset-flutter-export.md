---
"@kinetixui/cli": minor
---

`kinetixui preset flutter <code|url>` — export a Kinetix Create preset as a Flutter theme file.

Writes a Dart class holding a light and a dark `KinetixColors`, resolved through the same theme engine
`preset css`, `preset swiftui` and `preset compose` use, so all four render one design rather than
deriving it four times. `--name <Symbol>` picks the class (default `CreateTheme`) and `--output <file>`
writes it instead of printing it.

Apply it with the new `KinetixTheme.custom` constructor in `packages/ui-flutter`, or feed the Material and
Cupertino adapters through their new `fromColors` entry points:

```dart
KinetixTheme.custom(light: AcmeTheme.light, dark: AcmeTheme.dark, child: App())

MaterialApp(theme: KinetixMaterialTheme.fromColors(Brightness.light, AcmeTheme.light))
```

**The most complete native target.** Flutter's `KinetixColors` has all 35 semantic fields — including
`input`, `ring` and `tertiaryForeground`, which Compose has no field for — so no colour role is left
behind. Radius and elevation still do not travel: widgets read `KinetixRadius` constants directly and
`KinetixTheme` carries no shadow model. The Material and Cupertino adapters map the subset their own
theme APIs represent, unchanged from `light()` / `dark()`.

Flutter writes `Color(0xFFRRGGBB)`, the resolved colour exactly, so like Compose it needs no
representation of its own in the shared contrast guarantee. The guarantee is unchanged.

There is no Android XML exporter. `preset decode`, `preset url`, `preset css`, `preset swiftui`,
`preset compose`, `theme create` and `theme build` are unchanged.
