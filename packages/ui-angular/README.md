# @kinetixui/angular

KinetixUI for Angular — standalone directives and components built on the same generated design token
contract as the other KinetixUI implementations.

> **Preview.** This package is published so it can be used and reported on, and publication is
> distribution, not maturity. It carries **31 of the 98 entries in the KinetixUI catalogue** and is
> rolling out in waves. Expect gaps, and expect APIs to move within `0.x`. If you need the full
> catalogue today, that is the React implementation (`@kinetixui/ui`).

```bash
npm install @kinetixui/angular @kinetixui/tokens
```

## What it currently provides

31 components, as **69 exported symbols** (a component plus its parts and variant types count
separately). Present today:

`alert` · `aspect-ratio` · `avatar` · `avatar-group` · `badge` · `button` · `card` · `checkbox` ·
`empty` · `field` · `input` · `kbd` · `label` · `metric` · `native-select` · `number-input` ·
`password-input` · `progress` · `quote` · `radio-group` · `segmented-control` · `separator` ·
`skeleton` · `slider` · `spinner` · `switch` · `tabs` · `tag` · `textarea` · `toggle` · `toggle-group`

Not present: overlays (dialog, popover, dropdown, tooltip, sheet, drawer), data display (table, data
grid, data table), navigation (breadcrumb, pagination, menubar, navigation menu), and the rest of the
catalogue. The authoritative, always-current list — and the reason each absent component is absent — is
at [kinetixui.com/docs/platforms](https://kinetixui.com/docs/platforms), generated from the same manifest
this package is built against.

## Minimal usage

Load the stylesheet once, then import the standalone symbols you need.

```css
/* your global stylesheet */
@import "@kinetixui/tokens/css";
@import "@kinetixui/tokens/css/dark";
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
- **`@kinetixui/tokens`** is a peer at `^0.23.0`; install it alongside this package
- Standalone APIs only — no NgModules are exported
- Built with ng-packagr; ships `fesm2022` plus types, and is compiled and strict-template-typechecked in
  CI on every change

## Accessibility

What is verified is published rather than asserted. For this package: **31 of 31 implementations have
interaction and accessibility verification**, which is the highest per-component evidence ratio of any
KinetixUI platform — a consequence of the catalogue being small, not of it being better. One component
has RTL verification. There is no visual-regression suite, here or anywhere in KinetixUI.

The per-component, per-kind evidence table is at
[kinetixui.com/docs/platforms](https://kinetixui.com/docs/platforms).

## Limitations

- **Preview, and 31 of 98 entries.** Do not plan around a component that is not in the list above.
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
