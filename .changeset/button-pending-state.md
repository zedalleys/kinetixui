---
"@kinetixui/ui": minor
"@kinetixui/angular": minor
---

`Button` can say the action it started is in flight. `pending` and `pendingLabel` are new, optional and
controlled by the caller: React `<Button pending={saving} />`, Angular `<button kxButton [pending]="saving()">`.

It is deliberately not `disabled`. `disabled` removes the control from the interactive set, which moves
the focus the user just placed and takes the accessible name with it on some platforms, so the second
they commit an action they lose their place. While `pending` the button carries `aria-disabled` and
`aria-busy`, keeps its name, keeps its focus and keeps `cursor: progress`, and activation is suppressed
for every input device rather than for the pointer alone — click, <kbd>Enter</kbd>, <kbd>Space</kbd>,
pointer, touch and implicit form submission. The status is announced politely from a live region placed
outside the button, because a region nested inside it would join the button's own name; the announcement
is driven by the state transition, so it fires once per change and not once per render. A spinner is
drawn in a slot that is reserved in both states, so the label does not move when it appears, and the
slot inherits the Spinner's existing reduced-motion contract instead of restating it. The default label
is the English "Working…" — pass `pendingLabel` to localise, as `ResultState` and `Spinner` already allow.

Precedence is defined rather than discovered: `disabled` wins over `pending` (a control the author has
disabled is not doing anything), and `state="Disabled"` wins over `state="Pending"`. `pending` with
`asChild` throws in development and falls back to rendering the button without an indicator in
production, because Radix's `Slot` takes exactly one child and a spinner cannot be injected into it —
silently ignoring `pending` there would hide a broken state from the author. `state` also gains a
`Pending` member for docs and snapshots, next to the `Disabled` it already had — and it is
presentational only. Pinning it draws the indicator and changes nothing else: no suppressed
activation, no `aria-busy`, no `aria-disabled`, no announcement. The prop is the state; the axis is a
picture of it, the same relationship `state="Disabled"` has to `disabled`.

Only Enter and Space are cancelled on a key event. Tab still moves focus off a pending button, which
matters because this state deliberately keeps it focusable, and Escape and the arrow keys still reach
the caller's own handler. On `size="icon"` the indicator replaces the glyph for as long as it is
pending, so the square keeps its size and its accessible name.

`DEFAULT_PENDING_LABEL` is exported from `@kinetixui/ui`, so a caller can build on the default
wording rather than retyping it.

Nothing changes for a call site that does not mention `pending`. The prop is three-valued on purpose
(absent, `false`, `true`): absent renders exactly the previous tree, with no indicator slot, no spacing
change, no live region and no extra attributes, which is what keeps all 305 existing `<Button>` call
sites across the site and the stories byte-identical. The motion contract is untouched.

`KinetixButton` gains the same `pending` state on SwiftUI, Compose and Flutter, each through the
platform's own mechanism rather than a transliteration of the web one: SwiftUI gates the action and
exposes the status as the element's accessibility *value* with `.updatesFrequently` (not `.disabled()`,
which drops the traits VoiceOver names the control by, and not `.allowsHitTesting(false)`, which takes
hover and focus with it); Compose keeps `enabled = true`, gates `onClick` and sets `stateDescription`
with a polite `liveRegion`; Flutter keeps `onPressed` non-null and gates the callback, because in
Flutter a null `onPressed` *is* disabled semantics. All three reserve the 18pt/dp/px indicator slot in
both states, and all three are three-valued, so a call site that never mentions `pending` builds what
it built before.

Compose adds the parameters on a second public overload with `pending` and `pendingLabel` undefaulted
and last, the original delegating to it, per this repository's public-overload rule: adding a defaulted
parameter to a published composable replaces the JVM descriptor and an app compiled against the previous
release fails with `NoSuchMethodError` at runtime. A reflection test on the compiled class fails if the
two are ever collapsed into one.

None of these three packages is published to a registry, so none of them appears in this changeset's
frontmatter; the native half is recorded here so it reaches the release notes rather than only the diff.
