---
type: distribution execution plan
scope: the first 14 days of the existing 30-day calendar
status: plan — nothing published, nothing scheduled in any tool
---

# First 14 days — distribution

**No new content.** Every asset below is finished and registered. The schedule is
[`../content/calendar.md`](../content/calendar.md); the index is
[`../content/register.json`](../content/register.json). This file adds only *how each one goes out* and *what
to watch afterwards*.

Day offsets, not dates. **Day 1 is a Tuesday.** Start date is Ziad's call once §Before day 1 is clear.

**Eight scheduled assets in fourteen days**, plus two opportunistic community contributions. That is the
cadence on purpose (`../audits/PHASE-4-CONTENT-ENGINE.md`): one person, who also maintains the product.

## Before day 1 — the blocking set

| # | Action | Blocking? | State | Where |
| --- | --- | --- | --- | --- |
| 0 | **Merge this branch and deploy `apps/web`** | **YES — and it was missing from every earlier phase's list** | **NOT DONE.** 7 commits unmerged | below |
| 1 | **Replace the repository description** and **set topics** (topics are currently empty) | **YES** | **NOT DONE.** Web UI only — see below | [`github.md`](./github.md) §1 |
| 2 | **Upload `SOCIAL-PREVIEW.png`** as the social preview | **YES** — day 1 links to the repository eventually, and an untitled card is the first impression | **NOT DONE.** Web UI only; GitHub has no API for it | [`github.md`](./github.md) §1 |
| 3 | **Build the PostHog dashboard** — 11 insights | **YES.** Without it the fortnight produces data nobody reads | **DONE** 2026-09-29 — `dashboard/2148797` | `../analytics.md` §11 |
| 4 | **Read the current rules** for every community in `../content/community-briefs.md` | Blocks community work only | Not done | `LIVE RULE CHECK REQUIRED` |
| 5 | **Re-run `pnpm marketing:stats`** and re-check every number in LI-003, X-005, LI-004, X-003 | **YES** | Re-run 2026-09-29; numbers unchanged | — |
| 6 | Aesthetic approval on VIS-001, VIS-002, VIS-003, VIS-005 | Soft — a post ships without its visual rather than late | Not done | `../content/visuals/` |

Items 0–3 and 5 are the real gate. Everything else can move.

### Item 0 — the prerequisite nobody listed

**Production runs `main`. Phases 1–6 are on this branch, unmerged.** That means the site a Day 1 visitor
lands on has the **pre-Phase-2 hero and the pre-Phase-2 CTAs**, and it does not emit most of the funnel:
`platform_coverage`, `view_verification`, `adopt_tokens`, `adopt_components`, `adopt_blocks`,
`block_code_copied`, `platform_selected` and `blocks_gallery` have **never fired**, verified against the
PostHog event table rather than assumed.

Two consequences, and the second is the expensive one:

1. **The destinations promise things the deployed page does not show.** Every asset in these 14 days points
   at `/docs/platforms`, `/docs/tokens` or `/components` with a Phase 2 framing behind it.
2. **Qualified Evaluation silently under-counts.** Three of its six signals cannot fire, so the primary
   Tier 1 metric would record a fraction of what happened — and a low number would be read as *the content
   did not work* when it actually means *the page could not report it*. That is the worst failure mode
   available here, because it is invisible and it would be acted on.

**Publishing before the merge and deploy would spend the month's content against a measurement system that
cannot see it.** The merge is the user's call and no phase has authorised it.

### Items 1 and 2 — why they are still manual

Not a permissions problem. This container's proxy refuses repository *settings* writes as a category:
`PATCH /repos/zedalleys/kinetixui` returned **"Repository settings writes are not permitted through this
proxy"** and `PUT .../topics` returned **"Write access to this GitHub API path is not permitted through this
proxy"**, both while the token reports `admin: true`. The social preview has **no REST endpoint at all** —
it is a web-UI-only setting, so no token or proxy would help.

All three are done in **Settings → General** in the browser, in one sitting. The strings are in
[`github.md`](./github.md) §1.

---

## Week 1 — problem recognition

The week names the problem for both ICPs and runs **the cleanest experiment in the month**.

### Day 1 · LI-003 · LinkedIn · P2 · Pillar A · Awareness

