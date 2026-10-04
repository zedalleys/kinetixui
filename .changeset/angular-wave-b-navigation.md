---
"@kinetixui/angular": minor
---

Wave B: navigation and disclosure. The Angular catalogue goes from 46 to 56 of 98.

**New components** (37 exported symbols, standalone, on real elements wherever one carries the semantics):

- `kx-accordion` with `kx-accordion-item`, `kx-accordion-trigger` and `kx-accordion-content`: each trigger is
  a real button inside a heading (`headingLevel`, default 3) with `aria-expanded` and `aria-controls`;
  `type="single"` or `"multiple"`, `collapsible`, two-way `[(value)]`; ArrowUp/ArrowDown/Home/End move between
  triggers and never open anything. A single accordion's open item that cannot close reports `aria-disabled`.
- `kx-collapsible` with `button[kxCollapsibleTrigger]` (on your own button) and `kx-collapsible-content`.
- `nav[kxBreadcrumb]` and its list, item, link, page (`aria-current="page"`) and separator parts.
- `nav[kxPagination]` with `kxPaginationLink` (an anchor or a button; `current`), Previous, Next and an
  ellipsis. A disabled anchor says so, leaves the tab order and is not followed.
- `nav[kxTableOfContents]`: entries as links with `aria-current="location"` and two-way `[(active)]`.
- `nav[kxTabBar]` with `kxTabBarItem` (link or button, `active`, `badge`) and a projected `kxTabBarIcon`. The
  badge is read after the label ("Inbox (3)"). It is a navigation, not a tablist.
- `ol[kxStepper]`: an ordered list with `aria-current="step"` and visually hidden "completed" text;
  horizontal or vertical, reflowing to a list in a narrow container.
- `kxNavigationBar` (title, optional heading `level`, `infoText`, a Back button with a `(back)` output, or
  your own leading and action slots).
- `header[kxAppBar]` with brand, `nav[kxAppBarNav]`, `kxAppBarLink` (`active`) and actions. Below 48rem the
  same `<nav>` becomes a disclosure behind a Menu button; Escape and following a link close it and return
  focus.
- `footer[kxFooter]` with columns (each a group named by its title), links and a bottom row.

**Shared contracts.** Every destination has one state language (rest, hover, pressed, focus, current,
disabled), and "current" is always a shape as well as a colour — a bar, an outline, a pill or weight. Expand
and collapse animate the content's height over `--duration-fast` with `--easing-enter`/`--easing-exit`, and
under `prefers-reduced-motion: reduce` use `transition: none` and land on the same open or closed state.
Direction glyphs that mean reading order (breadcrumb separator, Previous/Next, Back) mirror with the
direction their own element resolves to; the accordion's chevron does not.

Angular remains **Preview**: 40 components are still planned. Nothing here claims React parity beyond the
behaviours the browser passes assert, and it is not an accessibility certification.
