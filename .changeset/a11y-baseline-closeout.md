---
"@kinetixui/ui": patch
---

Accessibility fixes found by the real-browser pass, closing its baseline: `Banner` no longer uses the `banner` landmark role; a pressable `ListItem` is now a `listitem` containing a `button` (was a `button` in place of the listitem); `DiffViewer` rows have cells and `JsonViewer` nested items sit in a `group`; `FileUpload`'s dropzone is a plain drop surface with the Browse button as the single control (was a nested-interactive `role="button"`); `ScrollArea` and `VirtualList` scroll regions are keyboard-focusable; `ColorPicker` labels its hex field and gives its 2D square `aria-valuenow`; `MarkdownEditor` names its textarea (via `aria-label`, default "Markdown"); `MultiSelect` removes the last chip on Backspace in an empty search field.
