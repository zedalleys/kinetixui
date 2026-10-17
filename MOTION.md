# Motion

How KinetixUI moves, on every platform, and how a change to motion is checked. Values live in
[`tokens/primitives/motion.json`](tokens/primitives/motion.json); roles, reduced-motion forms and platform
interpretation live in [`tokens/contracts/motion.json`](tokens/contracts/motion.json). This page explains
both and never restates a value, so it cannot drift from them. `pnpm check:motion-tokens` holds the contract
to the source.

This page separates what is true today from what is planned. "Planned" items name the MX1 slice that owns them.

## Principles

1. **Motion carries state, hierarchy or space.** A selection moving, a surface arriving, a disclosure
   opening. If an animation explains nothing, remove it.
2. **Motion is never the only signal.** Selection, expansion and errors are also in semantics
   (`aria-selected`, `aria-checked`, `aria-expanded`, native selected/toggled traits) and in a non-motion
   visual cue (colour plus shape, weight or an indicator that is visible at rest).
3. **State changes first, motion follows.** Semantic state, focus and announcements update on the
   interaction, not on animation end. No transition blocks input.
4. **Interruptible.** A new trigger retargets from the current value; nothing queues. CSS transitions,
   SwiftUI implicit animation, Compose `animate*AsState` and Flutter implicit widgets all do this natively.
5. **Reduced motion reaches the same end state.** See the reduced forms below.
6. **Logical direction.** Horizontal movement follows inline start/end and mirrors in RTL; vertical
   movement ignores text direction.

## Duration tiers

Five tiers, generated to CSS (`--duration-*`), Tailwind (`duration-*`), Angular (the CSS variables),
SwiftUI, Compose and Flutter (`KinetixDuration.*`). Their intent is each token's `$description`.

The MX1 brief proposed `instant 100 · fast 200 · normal 300 · slow 400`. The contract records the
decision per tier:

| Tier | MX1 proposal | Decision |
| --- | --- | --- |
| `instant` | instant 100ms | matches |
| `fast` | fast 200ms | matches |
| `base` | normal 300ms | **kept the name** `base`: same value, renaming would break five platforms |
| `slow` | slow 400ms | **kept the value** 500ms: Sheet opens on it; change only with a rendered comparison |
| `slower` | not proposed | loop periods only, not a transition tier |

The gate fails if a tier's value moves and its recorded decision does not.

## Easing

Five curves: `standard` (state change in place), `enter` (decelerate, arriving), `exit` (accelerate,
leaving), `emphasized` (rare travel that should be noticed), `linear` (loops and value-tracking only).
Every platform receives the same four control points and interprets them exactly (CSS `cubic-bezier`,
SwiftUI `Animation.timingCurve`, Compose `CubicBezierEasing`, Flutter `Cubic`).

**Springs are not tokens.** No component uses a spring. CSS has no spring timing function, and SwiftUI
`.spring(response:dampingFraction:)`, Compose `spring(dampingRatio, stiffness)` and Flutter
`SpringDescription` take different parameters that do not map one to one. When a component needs physical,
interruptible motion on at least two platforms (a drag release, a sheet fling), define the intent first
(for example "settle"), then each platform's native parameters, verified on that platform.

**Delay, stagger, distance.** A delay is a duration tier. Distance reuses the spacing scale. Stagger is
not a token yet: the only library stagger is the typing indicator's 150ms offset on four platforms, and one
consumer does not justify a five-platform token. The contract's `untokenised` section records when each
would be added, and the gate fails if one becomes a token group while the contract still says otherwise.

## Roles

A role is a duration and easing pairing with a named job. Status is earned:

- **proven** — consumers on at least two platforms, each still containing the pairing, and a named check.
- **observed** — the pairing repeats in source; no check of its own yet.
- **proposed** — a direction; no component does it yet, so it lists no consumers.

The current roles, with their platforms and status, are rendered on
[/docs/foundations](https://kinetixui.com/docs/foundations#motion-roles) from the contract. A consumer that
stops using its role's pairing fails `check:motion-tokens`; a recorded deviation (today: Angular Switch on
`base`) fails once it is aligned and not removed.

## Reduced motion

Each role names one reduced form:

| Form | Meaning | Used by |
| --- | --- | --- |
| `shorten` | Runs at ~0ms, same end state. Only the interpolation goes. | selection control, selection state, disclosure, overlay, spatial, press feedback |
| `crossfade` | Travel replaced by opacity to the same end state. | SwiftUI slides (`KinetixSlideMotion`) |
| `rest` | A loop stops at a static state that keeps its role and name. | Spinner, Skeleton, Marquee, typing indicator |
| `remove-travel` | The element appears at its destination; colour may still shorten. | selection indicator (proposed) |

How each platform gets there:

| Platform | Mechanism | Runtime changes |
| --- | --- | --- |
| React | Preset floor: every duration 0.01ms under `prefers-reduced-motion` (never `animation: none`, which strands Radix overlays). Loops add `motion-reduce:animate-none`. | Yes (media query) |
| Registry installs | No preset, no floor. Each delivered loop carries its own reduced form (`check:registry-motion`); plain transitions do not shorten. | — |
| Angular | Per-component `@media (prefers-reduced-motion: reduce)` blocks. No global floor yet. | Yes (media query) |
| SwiftUI | `@Environment(\.accessibilityReduceMotion)` through the family helpers. | Yes (environment) |
| Compose | System animator duration scale through `rememberReduceMotion()`. | Read on composition |
| Flutter | `MediaQuery.disableAnimationsOf(context)` through the family helpers. | Yes (rebuild) |

