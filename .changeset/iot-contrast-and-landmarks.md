---
"@kinetixui/iot": patch
"@kinetixui/tokens": patch
"@kinetixui/ui": patch
---

Fix five accessibility defects on IoT surfaces: contrast on tinted cards, and duplicate landmark names.

A real-browser axe pass over the IoT stories found nine colour-contrast failures and two duplicated
navigation landmarks. Both are genuine WCAG failures, not false positives, and both predate the pull
request that surfaced them.

**Contrast.** `--muted-foreground` is tuned against `--background` and `--muted`, where it clears AA
at 5.17:1. IoT device, group and activity cards tint their surface to carry state, and a 10% tint
spends the whole margin: secondary text landed at 4.43:1 on `bg-primary/10` and 4.33:1 on
`bg-destructive/10`, under the 4.5:1 that WCAG 1.4.3 requires. The token itself is not wrong —
`neutral.600` is a published Figma value — so the fix is a new semantic token for the surfaces that
tint, `--semantic-muted-on-container`, exposed as `text-muted-on-container`. This follows
`--semantic-on-info-container`, which exists for the same reason on `bg-info/10`. It clears AA on
every tint those cards use, worst case 4.79:1, and stays visibly lighter than `--foreground` so the
type hierarchy is unchanged. Dark mode needed no new value and reuses `--muted-foreground`: a tint
lightens a dark surface away from its text rather than toward it, so dark was already at 6.9–8.4:1.

`DeviceControlCard`, `DeviceGroupCard`, `DeviceIdentity` and `ActivityTimeline` now use it for the
text that sits on those surfaces. Nothing is restyled beyond the colour of that text.

**Landmarks.** `SpaceBreadcrumb` named its `<nav>` "Location" for every instance, so a screen
listing several places produced several identically-named navigation landmarks — which is no more
useful than none when picking one from a landmark list. The accessible name now defaults to
`Location: <current place>`, taken from the last item in `path`, and remains overridable with
`label`. A breadcrumb rendered without a path still falls back to "Location".

Patch rather than minor: the new token and utility exist only to carry the correction. Nothing is
removed or renamed, no consumer has to adopt anything, and upgrading changes what was already wrong
rather than adding capability to take up.
