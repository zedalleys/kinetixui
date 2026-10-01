---
"@kinetixui/ui": patch
---

Fix the form family under RTL, and give MultiSelect the arrow key that opens it.

**InputOTP was broken in every RTL locale.** The slots are a flex row, so `dir="rtl"` reverses them and the
first slot moves to the right-hand end — but their divider, their outer border and their two rounded corners
were physical. Measured in Chromium at `dir="rtl"`, with six slots: both rounded corners sat on the group's
*inner* edges, the divider after the first slot doubled to 2px, and the outer edge at the far end had no
border at all. The slot now uses `border-e`, `first:border-s`, `first:rounded-s-md` and `last:rounded-e-md`,
and measures as the exact mirror of LTR in either direction.

**MultiSelect, and the Command and Tag it composes.** The "Create …" row was `text-left`, `CommandInput`'s
magnifier was `mr-2` — a gap on the far side of the icon and none between it and the field — and `Tag`'s
remove control was nudged with `-mr-0.5 ml-0.5`, toward the right-hand edge of a chip whose end is on the
left. All four are now logical. `CommandShortcut` moves from `ml-auto` to `ms-auto` at the same time, so a
shortcut in a Command list sits at the inline end.

**MultiSelect did not open on Down Arrow.** WAI-ARIA's combobox pattern lists it as a way to open the popup
and it is the first thing a keyboard user tries; the handler recognised only Enter and Space, so both
vertical arrows did nothing at all. They now open the list, which Enter and Space already did.

Patch rather than minor: no API is added, removed or renamed, nothing new is available to adopt, and each
change corrects behaviour that was already wrong. Upgrading changes how these controls render in an RTL
locale and adds a key that should always have worked, and changes nothing in an LTR app.

One packaging note: the build now writes `dist/kx-src-hash.json`, a hash of the source the artifact was
built from. It is inert at runtime — nothing imports it — and exists so the repository's browser checks can
refuse to measure a `dist` that no longer matches its source.
