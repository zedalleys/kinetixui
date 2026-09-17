---
"@kinetixui/ui": minor
---

Add `JsonViewer` — a collapsible, syntax-colored tree for arbitrary JSON data (API responses, registry payloads, token diffs), with a copy-to-clipboard button. Fourth pick from the `COMPONENT-ADDITIONS.md` Tier 3 backlog. Distinct from `TreeView`: this renders a *data structure* (object/array/primitive), not a caller-composed hierarchy of `TreeItem`s, so expand state is per-node uncontrolled rather than a lifted `expanded` prop. Value colors reuse the existing `--success`/`--info`/`--warning` semantic tokens rather than introducing a separate syntax-highlighting palette.

Ships on all four platforms with the same feature set — unlike `DataGrid`, a recursive expand/collapse tree needs no gesture or layout primitive any platform lacks. SwiftUI's port introduces a small `KinetixJSONValue` recursive enum (Swift has no equivalent to TypeScript's `unknown` for this) with an ordered `.object([(String, KinetixJSONValue)])` case, since Swift dictionaries don't preserve key order; Compose and Flutter accept the ad-hoc `Map`/`List` shape their own JSON deserialization already produces.
