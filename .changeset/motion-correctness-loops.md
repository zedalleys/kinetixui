---
"@kinetixui/ui": patch
"@kinetixui/iot": patch
---

Motion correctness. `Spinner` and the `FileUpload` loader now rest as a static ring under `prefers-reduced-motion` instead of carrying a "slow to three seconds" class the reduced-motion floor made dead; the ring keeps its `role="status"` name and survives forced colours (the open side is `Canvas`, since forced colours closes a transparent border). `InputOTP`'s caret states its reduced form explicitly. `@kinetixui/iot` swaps CSS-default `ease-out` for the `ease-enter` token (the identical curve) and `pairing-method-picker`'s `transition-all` for the three properties that change.
