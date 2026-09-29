---
type: distribution — GitHub as a channel
status: plan. No repository setting was changed and no Release was created
---

# GitHub as a distribution channel

GitHub is not a feed. It is the **destination that decides whether everything else worked**: a reader arrives
from LinkedIn or dev.to already half-convinced, and the repository either confirms it in fifteen seconds or
does not.

Its channel role is in [`README.md`](./README.md) §2. This file is the work.

**Nothing here was applied.** Repository settings and Releases are the maintainer's actions; this phase
changed neither, and never will automatically.

---

## 1. Actions before traffic

State read from the GitHub API on **2026-09-29**, not assumed.

### DO NOW — before day 1

| # | Action | Current state, verified | Why it blocks |
| --- | --- | --- | --- |
| 1 | **Replace the repository description** | `"Multi-platform design system: one token contract, with React, SwiftUI, Jetpack Compose and Flutter components."` | It **omits Angular**, which is published on npm, and omits the verification position entirely — the one thing no competitor markets. Wording: [`../MESSAGING.md`](../MESSAGING.md) §I, or the durable no-platform-names variant in `../audits/PHASE-0.75-PUBLIC-SURFACE.md` |
| 2 | **Set topics** | **Empty.** The API returns `{"names": []}` | Twenty topics are already chosen and ordered by expected search value in `../audits/PHASE-0.75-PUBLIC-SURFACE.md` §Topics. With none set, `topic:swiftui` and `topic:design-tokens` cannot find us at all — this is the cheapest discovery action available and it is currently unspent |
| 3 | **Upload the social preview** | **Missing** | Every link shared anywhere renders as a bare URL card. The file exists: `../content/visuals/SOCIAL-PREVIEW.png`, 1280×640. Settings → General → Social preview |

Three settings, one sitting. **Description and topics are the pair** — the description should be durable and
not enumerate platforms, precisely because the topics carry the keywords. Doing one without the other loses
either discovery or durability.

### THIS MONTH

| # | Action | Why not day 1 |
| --- | --- | --- |
| 4 | **Enable Discussions** with the four categories in §3 | The questions week 1 produces need somewhere to land that is not the issue tracker. Not day-1 blocking because there are no questions yet, and an empty Discussions tab is worse than none |
| 5 | **Create the three outstanding Releases** — §2 | A Release is not a launch beat. The Releases feed showing `v0.5.0` while npm serves `0.23.3` reads as abandoned, and that matters to anyone who checks — which is exactly the reader this channel serves |
| 6 | **Disable the Wiki if it is empty** | `has_wiki: true`. Whether it holds anything **could not be verified** — the wiki remote needs credentials this container does not have. An empty Wiki tab reads as an abandoned surface. Check, then decide |
| 7 | **Add the platform and area labels** in §4 | Needed before there are issues to label, not before there is traffic |

### LATER

