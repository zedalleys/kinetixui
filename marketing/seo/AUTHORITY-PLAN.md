# Authority plan

**Supporting document.** How kinetixui.com earns links and mentions from places that already exist, without
link-building. It decides **which page each kind of link should point at** and **which existing asset carries
it**. It does not add channels, campaigns or people: community fit and rules are in
[`../community.md`](../community.md), outreach archetypes and their rules in
[`../distribution/outreach.md`](../distribution/outreach.md), GitHub in
[`../distribution/github.md`](../distribution/github.md), the schedule in
[`../content/calendar.md`](../content/calendar.md).

**No targets are named here that were not already in those files**, and no link counts, domain ratings or
rankings are quoted: none were measured, and this container cannot reach the sites to check them.

---

## 1. Principles

1. **Earn links with things worth citing.** The citable assets are the evidence (`/docs/platforms`), the token
   pipeline (`/docs/tokens`), the guides once published, and the articles. A link is a side effect of someone
   finding one of these useful.
2. **Send each link to the page that answers the linking context**, not to the homepage (§3). A homepage link
   from a thread about token pipelines lands a reader one click away from the answer, and teaches search engines
   nothing about which page is about what.
3. **One idea, one campaign** for tagged links on owned channels ([`../analytics.md`](../analytics.md) §8). Links
   placed in other people's spaces (community answers, directories) are **not** tagged
   ([`../community.md`](../community.md)): a tracked link in someone else's thread is the instinct this project
   should not have. They show up as `kx_source = reddit / devto / github / other` through the referrer.
4. **Never:** buy links, swap links, mass-submit to directories, post the same link across communities, write
   guest posts for links, comment for links, or ask anyone to link. Anything that would read as spam to the
   community it is in is out, whatever its search value.

## 2. Tier 1: owned surfaces

These are links the project controls. Most of them exist already; the work is pointing them at the right page.

| Surface | Today (checked 2026-10-12) | Link target(s) | Action | When |
| --- | --- | --- | --- | --- |
| GitHub README | links `/docs/platforms` (×3), `/docs`, `/components`, `/create`, `/docs/changelog`, `/docs/installation`, `/docs/accessibility`, `/charts`, the homepage | as today; add the pillar to the "learn more" list | one line linking the pillar by its title | after the guides publish |
| Package READMEs on npm | `@kinetixui/tokens` → `/docs/tokens`, `/docs/platforms`; `@kinetixui/angular` → `/docs/angular`, `/docs/platforms`; `@kinetixui/cli` → `/docs/cli`, `/docs/installation`, `/components` | as today | none; already specific | — |
| npm `homepage` field | `@kinetixui/ui`, `tokens`, `cli`, `iot` → the homepage; `@kinetixui/angular` → `/docs/angular` | `tokens` → `/docs/tokens`, `cli` → `/docs/cli`, `iot` → `/docs/iot` | **recommendation only**: package metadata changes ship with a release, so it rides the next version PR of each package, not this plan | next release of each package |
| Docs pages | "Further reading" on `/docs/platforms`, `/docs/tokens`, `/docs/accessibility`, `/docs/installation` | the guides | automatic on publication | publication day |
| Changelog (`/docs/changelog`) | release notes | the component or platform page a change is about | link the page a change affects, not the homepage | every release entry |
| Homepage | links `/components`, `/docs/platforms` | as today | none; the homepage gives authority, it does not need to receive it | — |
| GitHub Releases | not yet published ([`../distribution/github.md`](../distribution/github.md) §2) | the platform page or `/docs/platforms` for coverage changes | per that file's release policy | per release |
| GitHub Discussions | proposed in [`../distribution/github.md`](../distribution/github.md) §3 | the docs page that answers the question | answers link the page, never the homepage | when Discussions open |
| LinkedIn, X | per the calendar; each post has one tagged destination in `register.json` | the destination already registered | none; the register decides | per the calendar |
| dev.to | ART-002 live (→ `/docs/tokens`), ART-001 Tue 13 Oct (→ `/docs/platforms`) | primary CTA as registered; one secondary link to the pillar once both are live | ART-001 post-publication edit ([`GUIDE-PUBLISH-RUNBOOK.md`](./GUIDE-PUBLISH-RUNBOOK.md) §6); ART-002: a reply on its own thread pointing to the tokens guide only if a reader asks the generated-components question | after the pillar is live |
| dev.to series and tags | none | — | put ART-001 and ART-002 in one dev.to series so each article links the other; same tags as published | after ART-001 |
| Personal site / profile | not in this repository | the homepage or `/docs/platforms` | owner's choice; a one-line "currently building" link is enough | owner |

## 3. Link targets: which page receives which link

