# Guide publication runbook

**Operator checklist** for the guides on kinetixui.com: how publication works, the checks on the day a guide goes
live, the ART-001 edit, keeping guides true, unpublishing, and adding a guide later. Ownership and intents are in
[`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md#content-cluster); what to measure is in
[`MEASUREMENT.md`](./MEASUREMENT.md). Nothing in this file publishes anything by itself.

**State: the four-guide cluster is published**, all four together on **2026-10-12** (PR #366, after the owner's
review of the copy). Go-live day for the Day 0 / 7 / 14 / 30 cadence is 2026-10-12.

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
| 1. The cluster switches together (the pillar and every guide its prose links) | the registry | `check:editorial` **cluster-partial** (also draft-linked) |
| 2. Each published guide carries a real `datePublished`; a draft carries none | the registry | **guide-date**; `guides.test.ts`; the build throws on a published guide without a date |
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

On 2026-10-12 all four read `published` with `datePublished` 2026-10-12. A mixed cluster is a defect:
`check:editorial` fails on it.

## 3. How the cluster was published, and the dry run

Recorded so the next publication repeats it:

1. **Owner review** of the copy. Publication is the owner's decision; nothing here infers it.
2. **Counts are live.** Every count in a guide renders from the manifest (`<ComponentTotalInline />`,
   `<PlatformCountInline />`); `check:editorial` count-hardcoded fails on a typed one. Sentences that describe a
   platform's state (Angular maturity, what is on a registry) are re-read against `platform-parity.json`.
3. **Dry run** while the guides are drafts: `node scripts/simulate-guide-publication.mjs --browser --a11y --controls`
   publishes them in the registry with a placeholder date (`2099-01-01`), rebuilds, runs `check:seo`,
   `check:editorial`, `guides.test.ts`, `check:seo-browser`, the a11y-site sweep on the guides and the four docs pages
   that link them, and the negative controls for the published state; then restores the registry, verifies its
   SHA-256 and rebuilds. Measured on main 655b11d before #366:

   | Measure | Drafts | Published |
   | --- | --- | --- |
   | Built pages | 133 | 133 |
   | Indexable pages | 128 | 132 |
   | Sitemap URLs | 128 | 132 |
   | Guides in the sitemap | 0 | 4 |
   | Guides with TechArticle JSON-LD | 0 | 4 |
   | Guides with `noindex` | 4 | 0 |
   | FurtherReading guide links on docs pages | 0 | 5 |

   The non-guide numbers move with the site; the guide rows must swap, and indexable and sitemap must differ by
   exactly the number of guides.
4. **The edit:** on every guide in the cluster, `status: "published"` and `datePublished: "<the day it deploys,
   UTC>"`, the same date, no `dateModified`. The date is never taken from the build or git, and never back-dated.
5. **Gates** on the branch, then CI; the owner merges; Vercel deploys; §5 the same day.

## 4. Unpublish, roll back, or add a guide

**Fix forward first.** A wrong sentence, link or snippet is a normal PR on a published guide (§7 for dates).

**Unpublish (rollback).** The same edit in reverse on every guide in the cluster: `status: "draft"`, and remove
`datePublished` and any `dateModified`. Rehearse it first; while the cluster is published the simulation runs the
other way:

```bash
pnpm turbo run build --filter=@kinetixui/web...
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome node scripts/simulate-guide-publication.mjs --browser --a11y --controls
```

It moves all four to draft in the registry, rebuilds, and checks that no guide is indexable, in the sitemap,
carrying TechArticle or linked from a docs page (the table in §3, right to left), runs the draft-state negative
controls, then restores and verifies the hash. The next deploy of the real edit makes the guides `noindex` and
drops them from the sitemap; Search Console drops them on recrawl. Do not use the Search Console removal tool for
this: it hides URLs temporarily and is meant for emergencies. Record the unpublication and the reason in
`CONTENT-BACKLOG.md`.

**Unpublishing one guide alone fails the gates**, by design: the others link it in their prose (`draft-linked`) and
it belongs to the pillar's cluster (`cluster-partial`). Remove the links in the same PR, or unpublish the cluster.

**Add a guide later.** A new guide starts as `draft` in `guides-data.ts`, with its own row in
[`SEARCH-INTENT-MAP.md`](./SEARCH-INTENT-MAP.md) (`guide-intent` fails without one). While it is a draft, no
published page may link it (`draft-linked`), so the pillar does not link it yet and it sits outside the cluster;
the gates allow that. To publish it: set its status and real date, add the pillar's link to it in the same PR (it
then joins the cluster), name it in a docs page's `<FurtherReading>` if one fits, and run the gate commands below and the
checks in §5. Before writing one, check the backlog's rule: no new cluster without evidence from Search Console
([`CONTENT-BACKLOG.md`](./CONTENT-BACKLOG.md)).

### Gate commands

```bash
pnpm turbo run build --filter=@kinetixui/web...
pnpm check:seo && pnpm check:editorial
pnpm --filter @kinetixui/web exec vitest run src/lib/guides.test.ts
(cd apps/web && npx next start -p 3000 &) ; pnpm check:seo-browser
node scripts/a11y-site.mjs --base http://localhost:3000 --guides \
  --page /docs/platforms --page /docs/tokens --page /docs/accessibility --page /docs/installation
node scripts/editorial-negative-controls.mjs      # runs the controls for the registry's current state
```

## 5. Day 0: checks on the live site (go-live 2026-10-12)

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
- [ ] ART-001 post-publication edit: not on Day 0 (ART-001 was not live on 2026-10-12); do it the day ART-001
      goes live (§6 below).

## 6. ART-001 → pillar: the post-publication edit

ART-001 (*"Your cross-platform design system may be lying about parity"*) is the awareness piece on dev.to and
stays canonical there. Its package is **not changed before it publishes**. The pillar has been live since
2026-10-12, so the only remaining condition is ART-001 itself (planned Tue 13 Oct). **Operator step, after ART-001
is live:** make one edit on dev.to and record it in the ART-001 close-out:

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
