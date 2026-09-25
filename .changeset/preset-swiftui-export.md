---
"@kinetixui/cli": minor
---

`kinetixui preset swiftui <code|url>` — export a Kinetix Create preset as a SwiftUI theme file.

Writes a `public enum` holding a light and a dark `KinetixColors`, resolved through the same theme engine
`preset css` uses, so both targets render one design rather than two derivations that agree by hand.
`--name <Symbol>` picks the Swift type (default `CreateTheme`) and `--output <file>` writes it instead of
printing it.

Apply it with the new `KinetixTheme(light:dark:)` initializer in `packages/ui-swiftui`, which still
switches on `colorScheme`:

```swift
KinetixTheme(light: AcmeTheme.light, dark: AcmeTheme.dark) { … }
```

**Colours only, and SwiftUI only.** KinetixUI for SwiftUI is themeable through `KinetixColors`; corner
radius and elevation are literals inside each view, with no token an exported file could set, so a
design's radius and surface treatment apply on the web and not there — the generated file states that in
its own header. There is no Compose, Flutter or Android XML exporter.

`preset decode`, `preset url`, `theme create` and `theme build` are unchanged.

`preset css` gains no options, but its OUTPUT changes for some designs. Building the SwiftUI exporter
surfaced a contrast defect in the shared theme engine: `action-foreground` was chosen against `action`
and never re-checked against `action-hover` / `action-pressed`, so a button label could sit at 3.37:1
while pressed. 96 of 256 sampled designs were affected. The foreground is now scored across all three
fills and the state movement scales back when the label cannot follow it, so those designs resolve to
different — readable — values. `action` itself is unchanged, and designs that already cleared AA are
byte-identical to before.
