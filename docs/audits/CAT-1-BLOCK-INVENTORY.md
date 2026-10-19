# CAT-1 — block inventory

One row per block in `blocks.manifest.json` (21) at `main` `984792b` (2026-10-18). Reasoning and limits are in
[`CAT-1-CATALOGUE-AUDIT.md`](CAT-1-CATALOGUE-AUDIT.md) §5.

Column notes:

- **Current category** — the structural `category` in `blocks.manifest.json`, which the `/blocks` `?cat=` filter
  offers today.
- **Proposed capability** — the business capability from the canonical vocabulary
  (`docs/business-capabilities.json`). **Bold** marks a block that has no capability today; `account-settings` and
  `content-marketing` are the two capabilities the mapping would add.
- **Workflow** — canonical workflow from `discovery-index.json`. Only two blocks carry one, which is a gap.
- **Industry relevance** — a proposed secondary facet, left out of the UI until more blocks carry one.
- **Evidence** — `verification.json` `blocks`, per platform, same letters as the component inventory. 96 of the 105
  cells are build verified, 7 headless (`profile-form`, `editor-toolbar` and `filter-panel` on Compose and Flutter;
  `filter-panel` on Angular) and 2 runtime (`order-summary` and `receipt` on React).

| Slug | Title | Current category | Proposed capability | Workflow | Industry relevance | Platforms | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| `account-security` | Account security | Application | identity-security | — | saas, enterprise | 5/5 | REB NGB SWB COB FLB | stable |
| `alert-stack` | Alert stack | Feedback | application-foundations | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `comment-box` | Comment box | Application | communication | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `create-account` | Create account | Forms | identity-security | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `cta-banner` | CTA banner | Marketing | **content-marketing** | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `dashboard-tabs` | Dashboard tabs | Data | data-analytics | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `editor-toolbar` | Editor toolbar | Application | **documents** | — | — | 5/5 | REB NGB SWB COH FLH | stable |
| `empty-state` | Empty state | Application | **application-foundations** | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `filter-panel` | Filter panel | Data | data-analytics | — | — | 5/5 | REB NGH SWB COH FLH | stable |
| `loading-state` | Loading state | Feedback | application-foundations | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `onboarding-checklist` | Onboarding checklist | Application | **identity-security** | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `order-summary` | Order summary | Commerce | transactions | checkout | commerce | 5/5 | RER NGB SWB COB FLB | stable |
| `pricing-tier` | Pricing tier | Marketing | transactions | — | saas | 5/5 | REB NGB SWB COB FLB | stable |
| `profile-form` | Profile form | Forms | **account-settings** | — | — | 5/5 | REB NGB SWB COH FLH | stable |
| `receipt` | Receipt | Commerce | transactions | checkout | finance, commerce | 5/5 | RER NGB SWB COB FLB | beta |
| `settings-list` | Settings list | Application | **account-settings** | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `sign-in` | Sign in | Forms | identity-security | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `stat-cards` | Stat cards | Data | data-analytics | — | saas, healthcare, logistics | 5/5 | REB NGB SWB COB FLB | stable |
| `table-toolbar` | Table + toolbar | Data | data-analytics | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `team-members` | Team members | Application | **account-settings** | — | — | 5/5 | REB NGB SWB COB FLB | stable |
| `testimonial` | Testimonial | Marketing | **content-marketing** | — | — | 5/5 | REB NGB SWB COB FLB | stable |
