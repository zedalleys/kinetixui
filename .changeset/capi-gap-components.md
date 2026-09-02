---
"@kinetixui/ui": minor
---

Add 4 components ported from the TapNTry / Capi design source:

- **`AudioPlayer`** — native `<audio>` playback with a scrubber, `mm:ss` time
  labels, ±10s skip and prev/next callbacks. `variant="full" | "mini"`.
- **`CircularProgress`** — ring progress indicator with an optional centre value.
- **`Image`** — ratio-locked image (`1:1` / `3:2` / `4:3` / `3:4` / `3:1` /
  `16:9` presets or a number), muted loading placeholder, error fallback.
- **`Inform`** — persistent, dismissible, intent-tinted inline notice with an
  optional CTA. `variant="information" | "warning" | "success" | "error" | "action"`.