*"Six months later, they don't"* — drift as a mechanism problem.

| | |
| --- | --- |
| **Primary** | LinkedIn, with **VIS-001** attached. Campaign `kx_p2_a_drift`, `utm_content=li_primary` |
| **Destination** | `/docs/platforms` — the tagged URL is in `register.json`; copy it, do not retype it |
| **Secondary** | **None.** Day 1 is a single post. Resist the urge to open on three channels |
| **Community reuse** | **No.** COM-002 is the week's community asset and it is a *different* argument |
| **Engagement follow-up** | Two checks, morning and evening. Reply to anyone who describes their own drift — that reply is evidence, log the substance in `../research/` |
| **Metric to watch** | `kx_campaign=kx_p2_a_drift` sessions, and whether **any** reach `/docs/platforms`. Absolute counts |
| **Caveat** | VIS-001 is a **constructed illustration**, not a screenshot of a real broken app. If the caption mentions the panels, say so |

### Day 2 · X-005 · X · P2 · Pillar A · Awareness

Drift is not a discipline problem.

| | |
| --- | --- |
| **Primary** | X, single post, **no visual**, **no link in the post** |
| **Link placement** | The tagged URL (`utm_content=x_single`, same campaign) goes in the **first reply**, or nowhere. The post carries the argument |
| **Secondary** | None |
| **Community reuse** | No |
| **Engagement follow-up** | Replies only. A quote or a reply from a named engineer is the signal here; likes are not |
| **Metric to watch** | Whether `kx_source=x` produces any session at all. Expect near-zero and do not read anything into it |

### Day 4 · LI-004 · LinkedIn · P1 · Pillar C · Evaluation

The manifest, and the check that reads it back.

| | |
| --- | --- |
| **Primary** | LinkedIn, with **VIS-002**. Campaign `kx_p1_c_manifest` |
| **Destination** | `/docs/platforms` — the same destination as LI-003, deliberately |
| **Secondary** | **VIS-009** (the verification pipeline) is an alternative card if VIS-002 reads as too abstract. One card, not both |
| **Community reuse** | No |
| **Engagement follow-up** | This post attracts *"how does the check actually work?"*. Answer it in the thread with the check name, not a link. If asked twice, it is a docs gap |
| **Metric to watch** | `kx_p1_c_manifest` sessions vs `kx_p2_a_drift` from day 1 — **the P1/P2 comparison starts here** |
| **Hard rule** | **Do not reference LI-003.** No cross-linking, no *"following on from Tuesday"*. Cross-linking contaminates the only clean comparison in the month |

### Day 6 · X-003 · X · P1 · Pillar C · Evaluation

No source, no claim, build fails.

| | |
| --- | --- |
| **Primary** | X, single post. No visual, no link in the post; tagged URL in the first reply if used |
| **Secondary** | None |
| **Community reuse** | **COM-002** draws on the same argument and is written to stand without it. Do not post both in the same 48 hours |
| **Engagement follow-up** | The line *"the coverage numbers went down. Good."* is the part people reply to. Engage on that, not on the product |
| **Metric to watch** | Replies. This is the most quotable asset in week 1 |

### Opportunistic · COM-002 · community · P1 · Pillar A

How to verify a coverage claim.

| | |
| --- | --- |
| **Where** | Design-system communities, r/Frontend. Candidates and fit in [`../community.md`](../community.md) |
| **Format** | A substantial **comment in an existing thread**. Not a post |
| **Trigger** | A real thread about evaluating a cross-platform library, or a parity claim someone doubts. **Do not create the occasion** |
| **Link** | **None**, unless someone asks what the checks look like. Then the coverage table, untagged |
| **Rules** | **`LIVE RULE CHECK REQUIRED`.** Read the current rules first. Assume promotion is prohibited |
| **Disclose** | *"I build KinetixUI, so I have a bias here."* Always |
| **Engagement follow-up** | Answer follow-ups in the thread. Never move the conversation to DM |
| **Metric to watch** | None available — this is **community-dark** by design (README §5). The signal is the reply, not a session |

### End of week 1