Rules that apply everywhere: focus visibility does not depend on motion; a loading state stays
understandable when its loop rests; no transition gates input.

## RTL and logical direction

- Position indicators and thumbs with logical properties (`inset-inline-start`, `margin-inline-*`) or
  native leading/trailing. A physical `translate-x` needs an explicit mirror and is the usual source of
  wrong-way motion.
- In Tailwind 3, `rtl:` matches any RTL ancestor, not the element's own direction; prefer logical
  properties to `rtl:` flips (`switch.tsx` documents the defect).
- Recompute indicator geometry on resize, scroll and dynamic content; a stale measurement is a bug even if
  the first render is right.
- Vertical orientation does not mirror.

## Performance

Animate `opacity` and `transform` by default. Name the properties that change; `transition-all` is banned.
Layout properties (`width`, `inset-*`, `grid-template-rows`) are allowed only with a recorded reason in the
motion-contract allowlist, because sometimes geometry is the point (a progress fill, Switch's logical thumb,
a disclosure). Avoid animating `box-shadow` on large surfaces and filters on scrolling content.

## Anti-patterns

- Motion that runs on its own with no trigger, or decorates nothing.
- Delaying navigation, focus or semantic state until an animation ends.
- A bare `transition-colors` with no tier: it runs on Tailwind's untokenised 150ms. Existing ones are frozen
  in a debt register in `apps/web/src/lib/motion-contract.test.ts` until each moves to its role: press feedback on instant, a change of selected state on fast (both decided 2026-10-17);
  new ones fail.
- Hover and selection on the same property. A transition is timed by the property that changes, not by
  what changed it, so `hover:bg-*` beside a selected `bg-*` runs hover on selection's tier. Put hover and
  press on a state layer (Toggle uses an inset `box-shadow`) and give each property its own tier.
- Slowing a loop under reduced motion (`motion-reduce:animate-[spin_3s…]`): the floor freezes it instead.
- Scale effects that shrink or clip a focus ring.
- Sliding indicators where the platform's native control does not slide.
- A token name that does not exist (`duration-normal`, `--easing-smooth`): browsers drop it silently;
  `check:motion-tokens` refuses it.

## Verification expectations

Different claims need different evidence; do not collapse them.

| Claim | Evidence |
| --- | --- |
| Values agree across platforms | `check:motion-tokens` (source shape, web CSS and six native files) plus CI's generated-files fixed point |
| A component uses its role's pairing | `check:motion-tokens` consumer check |
| No untokenised timing is added | `motion-contract.test.ts` |
| Motion is perceptible and reaches its end state; reduced motion removes it | `check:motion` (rendered midpoint and duration in Chromium; a state may also pin its property's own tier) |
| Toggle and ToggleGroup: layer on instant, hover that leaves selection alone and does not stick on touch, rapid input, forced colours, RTL, 320–1280px at 100/200% text | `check:toggle-motion` |
| Loops rest under reduced motion | `check:loop-motion`, `check:registry-motion` |
| Native components honour the reduced-motion setting | `check:native-motion` (source bookkeeping) and native tests in `native-*.yml` |

Native mappings are validated from generated source in the cloud container; native runtime behaviour is
only exercised by the native workflows, and SwiftUI tests check helper values without rendering. A new motion
behaviour should add a rendered check, and a negative control that shows the check fails without the change.

## Component motion specs

Every component motion change states: trigger · property · duration tier · easing · reduced form ·
interruption · final state · focus and screen-reader behaviour · RTL. Specs land here as each is
implemented; the rest of the MX1 plan (navigation motion, platform parity) stays in the plan until then.

### Toggle and ToggleGroup (React, MX1b-1a)

| | Selection | Hover and press |
| --- | --- | --- |
| Trigger | `data-state` / `aria-pressed` (`aria-checked` in a single group) changes | pointer over (only where `(hover: hover)`), `:active` |
| Property | `background-color`, `color`, `border-color` | inset `box-shadow` state layer, `foreground` at 8% / 14% |
| Tier · easing | `fast` 200ms · `standard` (role `selection-state`) | `instant` 100ms · `standard` (role `press-feedback`) |
| Reduced form | shorten (preset floor; `motion-reduce:transition-none` for registry installs) | shorten |
| Interruption | a new state retargets from the current colour; the last input wins | follows the pointer |
| Final state | the state's colour; semantics change at once, before any paint | layer gone when the pointer leaves or the finger lifts |
| Focus / SR | focus ring unchanged; `aria-pressed` / `aria-checked` never wait for paint | none |
| Forced colours | the chosen item takes `Highlight` / `HighlightText`; focus stays an outline | the system replaces the layer |
| RTL | colour is direction-free; arrow keys follow reading order through `KinetixDirectionProvider` or `dir` | — |

ToggleGroup items wrap rather than overflow, so a labelled group reflows at 320px with 200% text.
