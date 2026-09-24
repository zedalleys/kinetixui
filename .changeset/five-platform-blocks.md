---
"@kinetixui/ui": patch
---

Name a Tag's dismiss control after the tag, on the four platforms that didn't.

A row of dismissible filter chips announced "Remove, Remove, Remove" — the
control told a screen-reader user which button they were on but never what it
would remove. Angular already solved this; React and SwiftUI hard-coded
"Remove", and Compose and Flutter gave the control no accessible name and no
button role at all, so it was neither findable by role nor readable.

All four now default to `Remove <tag text>`, with a `removeLabel` override for
the cases where the tag's text is not the right name — the same contract Angular
already had, so the five implementations now agree.

Found by writing the new `filter-panel` block, which puts three of them in a row.
