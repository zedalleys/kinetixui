---
"@kinetixui/ui": patch
"@kinetixui/tokens": patch
---

Fix low contrast on tinted info surfaces: Banner and Inform `information` text used `--info` (#57788e) on its own 10% tint, only 4.15:1. They now use a new `text-info-on-container` utility backed by `--semantic-on-info-container` (light #395a70; dark now defined too, matching `--info`). Adds the dark value for `semantic.on-info-container` to the token contract; SwiftUI, Compose and Flutter get `colorSemanticOnInfoContainer` in their compiled tokens. Found by the new real-browser axe pass.
