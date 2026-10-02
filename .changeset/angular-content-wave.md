---
"@kinetixui/angular": minor
---

Add the content wave: twelve components, taking the Angular catalogue from 31 to 43 of 98.

`KxBanner`, `KxButtonGroup` (with `KxButtonGroupSeparator` and `KxButtonGroupText`),
`KxCircularProgress`, `KxCodeBlock`, `KxDescriptionList` / `KxDescriptionListItem`, `KxFab`, `KxImage`,
`KxInform`, `KxList` / `KxListItem`, `KxMarquee` (with `KxMarqueeContent`), `KxPageHeader`, and
`KxTimeline` / `KxTimelineItem` — eighteen exported symbols in all.

Angular remains **Preview**. 53 components are still planned, and this release does not change that: the
maturity of a platform is not a function of how many components it has.

**These are Angular components, not translated React ones.** Each is a standalone directive or component
with `OnPush` change detection and signal inputs, and each is a directive on the element HTML already has
for the job wherever one exists — `[kxButtonGroup]` on a `<div>`, `[kxFab]` on a `<button>`, `[kxList]` on
a `<ul>`, `[kxTimeline]` on an `<ol>`, `[kxDescriptionList]` on a `<dl>`. That keeps the platform's own
semantics instead of restating them in ARIA, and it is why a pressable list row is a real `<button>` inside
a real `<li>` rather than a `<div role="button">`: the keyboard contract comes with the element.

Two places where the Angular idiom differs from React's on purpose. Icons arrive by content projection
rather than from an icon package, so using a banner does not pull a dependency into your bundle. Actions
arrive as content plus an `output()` rather than as an `action={{ label, onClick }}` object, because in
Angular a label is content and a click is an event:

```html
<kx-inform variant="error" dismissible (dismiss)="hide()">
  We could not reach the server.
  <button kxInformAction type="button" (click)="retry()">Try again</button>
</kx-inform>
```

Accessibility is implemented, not assumed. `KxCircularProgress` omits `aria-valuenow` entirely when it has
no value, because an indeterminate bar reporting 0 claims something different from "we do not know yet".
`KxCodeBlock`'s file switcher is a real tablist whose arrow keys resolve against the document direction, so
ArrowLeft advances in an RTL page, and its copy button reports the result through a live region rather than
only swapping an icon. `KxPageHeader` takes a heading `level` rather than hard-coding `<h1>`, so the
document outline survives being used twice. `KxMarquee` renders its content twice for a seamless loop,
hides the duplicate from assistive technology, and stops animating under `prefers-reduced-motion: reduce`
while staying scrollable. Dismissible surfaces emit an event rather than hiding themselves — the caller owns
that state — and their dismiss button takes its accessible name as an input, because this package ships no
translations and a button labelled in the wrong language is worse than one you named yourself.

Every value in the new styles resolves to a generated token, and every box uses logical properties, so all
twelve mirror under `dir="rtl"` without a second rule.

The package still reaches no browser global: `KxCodeBlock` gets the clipboard through its own host
element's document, so the bundle stays usable where there is no `navigator`.