| # | Action | Trigger |
| --- | --- | --- |
| 8 | A `good first issue` that is genuinely one | A real, small, self-contained task appearing in the normal course of work. **Never manufactured** — §4 |
| 9 | Pinned issues or a roadmap discussion | Once Discussions has real activity. Pinning something nobody asked about is decoration |
| 10 | Release notes written as content | Once a release contains something worth an announcement (§2's *material* test), not on a schedule |
| 11 | A README demo GIF | Once motion assets exist. Three shot lists are written and unproduced (`../content/motion-briefs.md`) |
| 12 | `.github/DISCUSSION_TEMPLATE/` | Only if Discussions produces enough low-quality questions to need shaping. Probably never |

### Not doing

- **No manufactured commits.** Commit frequency is not a marketing surface.
- **No manufactured issues** to look active. An issue nobody has is an issue nobody will close.
- **No stars asked for.** Not in a post, not in the README, not in a reply.
- **No repository setting changed automatically**, by this phase or any script in it.

---

## 2. Release communication policy

### The state, re-derived

> **This section names versions, and that is deliberate.** `marketing/README.md`'s rule is that *evergreen*
> copy — positioning, messaging, personas, claims, pillars, SEO — must not hard-code a version. A release
> action cannot be written without naming the tag it acts on, so the version is the subject here rather than
> a decoration. **Re-run `pnpm marketing:stats` and re-read the Releases page before acting on any row below**;
> once the three Releases exist, this section is history.

| Fact | Value |
| --- | --- |
| Releases that exist | **2** — `v0.5.0` (2026-09-06) and `v0.4.1`. Both from an abandoned repository-level `vX.Y.Z` tagging scheme |
| Package tags that exist | **94**, in the per-package `@kinetixui/<pkg>@<version>` scheme Changesets uses |
| Current versions on npm | `@kinetixui/{ui,tokens,cli}@0.23.3` · `@kinetixui/angular@0.24.0` · `@kinetixui/iot@0.2.0` |
| Tags with no Release | **92** |
| `githubReleaseUrl` set in `releases.ts` | **None.** The field is declared and unused; the site links each version's tag |

So a visitor sees a Releases feed that stopped three weeks before the current version, in a tag scheme the
project no longer uses. **That is the distribution problem**, and it is a credibility problem specifically:
this channel's whole job is confirming the project is serious.

**The mechanism is already fixed for the future.** `RELEASING.md` records the root cause — `changesets/action`
creates Releases by parsing `New tag:` lines out of the publish command's stdout, and this repository
publishes with its own `pnpm release` pipeline, so there was never anything to parse. Releases are now
created by `scripts/release/github-releases.mjs` from a summary the pipeline writes, one per tag that run
pushed for a package that run published. Never fatal, idempotent, no backfill, no invented prose.

**Nothing in this phase creates a Release.**

### When a GitHub Release is warranted

| Situation | Release? |
| --- | --- |
| A package publishes a new version | **Yes, automatically.** The pipeline does this now, one per published package tag |
| A cohort's *current* version has no Release and the feed reads as stale | **Yes, by hand — the three in §2.3** |
| A historical version | **No.** See *no backfill* below |
| A docs, site or marketing change | **No.** Nothing was published |
| A prerelease or canary | **No** |
| A milestone that is not a publish — Angular leaving preview, blocks verified on all five platforms, 1.0 | **Yes**, and this is the only case that is also a *content* beat |

### What a Release contains, and how it differs from the CHANGELOG

| | CHANGELOG | GitHub Release |
| --- | --- | --- |
| **Generated by** | Changesets, from the changesets themselves | The release pipeline, from the CHANGELOG plus the npm version |
| **Audience** | Someone already upgrading | Someone deciding whether this is maintained |
| **Scope** | Every change, per package, forever | One tag, one moment |
| **Tone** | Complete | Legible. What changed, who it affects, whether anything breaks |
| **Retro-edited** | Never | Never. An existing Release is not edited, replaced or deleted |
| **Prose** | Whatever the changeset said | **No invented prose.** It links the changelog and the exact npm version |

The CHANGELOG is the record. The Release is the *notification*, and it is the only one GitHub sends.

### The three outstanding Releases — specification unchanged

Fully specified in `../audits/PHASE-0.75-PUBLIC-SURFACE.md` §Release actions, and **still accurate**: all
three tags exist on `origin`, none has a Release. Re-verified against the live API on 2026-09-29. Summary
only — that audit is authoritative and is not restated here:

| Cohort | Tag | Body source | Afterwards |
| --- | --- | --- | --- |
| **Core** | `@kinetixui/ui@0.23.3` | `pnpm release:notes 0.23.3` | Set `githubReleaseUrl` on the `0.23.3` entry in `releases.ts` |
| **Angular** | `@kinetixui/angular@0.24.0` | The `## 0.24.0` section of `packages/ui-angular/CHANGELOG.md`. **No `release:notes` command exists for it** | **Nothing.** `releases.ts` describes the core line only |
| **IoT** | `@kinetixui/iot@0.2.0` | The `## 0.2.0` section of `packages/iot/CHANGELOG.md`. **Do not run `release:notes 0.2.0`** | **Nothing.** That entry's `0.2.0` is the *core* 0.2.0 from 2026-09-03 |

The `0.2.0` collision is the reason `release:notes` now refuses a version that is also an independently
versioned package's current release. Following the older instruction would have put *"Rebrand to KinetixUI"*
notes on the IoT Release.

### How the historical gap is handled

**Not backfilled. Three Releases, not ninety-two.** The reasoning is in `RELEASING.md` and it is a decision,
not an oversight:

- Ninety-two Releases created today for versions that shipped across five months **fabricates a history**,
  and the dates would be wrong on every one.
- Every watcher would receive ninety-two notifications at once.
- Nothing is unreachable: `/docs/changelog` covers every version, curated, and links each version's tag.

Three Releases make the sidebar show something true and recent. That is the whole objective — the gap is a
*visibility* problem, and ninety-two fake-dated entries would be a *truthfulness* problem, which is worse.

### How a Release feeds content

A Release is **not** automatically a post. The test is whether it contains something a reader would act on.

| Release contains | Content? |
| --- | --- |
| A patch, a dependency bump, an internal refactor | **No.** Silence |
| A new component or block | **Maybe** — one X post at most, and only if the component is interesting on its own |
| A structural fix with a lesson | **Yes** — pillar G, and the strongest material this project has. The registry-defect story (LI-006, X-006, COM-003) is exactly this |
| A new platform, a platform leaving preview, a verification level rising | **Yes** — pillars A and F, and a candidate launch beat (`../launches.md`) |
| The three catch-up Releases in §2.3 | **No.** They are hygiene. Announcing them draws attention to the gap they close |

`scripts/release-to-content.mjs` turns a release into draft *inputs*. It does not post anything, and the
judgement above stays human.

**No feature announcements are on the first month's calendar** — not one of the 27 assets is *"we shipped
X"*, and that is deliberate.

---

## 3. Discussions

**Currently disabled** (`has_discussions: false`, verified). **Recommendation: enable it — THIS MONTH, not
day 1.**

**Why enable.** It is the only place launch traffic can land that is not the issue tracker. Without it, a
question becomes either an issue (wrong shape, and it sits open looking like a defect) or nothing. The first
fortnight's posts are written to provoke exactly the questions that belong here — *"can I use the tokens
without your components?"* is a Discussion, not a bug.

**Why not day 1.** An empty Discussions tab with four empty categories reads worse than no tab. Enable it
when there is a first question to seed it with, or seed it with the Announcements post below.

### Four categories, and no more

| Category | Format | For |
| --- | --- | --- |
| **Announcements** | Announcement (maintainer-only) | Releases worth reading about, and milestones. Low volume by design |
| **Q&A** | Question / answer | *"How do I…"*, *"Does this work with…"*. Answerable, markable |
| **Show and tell** | Open | What someone built. There is nothing here yet and that is fine — the category is cheap and its absence is not |
| **Ideas** | Open | Feature and platform requests, so they stop arriving as issues |

**Four, not ten.** `../community.md` previously listed six (adding *Help* and *Platform requests*); *Help*
duplicates Q&A and *Platform requests* is a subset of Ideas. Ten categories on a repository with two stars is
an empty community architecture, and every empty category is a small signal that nobody is here.

### What belongs where

| | Issues | Discussions | Docs |
| --- | --- | --- | --- |
| **Something is broken** | ✅ Bug report template | ❌ | ❌ |
| **Something should exist** | Only once it is agreed and scoped | ✅ **Ideas** — this is where it starts | ❌ |
| **How do I do X?** | ❌ | ✅ **Q&A** | ✅ If asked **twice**, it is a docs gap. Open a docs issue |
| **Is X supported?** | ❌ | ✅ Q&A — then fix the page that failed to answer it | ✅ `/docs/platforms` should have answered it |
| **I built something** | ❌ | ✅ Show and tell | ❌ |
| **A security issue** | ❌ **Never publicly** | ❌ | `SECURITY.md` → a private advisory |
| **A release** | ❌ | ✅ Announcements | `/docs/changelog` is the record |

The rule: **Issues are for work. Discussions are for questions. Docs are for answers that should not have
needed asking.** A question asked twice is a docs defect, and routing it into docs is how the loop in
[`README.md`](./README.md) §7 actually closes.

### Recommended welcome copy — Announcements

Wording derives from `../MESSAGING.md` §J. Every number in it is re-derivable from `pnpm marketing:stats`;
none is hard-coded here, because this copy will outlive a version.

> **Welcome — and what this space is for**
>
> KinetixUI keeps one design language coherent across React, Angular, SwiftUI, Jetpack Compose and Flutter.
> One DTCG token source generates every platform's native token output. Components are implemented natively
> per platform against a shared contract — not transpiled from one source. Every platform claim is generated
> from a manifest and checked against real source in CI, which is how we found three of our own claims were
> wrong.
>
> **Ask here rather than opening an issue** if you want to know whether something is supported, how a piece
> of the architecture works, or what a coverage number means. Issues are for things that are broken.
>
> Three things worth knowing before you ask:
>
> - **Coverage is published with its gaps.** `/docs/platforms` has the per-platform counts and a documented
>   reason for every absence. If a number there is wrong, that is a bug and we want the issue.
> - **The native libraries are source you compile, not a registry install.** SwiftUI, Compose and Flutter
>   implementations are real and compiled in their own CI, and they are on no package registry. We will not
>   show you an install command for them.
> - **Angular is published and in preview**, both at once. It is a deliberate subset, and the subset is
>   stated everywhere rather than rounded up.
>
> The token layer is usable with no KinetixUI component at all, and that is a supported path rather than a
> loophole. If that is what you need, `/docs/tokens` is the place to start.
>
> MIT licensed. Everything here is maintained by one person, so answers may take a day.

**No claim in that copy exceeds `CLAIMS.md`.** No activation promise, no version, no *production ready*, no
user count, and the install-command prohibition is stated rather than merely obeyed.

---

## 4. The contributor loop

**Can technical content attract contributors?** Honestly: **not many, and not yet** — and it is still worth
the small amount of work below, because pillars C and G are read by exactly the people who contribute to
design-system infrastructure, and the cost of being ready is three labels and one paragraph.

The realistic expectation is **one or two drive-by contributions in the first quarter**, most likely a docs
correction or a platform-specific fix from someone who hit the gap themselves. Planning for more would be
planning for a community that does not exist.

### The path

```
DISCOVER            a pillar C or G post, or the repository from a post
    │
    ▼
UNDERSTAND          /docs/contributing — the platform rule, the standing non-ports,
ARCHITECTURE        the per-platform workflow, CI, component status
    │
    ▼
FIND A              labels, an Ideas discussion, or a gap they personally hit
CONTRIBUTION PATH
    │
    ▼
FIRST               a PR against main. CI is the compile check for every platform,
CONTRIBUTION        since no contributor has five native toolchains installed
```

### What exists, inspected

| Surface | State | Verdict |
| --- | --- | --- |
| `CONTRIBUTING.md` | A short orientation that **delegates to `/docs/contributing`** rather than duplicating it | **Good, and deliberately so** — one canonical copy that cannot drift from a second one |
| `/docs/contributing` | The full guide: platform rule, standing non-ports, per-platform workflow, CI, publishing, component status, blocks | **Good** |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1 | Present, Phase 0.75 |
| `GOVERNANCE.md` | Decision-making and maintainer structure. Makes React the invariant source of truth | Present |
| `SECURITY.md` | Private advisory route, covers the published packages | Present, Phase 0.75 |
| Issue templates | Bug and feature, with platform selection. Blank issues disabled, security routed to advisories | **Good** |
| PR template | Present | Present |
| Labels | GitHub defaults plus `accessibility`, plus Dependabot's `dependencies` / `github_actions` / `javascript` / `java` / `dart` | **Thin** — see below |
| `good first issue` | The label **exists**; **no issue carries it** | **Correct.** An empty label is honest; a fake easy issue is not |
| Open issues | **One**, and it is the Changesets Version PR. Effectively zero | Nothing for a contributor to pick up, which is the real constraint |

### The only necessary improvements

**1. Labels a contributor can filter by.** The existing set cannot express *where* in a five-platform
monorepo a piece of work lives, so nobody can find the part they know.

```
platform:react   platform:angular   platform:swiftui   platform:compose   platform:flutter
area:tokens      area:cli           area:docs          area:site          area:registry
```

Dependabot's language labels (`javascript`, `java`, `dart`) are not a substitute: they describe a file
extension, not a surface, and they are applied to bot PRs only.

**2. One paragraph in `/docs/contributing` naming the genuinely approachable work.** Not fabricated issues —
*categories*, which stay true without maintenance:

- A missing `platformNote` reason for a documented exception.
- A direction-aware behaviour test on a platform whose fraction is low — Compose is `1/90`, React `3/98`.
  These are real, small, individually verifiable, and they move a published number.
- An accessibility behaviour test where the fraction is thin — SwiftUI is `0/90`.
- A documentation page that failed to answer a question someone actually asked.

All four are *derivable from the published evidence fractions*, which means the list cannot go stale and
nobody has to curate it. Re-derive with `pnpm marketing:stats`.

**3. Nothing else.** No contributor ladder, no maintainer-wanted campaign, no Hacktoberfest. Each of those
needs a community to be worth the page it is written on.

### Not doing

- **No fake `good first issue`s.** A contributor who picks up a manufactured task and finds it was busywork
  does not come back, and tells people.
- **No "help wanted" on work only the maintainer can do.** The label already exists and applying it to the
  five-platform core would be a lie about how approachable the work is.
- **No contributor recruitment posts.** Contributors arrive because the engineering was interesting, which
  is pillars C and G doing their job. Asking is not a channel.
