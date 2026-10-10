# @kinetixui/angular

KinetixUI for Angular — standalone directives and components built on the same generated design token
contract as the other KinetixUI implementations.

> **Preview.** This package is published so it can be used and reported on, and publication is
> distribution, not maturity. It carries **64 of the 98 entries in the KinetixUI catalogue** and is
> rolling out in waves. Expect gaps, and expect APIs to move within `0.x`. If you need the full
> catalogue today, that is the React implementation (`@kinetixui/ui`).

```bash
npm install @kinetixui/angular @kinetixui/tokens
```

## What it currently provides

64 components, as **170 exported symbols** (a component plus its parts and variant types count
separately). Present today:

`accordion` · `alert` · `alert-dialog` · `app-bar` · `aspect-ratio` · `avatar` · `avatar-group` · `badge` ·
`banner` · `breadcrumb` · `button` · `button-group` · `card` · `checkbox` · `circular-progress` ·
`code-block` · `collapsible` · `description-list` · `dialog` · `drawer` · `empty` · `fab` · `field` ·
`footer` · `hover-card` · `image` · `inform` · `input` · `input-group` · `input-otp` · `kbd` · `label` ·
`list` · `marquee` · `metric` · `modal` · `native-select` · `navigation-bar` · `number-input` ·
`page-header` · `pagination` · `password-input` · `popover` · `progress` · `quote` · `radio-group` ·
`rating` · `segmented-control` · `separator` · `sheet` · `skeleton` · `slider` · `spinner` · `stepper` ·
`switch` · `tab-bar` · `table-of-contents` · `tabs` · `tag` · `textarea` · `timeline` · `toggle` ·
`toggle-group` · `tooltip`

Not present: menus and listboxes (dropdown menu, context menu, select, combobox, command), notifications
(toast, notification center, tour), data display (table, data grid, data table), menu-driven navigation
(menubar, navigation menu, sidebar), and the rest of the catalogue. The authoritative, always-current list — and the reason each absent component is absent — is
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
- **`@kinetixui/tokens`** is a peer at `>=0.24.0 <0.25.0`; install it alongside this package. 0.25.0 reads
  `--surface-grouped` and `--on-info-container`, which tokens 0.23.x does not define
- Standalone APIs only — no NgModules are exported
- Built with ng-packagr; ships `fesm2022` plus types, and is compiled and strict-template-typechecked in
  CI on every change

## Accessibility

What is verified is published rather than asserted. For this package: **64 of 64 implementations have
interaction and accessibility verification** — from unit suites in jsdom, and from `check:angular-browser`,
which runs the package as a live Angular application in Chromium: every usage example and state fixture
under axe in light and dark, forced colours and reduced motion, and every interactive component driven by a
real keyboard; and from `check:angular-overlays`, which opens every overlay, alone, nested and composed, and
measures stacking, dismissal, scroll locking, focus restoration and placement. 31 components have RTL verification (measured in an LTR page, an RTL page, and each nested in
the other); 37 have large-text verification at 200% text, at desktop and phone width; the switch, accordion,
collapsible, app bar and all eight overlays have reduced-motion verification (motion runs at normal settings, and is
suppressed with the same end state under reduced motion). Visual states are measured on rendered pixels by `check:selection-visual`
(checkbox, radio group, switch, segmented control), `check:entry-visual` (input, textarea, native select,
tabs), `check:composite-visual` (input group, number input, one-time code, password input),
`check:navigation-visual` (breadcrumb, pagination, table of contents, tab bar, app bar, footer, accordion),
`check:overlay-visual` (dialog, alert dialog, modal, sheet, drawer, popover, tooltip, hover card) and
`check:card-visual` (the card at rest, and as a link or button). This is evidence for the behaviours
listed, not an accessibility certification. There is no snapshot visual-regression suite, here or anywhere
in KinetixUI.

The per-component, per-kind evidence table is at
[kinetixui.com/docs/platforms](https://kinetixui.com/docs/platforms).

## Limitations

- **Preview, and 64 of 98 entries.** Do not plan around a component that is not in the list above.
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
