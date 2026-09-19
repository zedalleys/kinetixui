---
"@kinetixui/ui": patch
---

Forced-colors and reduced-motion fixes found by new real-browser checks: `InputOTP`'s active slot and the `Chart` SVG now keep a visible focus outline in forced-colors mode (box-shadow rings are stripped there); `Skeleton`, the chart loading placeholder and `MessageBubble`'s typing dots stop under `prefers-reduced-motion`, and `Spinner` / the `FileUpload` spinner slow to one turn per three seconds instead of spinning at full speed.
