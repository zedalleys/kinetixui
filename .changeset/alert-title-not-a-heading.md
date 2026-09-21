---
"@kinetixui/ui": patch
---

`AlertTitle` now renders a `div` instead of a hardcoded `<h5>`. A component can't know where it sits in the page's outline, so the fixed level skipped heading levels under any `<h2>` (WCAG 1.3.1 / axe `heading-order`). The alert's `role="alert"` still carries the semantics; pass `role="heading"` and `aria-level={n}` to `AlertTitle` if you want a specific heading level. Its ref type is now `HTMLDivElement` (it was `HTMLParagraphElement`).
