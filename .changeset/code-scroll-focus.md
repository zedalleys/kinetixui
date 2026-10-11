---
"@kinetixui/ui": patch
---

`CodeBlock` and `DiffViewer` scroll regions are now keyboard reachable while they overflow. At a phone width a long line made each one a scrollable region no keyboard could reach (axe `scrollable-region-focusable`, WCAG 2.1.1). Each now takes a tab stop only while it can actually scroll, with a visible focus ring, following the contract `Table` already holds; a `CodeBlock` showing a file is named by that file. No new props or exports. The README's minimal usage now loads all four token sheets, including `css/extras` (the focus ring) and `css/extras/dark`; the `@kinetixui/tokens` README makes the same correction.
