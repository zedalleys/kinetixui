# @kinetixui/angular

KinetixUI for Angular — standalone directives and components built on the same generated design token
contract as the other KinetixUI implementations.

> **Preview.** This package is published so it can be used and reported on, and publication is
> distribution, not maturity. It carries **80 of the 102 entries in the KinetixUI catalogue** and is
> rolling out in waves. Expect gaps, and expect APIs to move within `0.x`. If you need the full
> catalogue today, that is the React implementation (`@kinetixui/ui`).

```bash
npm install @kinetixui/angular @kinetixui/tokens
```

## What it currently provides

80 catalogue entries, as **260 exported symbols**: 79 components and one recipe, the combobox — a popover
holding a command, which adds no symbol of its own (a component plus its parts and variant types count
separately). Present today:

`accordion` · `alert` · `alert-dialog` · `app-bar` · `aspect-ratio` · `avatar` · `avatar-group` · `badge` ·
`banner` · `breadcrumb` · `button` · `button-group` · `card` · `carousel` · `checkbox` · `circular-progress` ·
`code-block` · `collapsible` · `combobox` (recipe) · `command` · `comparison-slider` · `context-menu` ·
`description-list` · `dialog` ·
`drawer` · `dropdown-menu` ·
`empty` · `fab` · `field` · `footer` · `hover-card` · `image` · `inform` · `input` · `input-group` ·
`input-otp` · `kbd` · `label` · `list` · `marquee` · `menubar` · `metric` · `modal` · `multi-select` ·
`native-select` ·
`navigation-bar` · `navigation-menu` · `notification-center` · `number-input` ·
`page-header` · `pagination` · `password-input` · `popover` · `progress` · `quote` · `radio-group` ·
`rating` · `resizable` · `scroll-area` · `segmented-control` · `select` · `separator` · `sheet` · `sidebar` ·
`skeleton` · `slider` ·
`sonner` (`kx-toaster` and `KxToasterService`) · `spinner` · `stepper` ·
`switch` · `tab-bar` · `table-of-contents` · `tabs` · `tag` · `textarea` · `timeline` · `toggle` ·
`toggle-group` · `tooltip` · `tour`

