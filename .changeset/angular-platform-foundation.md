---
"@kinetixui/angular": minor
---

New package: `@kinetixui/angular`, KinetixUI's Angular implementation.

Eleven standalone components — Button, Badge, Card, Input, Label, Checkbox, Switch, Alert, Separator,
Progress and Tabs — built on the same generated design tokens as React, SwiftUI, Jetpack Compose and
Flutter. No Angular-specific token system: the package ships one stylesheet that spends the CSS custom
properties `@kinetixui/tokens` already generates.

Angular 21 (LTS), standalone components with signal inputs, `ControlValueAccessor` on both toggles, and
zoneless-compatible. Built with `ng-packagr` under `strictTemplates` and covered by behaviour tests for
roles, keyboard interaction, disabled state, forms integration and RTL — both run in CI.

Overlay components (Dialog, Select, Popover, Tooltip, DropdownMenu, Sheet) are deliberately not in this
release: they share one overlay/portal architecture that should be designed once for all of them.