| | |
| --- | --- |
| **Assets out** | 4 scheduled (2 LinkedIn, 2 X) + up to 1 community contribution |
| **Review** | Fill the distribution block in [`../weekly-review.md`](../weekly-review.md). Append 4 result rows to `register.json` |
| **Report** | **Absolute counts only.** No rates, no percentages — `analytics.md` §10 |
| **The one question** | Did anybody reach `/docs/platforms`, and from which campaign? |

---

## Week 2 — architecture

The article week. Mechanism, now that the problem has a name.

### Day 8 · ART-002 · dev.to · P2 (NEUTRAL framing) · Pillar B · Awareness

*Your design tokens stop at the web boundary* — ~1,500 words, full draft.

| | |
| --- | --- |
| **Primary** | **dev.to**, canonical. `utm_source=devto`, `utm_medium=referral`, campaign `kx_p2_b_token_boundary`, `utm_content=art_primary` |
| **Canonical location** | dev.to. There is **no `/blog`** on the site and none should be built yet — `../seo.md` says not before three articles have run off-site with one showing traffic |
| **Links inside** | Contextual, in the section each supports → `/docs/tokens`. One closing CTA. Never a banner |
| **Visual** | **VIS-003** as the header image. VIS-008 is its deliberate pair and belongs in the components section, not the header |
| **Secondary** | **Hashnode cross-post with a `canonical_url` pointing at the dev.to article** — see [Article distribution](#article-distribution) below. Optional, and only after dev.to has indexed |
| **Community reuse** | **COM-001** derives from this article and is a different piece of writing. Not before day 10 |
| **Engagement follow-up** | dev.to comments run slower than social — check on days 8, 9 and 11. Answer token-pipeline questions in detail; that is the audience we want |
| **Metric to watch** | Qualified Evaluation **rate** of `devto` sessions against `linkedin` — as counts. An article should convert better and reach less |
| **Hard rule** | **No install command for SwiftUI, Compose or Flutter** anywhere in it (`CLAIMS.md` C3). The article was written against this and the claim guards enforce it on our own surfaces — dev.to is outside CI, so this one is on the human |

### Day 9 · LI-005 · LinkedIn · P2 · Pillar B · Awareness

The boundary, and the copies nobody maintains.

| | |
| --- | --- |
| **Primary** | LinkedIn, with **VIS-003** — the same card as the article, deliberately: recognition is the point |
| **Destination** | `/docs/tokens`, campaign `kx_p2_b_token_boundary`, `utm_content=li_primary` |
| **Relationship to ART-002** | This is the article's **one** LinkedIn post. Not a serialisation. The ceiling is one post plus one re-angle three weeks later |
| **Secondary** | Link to the article in the post body *or* link to `/docs/tokens` — **not both**. Prefer the article: it is the deeper proof and it carries its own CTA onward |
| **Community reuse** | COM-001, from day 10 onward |
| **Engagement follow-up** | This post surfaces *"can I use the tokens without your components?"* — the single most valuable question we get, because the answer is yes and it is P2's whole adoption path. Answer it concretely |
| **Metric to watch** | `adopt_tokens` on `/docs/tokens`, and whether `kx_p2_*` starts to out-evaluate `kx_p1_*` |

### Day 11 · X-004 · X · NEUTRAL · Pillar B · Thread (5)

The token boundary, in five.

| | |
| --- | --- |
| **Primary** | X thread, 5 posts. **VIS-003 on the opening post only** |
| **Link placement** | The tagged URL (`utm_content=x_thread`) in the **final** post, where someone who read it all will find it. Never mid-thread |
| **Secondary** | None |
| **Community reuse** | No — COM-001 is already carrying this idea into communities |
| **Engagement follow-up** | Reply to platform-specific questions with the platform's own page (`/docs/flutter`, `/docs/swiftui`, `/docs/compose`) — not the homepage. README §6 |
| **Metric to watch** | `platform_selected` spread. A thread about crossing the boundary should move people to *a specific* platform |

### Day 13 · LI-007 · LinkedIn · P2 · Pillar F · Evaluation

Two trades: runtime versus native implementations.

| | |
| --- | --- |
| **Primary** | LinkedIn, with **VIS-005**. Campaign `kx_p2_f_two_trades`, destination `/components` |
| **Secondary** | **VIS-008** is the honest companion — tokens *generated*, components *written*, "implements, not compiles into". If the post draws a *"so it's transpiled?"* reply, VIS-008 is the answer, posted as a reply |
| **Community reuse** | No |
| **Engagement follow-up** | This is the post most likely to attract a comparison argument. The framing to hold: **a trade, not a winner** — and `STRATEGY.md` §6 already says the React library alone is our least differentiated artefact. Do not defend it as one |
| **Metric to watch** | `/components` arrivals → `component_viewed`. If people land and do not open a component, the destination is wrong for this promise |
| **Hard rule** | **Never imply transpilation.** Five implementations share a contract, not a codebase. `marketing-claims.test.ts` guards our surfaces; a LinkedIn post is not guarded |

### Opportunistic · COM-001 · community · P2 · Pillar B

Cross-platform token architecture.

| | |
| --- | --- |
| **Where** | r/FlutterDev, r/androiddev, r/swift, design-system Slack/Discord. **Mobile communities are the highest-upside channel we have** and the most rules-sensitive |
| **Format** | A substantial comment. A text post **only** if the rules permit one and nobody has covered it recently |
| **Trigger** | A real thread about sharing design decisions between web and native |
| **Link** | None, unless asked for a concrete example of native token generation. Then the **committed generated artefacts** — they read without installing anything |
| **Rules** | **`LIVE RULE CHECK REQUIRED`** |
| **Hard rule** | **Do not imply the native libraries are installable.** They are on no registry (`CLAIMS.md` C3). And never present KinetixUI as a substitute for native platform expertise |
| **Metric to watch** | Community-dark. The signal is whether a native engineer engages with the *pipeline* |

### End of week 2

| | |
| --- | --- |
| **Assets out** | 4 scheduled (1 article, 2 LinkedIn, 1 X thread) + up to 1 community contribution. **8 in 14 days** |
| **Review** | Weekly block again. 4 more result rows |
| **Decision available** | Which of the four destinations received anything. That is a destination decision (README §6), not yet a channel decision |
| **Decision NOT available** | Any P1/P2 verdict. Two LinkedIn posts per hypothesis is not a sample — `analytics.md` §10 |

---

## Article distribution {#article-distribution}

For **ART-001** and **ART-002**, both finished.

| | ART-001 | ART-002 |
| --- | --- | --- |
| **Title** | *Your cross-platform design system may be lying about parity* | *Your design tokens stop at the web boundary* |
| **Pillar / ICP** | A / P1 | B / P2 |
| **Canonical** | **dev.to** | **dev.to** |
| **Day** | 15 (week 3) | **8** |
| **Destination** | `/docs/platforms` | `/docs/tokens` |
| **Campaign** | `kx_p1_a_parity_proof` | `kx_p2_b_token_boundary` |
| **Social derivatives** | LI-001 (day 16), LI-002 (day 36+), X-001 (day 17) | LI-005 (day 9), X-004 (day 11) |
| **Community derivatives** | COM-002 | COM-001 |
| **Visual** | VIS-009, VIS-006 | VIS-003, with VIS-008 inline |
| **GitHub linkage** | Not linked from the README. A README that links out to articles ages badly | Same |

**Canonical-link requirements for any cross-post.** dev.to is canonical for both. A Hashnode or Medium
cross-post **must** set `canonical_url` to the dev.to URL, or the two compete and neither ranks — the
duplicate-content problem `../seo.md` exists to avoid. If the platform does not support a canonical link, do
not cross-post there.

**No `/blog` yet.** Three articles off-site, with one showing measurable traffic, is the trigger
(`../seo.md`). Two exist. Building `/blog` now would mean moving canonical URLs of articles that have not
earned an audience.

**Nothing is published in this phase.**

---

## What is deliberately absent from these 14 days

- **No launch.** Rolling, per [`../launches.md`](../launches.md). There is no day-1 moment.
- **No Product Hunt.** After baseline.
- **No Hacker News submission.** Comments only, and none is scheduled.
- **No scheduled Reddit post.** Community work is opportunistic and rules-gated.
- **No GitHub Release.** [`github.md`](./github.md) §2 puts the three outstanding Releases in **THIS MONTH**,
  not before traffic — a Release is not a launch beat.
- **No outreach.** [`outreach.md`](./outreach.md) is written and unsent. Outreach before there is anything to
  react to wastes the introduction.
- **No paid promotion, no cross-posting the same copy, no second impression of any post.**
