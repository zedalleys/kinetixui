---
"@kinetixui/ui": minor
---

Wire the unreachable motion tokens, and give every component a reduced-motion floor.

Four motion tokens were defined in `tokens/primitives/motion.json` and emitted into `globals.css`,
but never mapped in the Tailwind preset, so no class could reach them: `--duration-instant` and the
`--easing-enter` / `--easing-exit` / `--easing-emphasized` trio. The preset now exposes them as
`duration-instant`, `ease-enter`, `ease-exit` and `ease-emphasized`, added alongside Tailwind's own
scales rather than replacing them. Directional easing is the point of the enter/exit pair — a
surface that opens should decelerate and one that closes should accelerate — and until now you
could not say that in a utility.

The preset also emits a `prefers-reduced-motion: reduce` base layer. This package ships no CSS of
its own, so the preset is the only place a library-wide guarantee can live, and it was missing:
`tailwindcss-animate` emits no reduced-motion rule, so every `animate-in` / `animate-out` on Dialog,
Sheet, Popover, Dropdown, Tooltip and the rest ran at full motion in a consumer's app no matter what
the operating system asked for. The rule shortens durations to `0.01ms` rather than removing motion,
which is the safety property: the end state still arrives, so a Switch thumb is still translated and
a checked box is still checked, and Radix still gets the `animationend` it unmounts overlays on.
`animation: none` would strand those overlays in the tree.

Twenty components were then moved off untokenised values onto the scale — overlays adopt a
consistent open/close pairing (`duration-fast ease-enter` in, `duration-instant ease-exit` out), and
press-feedback controls adopt `duration-instant`. Several `transition-all` declarations were
narrowed to the properties that actually animate, so a transition no longer fires on layout and
paint properties it was never meant to touch. `Tour` additionally checks the preference in
JavaScript before calling `scrollIntoView`, because an explicit `behavior: "smooth"` overrides the
CSS `scroll-behavior` the base layer sets.

Consumers inherit the base layer by extending the preset; no configuration or migration is needed.
