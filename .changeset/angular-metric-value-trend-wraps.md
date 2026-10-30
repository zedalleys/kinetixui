---
"@kinetixui/angular": patch
---

`.kx-metric`'s value and trend now wrap instead of colliding.

The Angular stylesheet stated the same layout contract as React's `Metric` and carried the same
defect: `.kx-metric__body` was a `space-between` flex row of two intrinsically-sized children, so
once the value and the trend together exceeded the card's content box the pair was painted outside
it, with no way for either child to give ground.

`.kx-metric__body` now wraps, with `column-gap: var(--spacing-3)` and `row-gap: var(--spacing-1)`;
`.kx-metric__value` takes `min-width: 0` and `overflow-wrap: break-word`; `.kx-metric__trend` keeps
`white-space: nowrap` on the figure while allowing the arrow and figure to wrap relative to each
other as the last resort. This is the shared contract — semantics, state model, accessibility
outcome — expressed in idiomatic CSS rather than a copy of the React class list, and it uses the
existing spacing tokens rather than new values.

No selector, no public class name and no component API changed; the Angular package remains Preview
and this release does not move its graduation criteria.

The browser measurement that drove the contract was taken on the React implementation, which is
where the defect was reported and reproduced. The Angular change was verified by the package's own
stylesheet gates and its negative controls, not by a rendered Angular measurement, so it is stated
as a corrected layout contract rather than as rendered Angular evidence.
