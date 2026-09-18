---
"@kinetixui/ui": minor
---

Add RTL support, slice 1: `KinetixDirectionProvider` (a thin wrapper over `@radix-ui/react-direction`) plus logical-property CSS conversions in `InputGroup`, `Select`, `NativeSelect`, `Dialog`, `Sheet`, `Drawer`, `DropdownMenu`, `Alert`, and `AppBar`. See `RTL.md` for the full picture — the two things RTL support needs are CSS logical properties (`ps-`/`pe-`, `start-`/`end-`, …) *and* telling Radix's own direction context about it, since every Radix primitive this library builds on (`Select`, `DropdownMenu`, `Popover`, `Tooltip`, …) defaults its portaled content to `ltr` regardless of the ambient `dir` attribute unless wrapped in a direction provider. Converting classes alone silently left every Radix-portaled component mispositioned under `dir="rtl"` — `KinetixDirectionProvider` closes that gap:

```tsx
<html dir={dir}>
  <body>
    <KinetixDirectionProvider dir={dir}>{children}</KinetixDirectionProvider>
  </body>
</html>
```

Most of the component library is not yet converted — `scripts/check-rtl.mjs` (now run in CI) tracks the remaining files explicitly and fails the build if a converted file regresses or a new component ships with physical-direction classes from the start.
