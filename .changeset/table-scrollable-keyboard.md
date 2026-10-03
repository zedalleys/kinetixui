---
"@kinetixui/ui": patch
---

Make a table that scrolls reachable by keyboard.

`Table` renders its own scroll container — `<div class="relative w-full overflow-auto">` — around the
`<table>`. A container that scrolls and has no tab stop cannot be reached without a mouse, so a reader
using a keyboard could see the first few columns of a wide table and had no way to get to the rest.
That is WCAG 2.1.1, and axe reports it as `scrollable-region-focusable`.

It was invisible for as long as it was, because these tables only start scrolling once something makes
them wider than their column. The site's accessibility sweep gained a text-size axis in the previous
change, and at 200% text the finding appeared immediately on the two pages that render this component:
`/blocks` at 320px and `/create` at 1280px. The default-size sweep had never produced it.

**It was not fixable from the call site.** `Table` forwards `className` and `ref` to the `<table>`, not
to the wrapper, so no consumer could supply the attributes even knowing they were missing. The wrapper
is the component's own, so the fix is too.

**The contract is conditional, not blanket.** Adding `tabindex="0"` to every table wrapper would trade
one defect for another: a tab stop on a container that cannot scroll is a stop that does nothing, and
most tables in most layouts fit. The wrapper now measures itself — `scrollWidth > clientWidth`, with a
1px tolerance so sub-pixel rounding does not mint a useless stop — and takes a tab stop only while that
holds. A `ResizeObserver` watches the wrapper and the table, so a viewport change, a content change or
the reader raising their text size all re-decide it, in both directions. This reuses the approach
already proven in the docs site's own `useScrollable` rather than introducing a second way to answer the
same question.

**The accessible name comes from the table, or there is none.** When the table has a `<caption>`, the
wrapper is `role="group"` labelled by it, so the focus stop is announced as the thing it actually
contains. When there is no caption there is nothing truthful to call it, so it gets a tab stop and no
name — a generic "Scrollable table" on every table in a page of tables tells a screen-reader user
nothing they could act on. `role="group"` rather than `region`, because a landmark per table would
clutter the landmark list. `TableCaption` now carries a generated id (`React.useId`, so it is stable
across SSR and unique on a page with several tables) unless the caller supplies their own, which still
wins.

Measured in Chromium against the built site, on both pages, at 320px and 1440px, at 100% and 200% text,
in light and dark, and with the document in LTR and RTL: the container is reached by Tab exactly when it
scrolls, an arrow key scrolls it — negative `scrollLeft` where the element itself resolves to RTL — the
focus ring is visible in both themes, and Tab moves on rather than trapping. The 20 views where the
table fits its column correctly have no tab stop at all.

The `scrollable-region-focusable` exception the previous change recorded against these two pages is
removed, with no replacement: the rule is enforced everywhere again. The gate was run against the old
component with the exception already gone, and it reported the finding on exactly those two pages; the
same gate against the fixed component reports nothing.

Patch rather than minor: no API is added, removed or renamed, nothing new is available to adopt, and the
change corrects behaviour that was already wrong. The visible difference for a consumer is that a table
too wide for its space now takes a focus ring when tabbed to, and that `TableCaption` renders an `id`
when it was not given one.
