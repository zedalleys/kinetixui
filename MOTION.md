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
stops using its role's pairing fails `check:motion-tokens`; a recorded deviation fails once it is aligned and
not removed. There are no recorded deviations today: the last one, Angular's Switch on `base`, was aligned in
MX1b-2.

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
- Fading out a glyph whose identity is gone. Once a control's state has changed, CSS only knows the new
  state, so a fade-out shows whichever glyph that state would draw: a Checkbox going mixed → unchecked would
  fade a tick. Fade in on the new state and leave at once, unless the control has only one glyph (Radio).
- Choosing what to draw from a prop the primitive may not have. `props.checked` is undefined when uncontrolled;
  key the drawing on the primitive's own `data-state`.
- Leaving a state's only cue to an author colour. Forced colours repaint backgrounds as `Canvas`, so a
  Switch thumb filled with `background` vanished into its track and on read the same as off. Draw that cue in
  a system colour (`CanvasText`) under `forced-colors`, or give it an edge the system keeps.
- Relying on the preset's floor for a component the registry ships. A registry install has no floor, so a
  transition without `motion-reduce:transition-none` still runs for a reduced-motion reader.
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
| Checkbox and RadioGroup: the glyph drawn is the state announced on every move, halo on instant, touch, rapid input, forced colours, RTL, 320–1280px at 100/200% text | `check:checkbox-radio-motion` |
| Switch: thumb, track and halo on instant, the thumb sampled every frame (forward only, no overshoot, mirrored in RTL) with `aria-checked` already changed, touch, rapid input and mid-travel reversal, form reset, forced colours, 320–1280px at 100/200% text | `check:switch-motion` |
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

### Checkbox and RadioGroup (React, MX1b-1b)

| | Selection | Glyph (tick, dash, dot) | Hover and press |
| --- | --- | --- | --- |
| Trigger | Radix `data-state` / `aria-checked` changes (click, Space, arrow keys in a group, owner, form reset) | the Indicator's own `data-state` | pointer over (only where `(hover: hover)`), `:active` |
| Property | Checkbox `background-color`, `color`, `border-color`; Radio `border-color`, `color` | `opacity` of the Indicator; which glyph is `display`ed | the 5px `box-shadow` halo, `foreground` at 8% / 14% |
| Tier · easing | `fast` 200ms · `standard` (`selection-state`) | in on `fast` · `standard`. Checkbox leaves at once; Radio fades out on `fast` | `instant` 100ms · `standard` (`press-feedback`) |
| Reduced form | shorten (preset floor; `motion-reduce:transition-none` for registry installs) | the glyph appears and goes at once | shorten |
| Interruption | retargets from the current colour; the last input wins | the glyph switches in the frame the state does (checked ↔ mixed never cross-fades) | follows the pointer |
| Final state | the state's fill or border | tick under checked, dash under mixed, nothing under unchecked; one dot, on the chosen radio | halo gone when the pointer leaves or the finger lifts |
| Focus / SR | ring unchanged and never covered; `aria-checked` (including `mixed`) never waits for paint | glyphs are `aria-hidden`; state is announced by `aria-checked` | none |
| Forced colours | the edge stays; fills are replaced by the system | the glyph is drawn in the system text colour; focus is an outline | the system removes the halo |
| RTL | colour is direction-free; a Radio group's arrow keys follow reading order through `KinetixDirectionProvider` or `dir` | centred in the box, so it does not move with direction | — |

The box's own hover and press colour step (TOKENS.md, "Selection controls": an unchecked edge darkening to
`foreground`, a checked fill stepping to `action`/90 and /85) is kept. It shares a property with selection, so
it moves on `fast` with it; the halo, on `instant`, is the immediate answer. This is the one place the
"Hover and selection on the same property" rule is knowingly relaxed, to keep the selection-control contract
unchanged.

### Switch (React, MX1b-1c)

Switch keeps its own role, `selection-control`, on purpose. Its thumb is a physical control that should land
with the finger, so everything on it runs on `instant`; Toggle, Checkbox and Radio change colour on `fast`
because a colour settling reads better slower. The two are not to be normalised to one duration.

| | Thumb | Track | Hover and press |
| --- | --- | --- | --- |
| Trigger | Radix `data-state` / `aria-checked` changes (click, tap, Space, Enter, a label, owner, form reset) | the same | pointer over (only where `(hover: hover)`), `:active` |
| Property | `inset-inline-start` (relative, so nothing reflows) | `background-color` (`tertiary` → `action`; `action`/90 under the pointer when on) | the 5px `box-shadow` halo, `foreground` at 8% / 14% |
| Tier · easing | `instant` 100ms · `standard` (`selection-control`) | `instant` 100ms · `standard` | `instant` 100ms · `standard` |
| Reduced form | shorten (preset floor; `motion-reduce:transition-none` for registry installs) | shorten | shorten |
| Interruption | retargets from where the thumb is; the last input wins; never passes either end | retargets from the current colour | follows the pointer; pressing does not move the thumb |
| Final state | inline start when off, inline end when on | the state's colour | halo gone when the pointer leaves or the finger lifts |
| Focus / SR | `role="switch"`, `aria-checked` changes before the first frame of travel; `aria-required` when required; ring never covered | — | none |
| Forced colours | drawn in `CanvasText` (`GrayText` when disabled) so it stays visible against the `Canvas` track | the edge stays | the system removes the halo |
| RTL | travels toward the inline end of the switch's own direction, so leftward in RTL | — | — |

Hover's `action`/90 and selection share `background-color`, but both are on `instant`, so the "Hover and
selection on the same property" problem does not arise here.

### The Angular selection controls (MX1b-2)

