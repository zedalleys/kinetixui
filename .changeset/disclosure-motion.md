---
"@kinetixui/ui": minor
---

Give Collapsible the disclosure motion it shipped without, and put Accordion's timing back under the tokens.

`Collapsible` was three Radix primitives re-exported untouched. Its content appeared and vanished in
a single frame while `Accordion` — the same disclosure gesture on a sibling primitive — animated its
height. Measured in a browser before this change, the content went 0px to 84px with no animation at
all, against the accordion's 0px → 24.64px → 36px over 200ms. Disclosure is the case where motion
carries meaning rather than decorating it: content growing out of the trigger is what says it belongs
to the control you just pressed and where it will go when you press it again.

`CollapsibleContent` is now wrapped rather than re-exported, so it carries `overflow-hidden` and the
open/closed animation and merges a caller's `className` the way every other component here does. The
props, the ref and the data attributes are still the primitive's own.

**Accordion's timing was hard-coded.** `0.2s ease-out` happened to equal `--duration-fast` and to be
the same curve as `--easing-enter`, so the values were right and the provenance was not: changing the
token would have moved every other transition in the system and left disclosure behind. Both
disclosure animations now read the tokens, and use the directional pair those easings exist for —
opening decelerates, closing accelerates. Nothing moves at a different speed than before.

The preset gains `animate-collapsible-down` / `animate-collapsible-up` and the keyframes behind them,
which is additive and the reason this is a minor rather than a patch. `caret-blink` and `typing-dot`
deliberately keep their literal timings: they are looping affordances rather than state transitions,
and retiming them to the nearest token would change how they look to buy a consistency nobody asked
for.

**What a consumer sees.** A Collapsible that previously snapped now takes 200ms to open and close,
and its content is clipped while it does. Under `prefers-reduced-motion` it lands instantly on the
same end state, as it did before. Nothing else in the catalogue changes: Accordion renders
identically, and no other component's timing moved.
