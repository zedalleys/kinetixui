---
"@kinetixui/ui": patch
---

Mirror the rest of the overlay family under `dir="rtl"`.

Slice 1 of the RTL conversion took Dialog, Sheet, Drawer, DropdownMenu and Select onto logical
properties and stopped there, which left an app in Arabic or Hebrew with half a mirrored overlay set:
open a Dialog and it reads correctly, open the ContextMenu behind it and the inset indent, the
check gutter and the keyboard shortcut all sit on the wrong side.

`ContextMenu` and `Menubar` now indent inset items with `ps-8`, place the check and radio gutter at
`start-2`, push shortcuts with `ms-auto`, and mirror the submenu chevron with `rtl:-scale-x-100`.
`AlertDialog` aligns its header with `sm:text-start`. `NavigationMenu` spaces its disclosure chevron
with `ms-1` and anchors both panels at `start-0`.

Two deliberate non-conversions, marked `// rtl-ok` with their reason rather than silently left:
the `left-1/2` centring trick in `AlertDialog` and `Modal` is direction-agnostic by construction, and
`Popover` and `Tooltip` keep their physical `data-[side=…]:slide-in-from-…` pairs because Radix has
already resolved `data-side` to a physical side after flipping for direction and collisions — a
logical class there would invert the animation under RTL and throw the surface the wrong way.

`check-rtl.mjs` proves no physical class is left behind; it cannot prove the replacement is the right
one or that the Radix primitive flips, which is the failure the first slice spent a pass discovering.
`components-rtl.test.tsx` covers that half, asserting the rendered classes and the
direction-dependent key handling. The conversion ratchet drops from 29 pending files to 22.