With Angular consuming them, `selection-state` and `press-feedback` have consumers on two platforms and a
check of their own, so both are **proven** rather than `observed`. `selection-control` was already proven and
now records no deviation.


React is first, not final: the same contracts, implemented the way Angular implements things, and measured in
the same instrument. `check:angular-selection-motion` drives the package as a live Angular application in
Chromium (the `selection-motion` fixture) and reads the transitions that actually run.

| Component | Selection | Layer | How Angular does it |
| --- | --- | --- | --- |
| Switch | thumb `inset-inline-start` and track `background-color`, `instant` 100ms · `standard` | halo `box-shadow`, `instant` | `selection-control`, as React. Before MX1b-2 both ran on `base` (300ms), the one recorded deviation in the contract |
| Checkbox | `background-color`, `border-color`, `color`, `fast` 200ms; the glyph fades in on `fast` and leaves at once | halo `box-shadow`, `instant` | both glyphs rendered, the stylesheet showing the one `aria-checked` names; before MX1b-2 an `@if` mounted one of them and everything ran on `instant` |
| RadioGroup | `border-color` on `fast`; the dot fades on `fast` from its own layer | halo `box-shadow`, `instant` | the dot is a span over the native input, not an inset ring inside the input's `box-shadow` — one `box-shadow` is one transition, so a shared property could only carry one tier |
| Toggle, ToggleGroup | `background-color`, `color`, `fast` 200ms | an inset `box-shadow` layer, `foreground` 8% / 14%, `instant` | the hover `--muted` fill became that layer: a background step would be `background-color` and could only run at selection's `fast` |

Forced colours: the Switch thumb and the Radio dot are drawn in `CanvasText` (`GrayText` when disabled),
because a background is repainted as `Canvas` there and both used to disappear into their own track or ring.

Reduced motion: the per-component block in `packages/ui-angular/src/styles.css` covers each new element, so
every control lands on its end state with nothing running.

### Selection controls (Compose, MX1d)

Two things were wrong on Compose, and only one of them was reported. `Switch.kt` animated `thumbOffset`
and handed `trackColor` straight to `.background`, so the track cut between `tertiary` and `action` in one
frame while the thumb slid for 100ms — `selection-control` covers both, which is why Compose's Switch was
not ticked for Impl. And Toggle, Checkbox and RadioButton did not animate at all.

| | Switch track | Toggle / Checkbox / Radio |
| --- | --- | --- |
| Trigger | `checked`, and `enabled` (the disabled alpha is part of the animated target) | `pressed`, the `ToggleableState`, `selected` |
| Property | `background-color` via `animateColorAsState` | container, text, border and fill colour via `animateColorAsState`; the radio dot's `alpha` via `animateFloatAsState` |
| Tier · easing | `instant` 100ms · `standard` (`selection-control`), the same spec as the thumb | `fast` 200ms · `standard` (`selection-state`) |
| Reduced form | `tween(0)` at `ANIMATOR_DURATION_SCALE` 0, through the one shared reader | the same |
| Interruption | Compose retargets from the current colour | the same |
| Final state | the state's colour; the semantics (`Role.Switch`, `triStateToggleable`, `selectable`) never wait for paint | the same |
| Focus / SR | unchanged. ToggleGroup gains an optional `accessibleLabel`: a named traversal group, not a merged element, so each item still reports its own on/off | — |
| RTL | the thumb's `Modifier.offset` resolves against layout direction, so travel mirrors; colour is direction-free | colour is direction-free |

The Checkbox glyph still swaps in one frame while the fill settles — a stated difference from React, which
fades the tick in on `fast` and removes it at once. Doing that properly here means composing both glyphs and
animating their alpha so a box leaving mixed never shows a tick on the way out (the defect #400 fixed on the
web); the fill already carries the state change, so it is recorded rather than half-built.

Evidence, stated exactly: **Headless verified** for interaction and accessibility —
`SelectionMotionTest.kt` composes each control through Robolectric and reads the semantics tree, and
`./gradlew :ui:testDebugUnitTest` runs it in `native-compose.yml`. No emulator job exists, so Runtime stays
open. Robolectric is a JVM host; it renders nothing a person could see.

**The switch's track is measured.** `SwitchMotionTest` stops the test clock, advances it half a duration
into the gesture, and reads the colour the switch actually rasterised, in both directions and with
animations off. The colour is taken as the most common fully opaque pixel rather than from a fixed
coordinate, because the thumb is moving and any coordinate that is track at one point in the gesture is
thumb at another; the track is the larger opaque area by roughly 840 pixels to 310, so the mode is the
track whatever the thumb is doing. It runs under Robolectric's NATIVE graphics mode, since LEGACY draws
nothing and would compare two blank bitmaps and pass.

That closes a gap this slice first recorded rather than fixed, and it is worth saying why the obvious
routes did not: `animateColorAsState` does not expose which spec it was handed, so no assertion can read
the track's *spec*; `check:native-motion` stays green if the track reverts, because `Switch.kt` still names
`KinetixSwitchMotion` for the thumb; and the contract cannot pin it, because `check:motion-tokens` requires
a consumer's `expects` to name the role's own duration and easing, which `Switch.kt` deliberately does not —
it delegates both to the helper. **On every native platform the contract can pin the helper that holds the
timing and never the component that consumes it**, where React and Angular pin the component directly
because their timing is written in the component's own classes and stylesheet. The painted test goes around
that limit for one control rather than removing it: the same idiom is not yet extended to the checkbox's
fill, the radio's dot or the toggle's surface, each of which needs its own answer to which pixel is the
subject while a glyph moves over it. Watching the thumb's position and the track's colour at one instant,
rather than each on its own, still wants an on-device capture.