Not present: data display (table, data grid, data table, virtual list, tree view, chart and the viewers),
the date and colour pickers, file upload, the media and editor components, and the rest of the catalogue. The authoritative, always-current list — and the reason each absent component is absent — is
at [kinetixui.com/docs/platforms](https://kinetixui.com/docs/platforms), generated from the same manifest
this package is built against.

## Minimal usage

Load the stylesheets once, then import the standalone symbols you need. All four token sheets are
needed: `css/extras` defines the focus ring the components draw in place of the browser outline, and
the two `/dark` sheets are what the `.dark` class switches to.

```css
/* your global stylesheet */
@import "@kinetixui/tokens/css";
@import "@kinetixui/tokens/css/dark";
@import "@kinetixui/tokens/css/extras";
@import "@kinetixui/tokens/css/extras/dark";
@import "@kinetixui/angular/styles.css";
```

```ts
import { Component } from '@angular/core';
import { KxButton, KxCard, KxCardContent } from '@kinetixui/angular';

@Component({
  selector: 'app-example',
  imports: [KxButton, KxCard, KxCardContent],
  template: `
    <kx-card>
      <kx-card-content>
        <button kxButton variant="Primary">Save</button>
        <button kxButton variant="Outline" size="lg">Cancel</button>
      </kx-card-content>
    </kx-card>
  `,
})
export class ExampleComponent {}
```

## Design choice worth knowing: directives on real elements

The package uses two shapes, and which one you get follows the semantics rather than a house style.

**Where a native element already carries the semantics, it is a directive on that element.**
`<button kxButton>` is a real `<button>`, so it keeps its own role, `type`, `disabled`, form submission,
focus order and the browser's activation behaviour — none of which has to be re-created with ARIA. There
is no `<kx-button>`.

**Where there is no native equivalent, it is a component.** A card is a composed surface with no HTML
element behind it, so it is `<kx-card>` / `<kx-card-content>`.

So you apply an attribute to semantic elements and nest a tag for composed ones. Check the import's name
in your editor if you are unsure: `KxButton` is a directive, `KxCard` is a component.

## Environment

- **Angular 21** — `@angular/core` and `@angular/forms` are peers at `^21.0.0`
- **`@kinetixui/tokens`** is a peer at `>=0.24.0 <0.26.0`; install it alongside this package. It reads
  `--surface-grouped` and `--on-info-container`, which tokens 0.23.x does not define
- Standalone APIs only — no NgModules are exported
- Built with ng-packagr; ships `fesm2022` plus types, and is compiled and strict-template-typechecked in
  CI on every change

## Accessibility

What is verified is published rather than asserted. For this package: **80 of 80 implementations have
interaction and accessibility verification** — from unit suites in jsdom, and from `check:angular-browser`,
which runs the package as a live Angular application in Chromium: every usage example and state fixture
under axe in light and dark, forced colours and reduced motion, and every interactive component driven by a
real keyboard; and from `check:angular-overlays`, which opens every overlay, alone, nested and composed, and
measures stacking, dismissal, scroll locking, focus restoration and placement; and from
`check:angular-collections`, which drives the three menus by keyboard and pointer — submenus, typeahead,
context menus at the pointer and from the keyboard, the menubar's moves between menus — and the listboxes
(select, command, multi-select, the combobox recipe): the active descendant after every key, filtering,
disabled options, chips, focus return, nested overlays and duplicate ids — and the navigation menu, which
is site navigation (links and disclosure buttons, never menu roles). `check:angular-overlays` also drives the
toaster on real timers (pause on hover and focus with the elapsed time kept, separate toasters, no focus
stolen), the notification center, the tour (a modal dialog with missing, removed and scrolled-to targets) and
the sidebar (a persistent panel on desktop, the family's sheet on a phone, across the breakpoint). And from
`check:angular-layout`, which drives the scroll area, resizable panels, carousel and comparison slider by
keyboard, mouse, pen and touch — releases outside, a group resized or a handle disabled mid-drag, lost capture,
touch cancel, content and containers that resize — with the page instrumented so a pointer listener exists
only while a drag runs and no ResizeObserver outlives its component.
47 components have RTL verification (measured in an LTR page, an RTL page, and each nested in the other); 53 have large-text verification at 200% text, at desktop and phone width; the switch, accordion,
collapsible, app bar, all eight overlays, the three menus, select, multi-select, the navigation menu, the
toaster, the notification center, the tour, the sidebar and the carousel have reduced-motion verification (motion runs at normal settings, and is
suppressed with the same end state under reduced motion). Visual states are measured on rendered pixels by `check:selection-visual`
(checkbox, radio group, switch, segmented control), `check:entry-visual` (input, textarea, select, native
select, tabs), `check:composite-visual` (input group, number input, multi-select, one-time code, password
input),
`check:navigation-visual` (breadcrumb, pagination, table of contents, tab bar, app bar, footer, accordion,
navigation menu, sidebar),
`check:overlay-visual` (dialog, alert dialog, modal, sheet, drawer, popover, tooltip, hover card, toast,
notification center, tour),
`check:menu-visual` (dropdown menu, context menu, menubar, and the select's and multi-select's options),
`check:layout-visual` (scroll area, resizable, carousel, comparison slider) and
`check:card-visual` (the card at rest, and as a link or button). This is evidence for the behaviours
listed, not an accessibility certification. There is no snapshot visual-regression suite, here or anywhere
in KinetixUI.

The per-component, per-kind evidence table is at
[kinetixui.com/docs/platforms](https://kinetixui.com/docs/platforms).

## Limitations

- **Preview, and 80 of 102 entries.** Do not plan around a component that is not in the list above.
- Versioned independently of `@kinetixui/{ui,tokens,cli}` — its version number does not track theirs.
- The token peer range is a deliberate compatibility claim, widened only after the package is verified
  against a new token version. It will not silently follow the token package.
- Pre-1.0: APIs can move in a minor.

## Links

- Angular documentation — <https://kinetixui.com/docs/angular>
- Platform coverage and evidence — <https://kinetixui.com/docs/platforms>
- Components — <https://kinetixui.com/components>
- Source — <https://github.com/zedalleys/kinetixui>

## License

MIT
