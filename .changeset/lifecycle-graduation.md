---
"@kinetixui/ui": minor
---

Graduate eleven audited components to lifecycle Stable, and correct four Beta APIs.

**Breaking, on Beta components only.** Pre-1.0 Beta is when a bad API gets
corrected rather than carried to 1.0 behind an alias:

- **ColorPicker** — `value` and `onChange` were both required, so the picker
  could only be used controlled, and `onChange` contradicted the convention
  every other KinetixUI value control follows. Now `value?` / `defaultValue?` /
  `onValueChange?`. Migration: rename `onChange` to `onValueChange`; a
  controlled picker is otherwise unchanged.
- **MarkdownEditor** — same two faults, same fix. The preview still escapes HTML
  on every path; a test now pins that against the state change.
- **TreeView** — expansion and checking supported `default*`; selection did not,
  and `select` only called back, so an uncontrolled tree could never show a
  selection at all. Adds `defaultSelected`.
- **JsonViewer** — `hideCopy` was a negative boolean whose default could not be
  stated without inverting it. Now `copyable`, defaulting to true. Migration:
  `hideCopy` → `copyable={false}`.

**Accessibility fix.** A `TreeView` item's accessible name was computed from its
contents, so an expanded node announced its whole subtree — "src" as "src
index.ts". Items are now named by their own label.

**Lifecycle promotions.** `color-picker`, `data-grid`, `diff-viewer`,
`json-viewer`, `kanban-board`, `markdown-editor`, `message-bubble`,
`multi-select`, `tour`, `tree-view` and `virtual-list` move from `beta` to
`stable`, each against a documented gate rather than against a release cycle.
`notification-center` stays Beta: its read-state ownership and its
component-versus-Block boundary are genuinely unresolved, and the manifest now
records that.

This changes lifecycle status only. No implementation's verification level
changed, and no package maturity changed.
