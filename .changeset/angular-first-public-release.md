---
"@kinetixui/angular": minor
---

`@kinetixui/angular` becomes an installable package.

Thirty-one components, built AOT with strict template checking, shipped as the Angular Package
Format output ng-packagr generates: standalone directives and components with no NgModule, so a
template imports the ones it uses and nothing else. Styling comes from the same generated token
contract as every other KinetixUI platform — `@kinetixui/tokens` is a peer dependency, and
`@kinetixui/angular/styles.css` spends those custom properties rather than defining a second set.

Still **Preview**: the API may change, and the catalogue is a foundation subset rather than parity
with the React set. It also versions on its own from here — it is no longer part of the release
train that keeps `@kinetixui/{tokens,ui,cli}` on a single version, so an Angular change no longer
moves those three.
