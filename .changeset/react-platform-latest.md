---
"@kinetixui/ui": patch
---

Upgrade the React platform to its latest supported toolchain: React 19, all Radix UI primitives, and the component library's other dependencies (recharts, react-day-picker, @tanstack/react-table, react-resizable-panels, zod, etc.) bumped to their current major releases.

`Calendar`, `Chart`, `DataTable`, and `ResizablePanelGroup`/`ResizablePanel`/`ResizableHandle` were ported to the new APIs of `react-day-picker` v10, `recharts` v3, `@tanstack/react-table` v9, and `react-resizable-panels` v4 respectively — their own public props are unchanged, but anything reaching past them into the underlying library's DOM structure, class names, or data attributes (e.g. `.day-range-start`, `data-panel-group-direction`) should double check against the new libraries' output.
