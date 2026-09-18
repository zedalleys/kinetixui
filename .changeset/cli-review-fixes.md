---
"@kinetixui/cli": patch
---

Fix five issues found in a code-review pass over the commands added this session (`inspect`/`doctor`/`parity`/`theme`/`lint`):

- **`theme create`/`theme build`**: the `name` argument now goes through the same charset validation every other user-supplied identifier in this CLI already uses (`assertThemeName`, mirroring `assertComponentName`). Previously it was interpolated straight into a filesystem path with no checks — `kinetixui theme create ../../../tmp/evil` could read/write outside `kinetixui-themes/` entirely.
- **`inspect`**: a malformed `kinetixui.json` no longer aborts the command mid-output with a raw `JSON.parse` error — it now prints a warning on the "Installed" line and continues, matching how `doctor` already handles the identical case.
- **`doctor`**: now actually checks the `utils` alias (`@/lib/utils`), which was silently skipped before even though `doctor` claims to verify every alias resolves. `utils` points at a file, not a directory like the other three aliases, so it gets its own extension-aware existence check.
- **`lint`**: the default scan (`components` + `ui` alias dirs) no longer walks the `ui` subtree twice when it's nested inside `components`, the default layout — directories are now deduped by containment before any recursive walk starts, not just after the fact at the per-file level.
- **`lint`**: hardened the spacing-utility regex so the leading `-?` scopes the whole alternation, not just the padding/margin branch — makes negative arbitrary-value coverage (`-top-[10px]`, `-inset-[6px]`) an explicit, intentional part of the pattern rather than an accidental side effect of how `\b` anchoring happened to behave (verified: both the old and new pattern already caught these cases, so this is a correctness hardening, not a bug fix for a real miss).