| The linking context is about… | Link to | Not to |
| --- | --- | --- |
| cross-platform design system architecture, "how is one built" | the pillar, `/guides/cross-platform-design-systems` (once published) | the homepage |
| whether a library's platform coverage is real; parity; evidence | `/docs/platforms` | the pillar (it explains, `/docs/platforms` proves) |
| verifying parity, verification levels, negative controls | `/guides/verify-design-system-parity` (once published) | `/docs/accessibility` |
| design tokens across web, iOS and Android; DTCG; Style Dictionary output | `/docs/tokens` | the tokens guide, unless the question is "why not generate components too" |
| generating components from one source | `/guides/generated-tokens-vs-generated-components` (once published) | `/docs/tokens` |
| choosing or evaluating a component library | `/guides/evaluate-cross-platform-component-library` (once published), then `/components` | the homepage |
| a specific component ("accessible combobox", "dialog vs sheet") | that component's page, `/docs/components/<slug>` | `/components` |
| the whole catalogue, "what components exist" | `/components` | a component page |
| Angular | `/docs/angular` | `/components` |
| SwiftUI, Compose, Flutter | that platform's page | `/docs/platforms` |
| accessibility evidence, contrast, keyboard | `/docs/accessibility` | the homepage |
| RTL, Arabic, mirroring | `/docs/rtl` | `/docs/accessibility` |
| IoT, device state, command lifecycle | `/iot` (showcase) or `/docs/iot` (the package) | the homepage |
| the project as a whole, a mention with no specific context | the homepage | — |

Until the guides are published, a link that would go to a guide goes to that guide's CTA page instead:
architecture → `/docs/platforms`, verification → `/docs/platforms`, generated components → `/docs/tokens`,
evaluation → `/components`. A draft guide is never linked from anywhere off-site.

**Anchor text:** the destination's own subject in plain words ("platform coverage, generated from the manifest",
"how the token pipeline compiles to Swift and Kotlin"). Never "click here", never the brand name alone for a deep
link, never an exact-match keyword string repeated across placements.

## 4. Tier 2: earned and community

Who these communities are, their rules, and the fit of each asset are in [`../community.md`](../community.md);
the archetypes for one-to-one outreach are in [`../distribution/outreach.md`](../distribution/outreach.md). This
section only adds which page a link there should point at, when a link is appropriate at all.

| Where | Fit (from `community.md`) | When a link is appropriate | Link target |
| --- | --- | --- | --- |
| Design-systems communities (Design Systems Slack, design-system Discords) | high | someone asks how to keep platforms aligned or verify coverage | `/docs/platforms`, or the pillar / parity guide once published |
| Mobile platform communities (r/FlutterDev, r/androiddev, r/swift, r/iOSProgramming) | high, strict anti-promotion | someone asks how to share tokens with a web team | `/docs/tokens` only, and never an install command (`CLAIMS.md` C3) |
| Frontend communities (r/reactjs, r/Angular2, r/Frontend, r/webdev) | medium | an Angular component library question; a registry-vs-npm question | `/docs/angular`; `/docs/installation` |
| Accessibility communities | low–medium | someone asks how to report accessibility evidence honestly | `/docs/accessibility`, never as compliance |
| General engineering (HN comments, r/programming) | medium, comments only | the bug-class argument (COM-003) | usually no link; if asked, the specific file on GitHub |
| dev.to internal links | owned + community | a later article on the same subject | link the earlier article and the specific docs page |
| Technical newsletters and curated lists | not assessed | only when a real milestone exists (a stable Angular release, a native library on its registry) and the list's own submission rules invite it | the page about that milestone |
| Directories (design-system galleries, "awesome" lists) | not assessed | only lists that accept submissions by pull request or form, for a project of this kind, once per list | the homepage, or `/components` for component galleries |

**Newsletters, curated lists and directories are deliberately unnamed.** Whether a given one accepts submissions,
and whether KinetixUI fits it, is checked when there is something to submit, from inside a browser, against
the list's current rules; a list written here would be guesses. Each submission is logged as an
off-calendar row in `marketing/distribution/register.json` with the URL and the date.

## 5. Sequence

1. **Now (guides are drafts):** links go to `/docs/platforms`, `/docs/tokens`, `/components` and the platform
   pages per §3. ART-001 goes out Tue 13 Oct with its registered destination, unchanged.
2. **Publication day:** README "learn more" line to the pillar; the FurtherReading lines switch on by themselves.
3. **ART-001 live and the pillar published:** the post-publication edit
   ([`GUIDE-PUBLISH-RUNBOOK.md`](./GUIDE-PUBLISH-RUNBOOK.md) §6); dev.to series for ART-001 and ART-002.
4. **Weeks 2–4:** community answers per [`../community.md`](../community.md), linking per §3 only where the
   question asks for it. LI-008 and COM-002 are the natural places for the parity guide; LI-007 / X-008 for the
   evaluation guide ([`CONTENT-BACKLOG.md`](./CONTENT-BACKLOG.md) *Calendar alignment*).
5. **Next real milestone** (stable Angular, a native registry release): one submission per relevant list, per §4.

## 6. How we know it is working

Earned links are not counted by a tool here (no backlink connector exists). What is measured is what they bring:

- Search Console **Links** report, monthly: top linked pages and top linking sites. The expected shape is links
  spread over `/docs/platforms`, `/docs/tokens`, the guides and component pages, not concentrated on `/`.
- PostHog: sessions by `kx_source` and landing page ([`MEASUREMENT.md`](./MEASUREMENT.md) §3), and their QE.
- Non-brand impressions on the target pages in Search Console ([`MEASUREMENT.md`](./MEASUREMENT.md) §4).

Fewer than ~30 QE sessions from a source means change nothing ([`../analytics.md`](../analytics.md) §10).
