---
"@kinetixui/cli": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

**Dark-mode focus ring.** The `--shadow-focus{,-destructive,-success,-warning}`
composites now carry a real dark set built from the dark `--ring` / semantic
primitives (`tokens/semantic/shadow.dark.json`). Previously they baked a
light-theme navy that measured ~1.7:1 against the dark surface — below WCAG 2.2
SC 1.4.11 (3:1); it now clears 8.8:1. New export
`@kinetixui/tokens/css/extras/dark` (also bundled into
`registry/kinetixui/globals.css`); add its `@import` after
`@kinetixui/tokens/css/extras`.

**NumberInput** — the −/+ stepper buttons now draw a `--ring` inset outline on
`:focus-visible` so keyboard users can tell which control is focused (they
previously showed only a container-level ring).
