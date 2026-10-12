# Guide publication runbook

**Operator checklist.** The one procedure for taking the four-guide cluster from draft to published, checking it
on the day it goes live, and keeping it true afterwards. Ownership and intents are in
[`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md#content-cluster); what to measure is in
[`MEASUREMENT.md`](./MEASUREMENT.md). Nothing in this file publishes anything by itself.

The cluster:

| Route | Role | CTA |
| --- | --- | --- |
| `/guides/cross-platform-design-systems` | pillar | `/docs/platforms` |
| `/guides/generated-tokens-vs-generated-components` | supporting | `/docs/tokens` |
| `/guides/verify-design-system-parity` | supporting | `/docs/platforms#availability-package-maturity-and-verification-are-three-different-things` |
| `/guides/evaluate-cross-platform-component-library` | supporting | `/components` |

---

## 1. How publication works

Publication is two fields per guide in **`apps/web/src/lib/guides-data.ts`**, and nothing else:
`status: "published"` and `datePublished: "YYYY-MM-DD"`. Every other publication fact is derived from `status`
at build time, so it cannot be switched on its own:

| Condition | Where it comes from | Gate rule that fails if it is wrong |
| --- | --- | --- |
| 1. All four switch together | the registry | `check:editorial` **cluster-partial** (also draft-linked) |
| 2. Each carries a real `datePublished`, the same one | the registry | **guide-date**, **cluster-date**; `guides.test.ts`; the build throws on a published guide without a date |
| 3. Sitemap entries appear together | `app/sitemap.ts` lists `publishedGuides()` | **sitemap-state** (published but absent), **draft-indexed** (draft but present) |
| 4. Article JSON-LD appears together | `guideJsonLd()` returns `null` for a draft | **guide-date** (published without TechArticle), **draft-indexed** (draft with one); `check:seo-browser` on the rendered page |
| 5. FurtherReading appears only after publication | `<FurtherReading>` renders published guides only | **further-reading** (shows a draft, or drops a published guide, or a published guide no docs page names) |
| 6. No published guide links a draft | `GuideFooter` lists published guides only; the prose is checked | **draft-linked** |
| 7. Internal links are valid | the built pages | `check:seo` link rules |
| 8. Canonical stays self | `pageMetadata` | **guide-canonical**; `check:seo-browser` |
| 9. `noindex` goes last | `guideMetadata()` drops `robots: noindex` only for a published guide | **draft-indexed** (published but noindex, draft but indexable) |

**Why condition 9 needs no manual step.** `noindex` is not a separate switch: it disappears in the same build
that adds the sitemap entries, the JSON-LD and the FurtherReading links. What makes it safe is that the gates run
on that build, before it merges, and fail if any of conditions 1–8 does not hold. **Never edit a guide's robots
meta, the sitemap or the JSON-LD by hand**; change the registry and let the build derive the rest.

Also held by the gates in both states: the CTA points where the registry says (**guide-cta**), the pillar keeps its
proof links to `/docs/platforms`, `/docs/tokens` and a platform page (**pillar-proof**), each guide's intent matches
the map (**guide-intent**, **intent-duplicate**), and no guide or guide snippet types a component count
(**count-hardcoded**).

## 2. Check the current state

```bash
node -e 'import("./apps/web/src/lib/guides-data.ts").then(m => console.table(m.GUIDES.map(({slug,status,datePublished}) => ({slug,status,datePublished}))))'
```

All four `draft`: follow §3. All four `published`: the cluster is live; skip to §5 for the Day 0 checks if they
have not been done, otherwise §7 for freshness. Anything mixed is a defect: `check:editorial` fails on it.

## 3. Before publishing

- [ ] **Owner review of the copy is done.** Publication is the owner's decision; nothing here infers it.
- [ ] **Counts are live.** Every count in a guide renders from the manifest (`<ComponentTotalInline />`,
      `<PlatformCountInline />`); `check:editorial` count-hardcoded fails on a typed one. Re-read any sentence that
      describes a platform's state (Angular maturity, what is on a registry) against `platform-parity.json`.
- [ ] **Dry run passes** on a fresh `main` checkout, with the drafts unchanged:

  ```bash
  pnpm turbo run build --filter=@kinetixui/web...
  PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome node scripts/simulate-guide-publication.mjs --browser --a11y --controls
  ```

  It publishes all four in the registry with a placeholder date (`2099-01-01`), rebuilds, runs `check:seo`,
  `check:editorial`, `guides.test.ts`, `check:seo-browser`, the a11y-site sweep on the guides and the four docs
  pages that link them, and the published-state negative controls; then restores the registry, verifies its
  SHA-256 and rebuilds. Expected movement (2026-10-12, main 655b11d):

  | Measure | Drafts | Published |
  | --- | --- | --- |
  | Built pages | 133 | 133 |
  | Indexable pages | 128 | 132 |
  | Sitemap URLs | 128 | 132 |
  | Guides in the sitemap | 0 | 4 |
  | Guides with TechArticle JSON-LD | 0 | 4 |
  | Guides with `noindex` | 4 | 0 |
  | FurtherReading guide links on docs pages | 0 | 5 |

  The non-guide numbers move with the site; the guide rows must be 0 → 4 and 4 → 0, and indexable and sitemap
  must each rise by exactly four.

## 4. Publish

1. Branch from current `main`.
2. In `apps/web/src/lib/guides-data.ts`, on **all four** entries, set `status: "published"` and add
   `datePublished: "<the day the change deploys, UTC>"`. Use the same date on all four. Do not add `dateModified`.
   The date is never taken from the build or from git, and never back-dated.
3. Build and run, in this order:

   ```bash
   pnpm turbo run build --filter=@kinetixui/web...
   pnpm check:seo && pnpm check:editorial
   pnpm --filter @kinetixui/web exec vitest run src/lib/guides.test.ts
   (cd apps/web && npx next start -p 3000 &) ; pnpm check:seo-browser
   node scripts/a11y-site.mjs --base http://localhost:3000 \
     --page /guides/cross-platform-design-systems --page /guides/generated-tokens-vs-generated-components \
     --page /guides/verify-design-system-parity --page /guides/evaluate-cross-platform-component-library \
     --page /docs/platforms --page /docs/tokens --page /docs/accessibility --page /docs/installation
   node scripts/editorial-negative-controls.mjs      # now runs the published-state controls
   ```

   `check:seo` must report four more indexable pages and four more sitemap URLs than `main`.
4. Open the PR. CI runs the same gates. The owner merges; Vercel deploys.
5. Record it the same day: `CONTENT-BACKLOG.md` Phase 2B rows → published with the date; the baseline capture in
   [`MEASUREMENT.md`](./MEASUREMENT.md) §6.

**If something is wrong after it is live:** fix forward in a normal PR. Unpublishing is the same edit in
reverse on all four (status back to `draft`, `datePublished` removed); the next deploy makes them `noindex` and
drops them from the sitemap, and Search Console drops them on recrawl. Do not use the Search Console removal tool
for this: it hides URLs temporarily and is meant for emergencies.

## 5. Day 0: checks on the live site

Open every live page in a private window with `?kx_traffic=diagnostic` on the first URL, so the visit is excluded
from analytics ([`../analytics.md`](../analytics.md) §11 *Diagnostic traffic*).

- [ ] `https://kinetixui.com/sitemap.xml` lists all four `/guides/…` URLs.
- [ ] Each guide's page source has no `robots` noindex, a self canonical, and one `TechArticle` with the real
      `datePublished`.
- [ ] Each guide's structured data parses with no errors in the Schema Markup Validator (validator.schema.org).
      Google's Rich Results Test may or may not list TechArticle as an eligible rich result; eligibility is not
      the goal, valid data is. Record the result as text.
- [ ] `/docs/platforms`, `/docs/tokens`, `/docs/accessibility` and `/docs/installation` show their "Further
      reading" line, and each link opens the guide.
- [ ] Search Console: URL Inspection on the four guides, then "Request indexing" on each
      ([`MEASUREMENT.md`](./MEASUREMENT.md) §7); Bing: URL Submission for the four (§8).
- [ ] Capture the Day 0 baseline ([`MEASUREMENT.md`](./MEASUREMENT.md) §6).
- [ ] ART-001 post-publication edit, if ART-001 is live (§6 below).

## 6. ART-001 → pillar: the post-publication edit

ART-001 (*"Your cross-platform design system may be lying about parity"*) is the awareness piece on dev.to and
stays canonical there. Its package is **not changed before it publishes**. Once the article is live **and** the
pillar is published, make one edit on dev.to and record it in the ART-001 close-out:

- **Where:** the italic footer, after the sentence ending "…not maintained by hand."
- **Add:** *For the architecture behind it (shared tokens, native components, and what parity takes to verify),
  read [Cross-platform design systems: architecture, parity and trade-offs](https://kinetixui.com/guides/cross-platform-design-systems?utm_source=devto&utm_medium=referral&utm_campaign=kx_p1_a_parity_proof&utm_content=art_pillar).*
- **Anchor text:** the pillar's own title, so the link describes its destination.
- **Campaign:** the article's existing campaign (`kx_p1_a_parity_proof`), with `utm_content=art_pillar` to tell
  it apart from the primary CTA (`art_primary` → `/docs/platforms`). One campaign per idea
  ([`../analytics.md`](../analytics.md) §8). The link is checked against the attribution parser in
  `apps/web/src/lib/campaign-links.test.ts`.
- **Register:** `marketing/content/register.json` row `ART-001-PILLAR` (status `brief` until the edit is made).
- **Do not** change the article's primary CTA, its canonical, or its numbers in the same edit.

The rest of the path is already on the site: the pillar links `/docs/platforms` (and its CTA goes there),
`/docs/tokens`, and the Angular, SwiftUI, Compose and Flutter pages.

## 7. After publication: freshness

A guide is updated when what it says stops being true, never to look recent.

| Trigger | Check | Action |
| --- | --- | --- |
| A platform count changes (a port lands, Angular gains entries) | nothing to do for numbers: they render from the manifest | re-read sentences *about* the count ("a deliberate subset", "thin") |
| Package distribution changes (a native library reaches its registry) | `PLATFORM_DEFINITIONS[p].distribution` | edit sentences that say "source you build"; the platform pages' metadata update themselves |
| Maturity changes (Angular graduates from Preview) | `ANGULAR-GRADUATION.md`, the manifest | edit sentences that describe Preview |
| Verification evidence changes (a check is added or removed) | `verification.json`, `/docs/platforms` | edit the parity guide's examples |
| An internal link breaks or an anchor moves | `check:seo` link rules, `check:seo-browser` | fix the link in the same PR as the move |
| A claim in [`../CLAIMS.md`](../CLAIMS.md) changes | the claim register | edit every guide sentence that relied on it |

When an edit changes what a guide **says** (not a typo, not a link), set `dateModified` on that guide to the day
it deploys. Never change `datePublished`. Never touch a date when nothing a reader would notice has changed. A
guide whose question is no longer worth answering is unpublished (§4), not left to decay.

## 8. Re-check intent ownership after any publication or metadata edit

`pnpm check:editorial` runs **intent-duplicate** (one primary intent per route in the map) and **guide-intent**
(the registry agrees with the map), and **near-duplicate** compares every indexable non-component page's title and
description. The final ownership is in [`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md#final-ownership-seo-phase-3).
