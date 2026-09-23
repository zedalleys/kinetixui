# SEO

## Principle

No thin keyword pages. Every page must answer the question better than a blog
post would, with code and verified coverage. A page that exists only to rank is
a page that damages the position — the whole pitch is "we prove things".

## Topic clusters

### A — Cross-platform design systems (highest intent, least served)
`cross platform design system` · `design system for web and mobile` ·
`react swiftui compose flutter design system` · `multi platform component library` ·
`design system platform parity`

**Why we can win it:** almost nothing in this space verifies its claims. Our
angle — *how to check whether a cross-platform library is really cross-platform* —
is genuinely new, and we can demonstrate it on ourselves.

### B — Design tokens (large, competitive, but we have depth)
`dtcg design tokens` · `design tokens flutter` · `design tokens swiftui` ·
`design tokens jetpack compose` · `style dictionary design tokens` ·
`semantic vs primitive tokens` · `design token pipeline`

**Angle:** the native half. Web token content is saturated; "design tokens in
Flutter/SwiftUI/Compose" is comparatively thin, and we have real generated output
plus theme adapters to show.

### C — Framework-specific
`react design system` (saturated — deprioritise) · `angular design system`
(thin, but we are preview — handle honestly) · `flutter design system` ·
`swiftui design system` · `jetpack compose design system`

### D — RTL (small volume, very high intent, almost unserved)
`rtl design system` · `arabic design system` · `flutter rtl components` ·
`swiftui rtl` · `compose rtl` · `rtl design tokens`

**Strong fit.** We enforce logical properties in CI and test direction-aware
behaviour per platform. Few libraries can say that.

### E — Accessibility
`accessible design system` · `cross platform accessibility components` ·
`wcag design tokens` · `contrast checking ci`

## Landing-page architecture

Reusable structure for any `/design-system/<platform>` or `/design-tokens/<platform>` page:

1. **H1** matching search intent exactly
2. **The problem** in two sentences, concrete
3. **How KinetixUI approaches it** — architecture, not adjectives
4. **Proof** — coverage read from generated data, CI workflow named
5. **Code example** — from a compiled source file, never hand-typed
6. **Platform coverage** — derived, with maturity
7. **Related components** — linked from the manifest
8. **Architecture diagram**
9. **FAQ** — the real objections
10. **CTA** — install command (only if the package is published)

## Initial page opportunities, ranked

Build **one at a time**, each fully. Do not ship a set of shells.

| Priority | Page | Why | Blocked on |
| --- | --- | --- | --- |
| 1 | `/design-tokens/flutter` | Real depth (adapters, token-only adoption), thin competition, a real user request behind it | nothing |
| 2 | `/rtl-design-system` | Almost unserved, we have genuine CI evidence | nothing |
| 3 | `/design-system/flutter` | High intent, we have 90/98 coverage | nothing |
| 4 | `/design-tokens/swiftui` | Thin competition | nothing |
| 5 | `/design-tokens/compose` | Thin competition | nothing |
| 6 | `/design-system/angular` | Honest only as "preview"; `/docs/angular` already covers it | Angular catalogue depth |

**Not yet:** `/design-system/react`. Saturated, and it is our least
differentiated story. Revisit once the cross-platform position is established.

## Existing SEO surface (audited)

Present and working: `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`,
`structured-data.tsx`, per-page metadata, `seo.test.ts` asserting the sitemap
covers core pages and every component page.

**Gap:** no article/blog infrastructure exists. Long-form currently has to live
on DEV or Hashnode. That is acceptable for the first 30 days — publishing
off-site first also validates which topics land before we build a `/blog`.

**Recommendation:** do not build `/blog` until at least three articles have
been published off-site and one has measurable traffic.
