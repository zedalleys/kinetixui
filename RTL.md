# KinetixUI — RTL support

**Status:** in progress. Slice 2 of an ongoing conversion — KinetixUI
does not yet fully mirror under `dir="rtl"`. Treat this file as the running
ledger of what's converted, not a "done" checkmark. **22 of 29 remaining files
are still unconverted**; the overlay family is done.

## The two pieces

RTL support needs **both** of these — either alone is not enough:

1. **CSS logical properties.** Component source must use direction-relative
   Tailwind utilities (`ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`,
   `border-s`/`border-e`, `rounded-s`/`rounded-e`, `text-start`/`text-end`)
   instead of physical ones (`pl-`/`pr-`, `left-`/`right-`, `border-l`/`border-r`,
   `text-left`/`text-right`). Tailwind 3.4+ ships these natively — no plugin.
2. **Radix direction context.** Every Radix primitive this library builds on
   (`Select`, `DropdownMenu`, `Popover`, `Tooltip`, `ContextMenu`, `Menubar`,
   `NavigationMenu`, `HoverCard`, …) reads direction from Radix's own
   `DirectionContext`, **not** from the ambient `dir` attribute. With no
   provider in the tree it defaults hard to `"ltr"` and stamps that onto its
   own portaled content — so a Select's checkmark, a DropdownMenu's items, a
   Popover's offset math, etc. stay LTR even under `<html dir="rtl">` unless
   the app is wrapped in `KinetixDirectionProvider` (exported from
   `@kinetixui/ui`, a thin wrapper over `@radix-ui/react-direction`).

A consuming app needs both:

```tsx
<html dir={dir}>
  <body>
    <KinetixDirectionProvider dir={dir}>{children}</KinetixDirectionProvider>
  </body>
</html>
```

This was discovered the hard way during this slice: converting classes alone
made everything *look* mirrored except every Radix-portaled component (Select,
DropdownMenu, …), which silently rendered LTR-positioned content inside an
RTL page. If you're converting a component that wraps a Radix primitive and
it doesn't visually mirror, check this first.

## Converted (slice 1)

Logical-property classes, verified against the Radix direction provider:

- `input-group.tsx`
- `select.tsx`
- `native-select.tsx`
- `dialog.tsx` (the `left-1/2` / `-translate-x-1/2` centering trick is
  intentionally left physical — it's direction-agnostic by construction,
  marked `// rtl-ok`)
- `sheet.tsx` (the `side` prop's `left`/`right` variants are intentionally
  physical — `side="left"` means an actual physical screen edge the caller
  chose, not a text-direction-relative concept, marked `// rtl-ok-start` /
  `// rtl-ok-end`)
- `drawer.tsx`
- `dropdown-menu.tsx` (including mirroring the submenu chevron via
  `rtl:-scale-x-100`)
- `alert.tsx`
- `app-bar.tsx`

## Converted (slice 2) — the overlay family

Slice 1 converted the overlays built on Radix's own direction context (Dialog,
Sheet, Drawer, DropdownMenu, Select) and stopped there. These are the rest of
that family, so an app that mirrors one overlay no longer finds the next one
unmirrored:

- `context-menu.tsx` — inset items (`ps-8`), the check/radio gutter
  (`start-2`), the shortcut (`ms-auto`), and the submenu chevron now mirrors
  via `rtl:-scale-x-100`
- `menubar.tsx` — the same menu anatomy, same conversions
- `alert-dialog.tsx` — header alignment (`sm:text-start`); the `left-1/2`
  centring trick stays physical, marked `// rtl-ok`
- `modal.tsx` — likewise, centring trick marked `// rtl-ok`
- `navigation-menu.tsx` — chevron gap (`ms-1`) and both panel anchors
  (`start-0`)
- `popover.tsx`, `tooltip.tsx` — **no class change.** Their entry animation
  keys off `data-side`, which Radix has already resolved to a *physical* side
  after flipping for direction and collisions. Converting those to logical
  classes would invert the animation under RTL and throw the surface the wrong
  way, so they are marked `// rtl-ok` with that reason

Behavioural evidence: `packages/ui/src/components-rtl.test.tsx`
(`kx-verify: rtl`). `check-rtl.mjs` proves no physical class is *left*; it
cannot prove the replacement is the *right* one or that the Radix primitive
flips — which is the failure that cost slice 1 a full pass to find. These
tests assert the rendered class and the direction-dependent key handling.
React RTL evidence went from 3 components to 9.

Docs site (`apps/web`): English-only, always `dir="ltr"` — it does not carry
a live RTL toggle (an earlier dev/QA `DirProvider` + header toggle was
removed; flipping the whole site's layout without translated content just
looked broken, and it wasn't a real i18n solution anyway — no locale
detection, no persistence across domains). RTL support is documented for
consumers instead, at `/docs/rtl` — the two-piece pattern above (logical
classes + `KinetixDirectionProvider`) is what an app wires up itself.

## Not yet converted

Every other file in `packages/ui/src/components` that still contains a
physical-direction utility — tracked explicitly as `NOT_YET_CONVERTED` in
`scripts/check-rtl.mjs`, which is the authoritative, current list (grep it
rather than trusting a stale copy here). As of slice 2, 22 files: `audio-player.tsx`,
`button-group.tsx`, `calendar.tsx`, `carousel.tsx`, `code-block.tsx`,
`command.tsx`, `comparison-slider.tsx`, `data-grid.tsx`, `diff-viewer.tsx`,
`input-otp.tsx`, `json-viewer.tsx`, `markdown-editor.tsx`,
`multi-select.tsx`, `notification-center.tsx`, `resizable.tsx`,
`scroll-area.tsx`, `sidebar.tsx`, `tab-bar.tsx`, `table.tsx`, `tag.tsx`,
`timeline.tsx`, `tree-view.tsx`.

Also out of scope for this slice: native platform ports (`ui-compose`,
`ui-swiftui`, `ui-flutter`) — each has its own RTL/right-to-left mechanism
(Compose's `LocalLayoutDirection`, SwiftUI's `layoutDirection` environment
value, Flutter's `Directionality`) and needs separate work.

## Guardrail

`pnpm check:rtl` (`scripts/check-rtl.mjs`, wired into CI) fails the build if a
file *not* in `NOT_YET_CONVERTED` gains a physical-direction utility class —
locking in every conversion already done and blocking regressions in new
components. Shrink `NOT_YET_CONVERTED` as later slices convert more files; an
empty array means the whole library is converted.

A line that's deliberately physical (not a conversion gap) is exempted with
an inline `// rtl-ok` marker — either on the same or immediately preceding
line for a single match, or a `// rtl-ok-start` / `// rtl-ok-end` pair around
a block. See `dialog.tsx` and `sheet.tsx` for both patterns.
