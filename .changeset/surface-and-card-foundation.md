---
"@kinetixui/tokens": minor
"@kinetixui/ui": minor
"@kinetixui/angular": patch
---

Establish the surface model, and give Card a finished resting state and an opt-in interactive contract.

**New token: `surface-grouped`.** The grouped section raised content sits on — a settings group, a dashboard
region. Light is the grey of `muted` (`#f6f6f6`); dark is `blue.850` (`#081219`), between the page and
`card`. It is its own role because dark `muted` is lighter than `card`, so a card placed on a `muted`
section read as recessed in dark mode. Emitted to every platform output (`--surface-grouped`,
`KinetixColors.surfaceGrouped`, `color_surface_grouped`, `KinetixColorScheme.surfaceGrouped`) and mapped in
the Tailwind preset as `bg-surface-grouped`. `muted-foreground` clears AA on it in both themes (4.79:1 / 8.48:1).

**Card looks raised without a heavy stroke.** Its edge is now `--border` at half strength, so it no longer
draws the same line as the inputs and buttons inside it, and it rests on the `md` step of the elevation
ladder instead of `sm`, whose 5% shadow did not visibly render. Both stay on tokens, so Create's surface
treatments still apply. Visual change only; no class a consumer passes is overridden. `.kx-card` in
`@kinetixui/angular` takes the same resting treatment.

**`Card` gains `asChild`.** A Card stays static by default — no hover, no pointer cursor. Rendered as an
`<a href>` or `<button>` through `asChild`, it takes interactive states keyed on that element: hover (on
pointers that can hover) strengthens the edge and lifts to `lg`; pressed drops to `sm` with a `muted` wash;
`aria-pressed="true"` or `aria-current` draws a 2px `--primary` edge; keyboard focus shows the shared
`shadow-focus` ring above every other state. The hover elevation transitions over `duration-fast` and is
removed under `prefers-reduced-motion`. `CardProps` is exported. Additive; existing usage is unchanged in API.
