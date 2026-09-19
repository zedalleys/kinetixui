---
"@kinetixui/ui": patch
---

Components now consume the type-scale aliases (`text-label-*`, `text-body-md`, `text-title-dialog`) instead of re-deriving them from Tailwind literals — Button, Badge, Tag, Kbd, Input, Select, NativeSelect, Textarea and Modal render identically. `cn()` now knows the type scale, so a `text-label-*` class no longer swallows a text colour class in `tailwind-merge`. Adds a rendered axe-core pass over every story.
