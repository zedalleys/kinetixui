# Distribution

**Canonical** distribution system: which channels we use, what each one is *for*, and how a published asset
turns into a measurable arrival. Strategy is [`../STRATEGY.md`](../STRATEGY.md), wording is
[`../MESSAGING.md`](../MESSAGING.md), permission is [`../CLAIMS.md`](../CLAIMS.md), measurement is
[`../analytics.md`](../analytics.md). This file decides **where and how**, never *what we say*.

The content already exists. [`../content/calendar.md`](../content/calendar.md) is the schedule and
[`../content/register.json`](../content/register.json) is the index of the 27 finished assets. Nothing here
adds an asset, and nothing here is a second calendar.

| File | What it is |
| --- | --- |
| **This file** | Channel roles, the discovery loop, attribution, destinations, engagement, stop rules, automation |
| [`first-14-days.md`](./first-14-days.md) | Day-by-day execution for the existing days 1–14 |
| [`github.md`](./github.md) | GitHub as a channel: actions before traffic, Release policy, Discussions, the contributor path |
| [`outreach.md`](./outreach.md) | Five partnership archetypes and the outreach templates |
| [`register.json`](./register.json) | The distribution log — one row per act of publishing. Validated by `pnpm check:distribution` |
| [`../community.md`](../community.md) | Per-community assessment and the weekly listening routine |
| [`merge-preflight.md`](./merge-preflight.md) | The Phase 1–6 merge preflight: what was verified before the PR, and what still blocks Day 1 |

---

## 1. The principle

Distribution is not *post everywhere*. It is:

> **Put the right proof in front of the right audience, in the native format of that channel.**

Three consequences we actually act on:

1. **A channel gets the pillars it can carry.** Nobody reads a 250-word architecture argument on X, and a
   sharp one-line observation is wasted on LinkedIn. Forcing all six pillars onto all channels produces six
   bad posts.
2. **The destination is part of the asset.** A post about tokens that lands on `/` has thrown away the
   match between promise and proof. §6 maps every content promise to its destination.
3. **Contribution before product.** In every community channel the useful content is the contribution; the
   product is at most a footnote someone asked for. This is not politeness — it is the only version of
   community distribution that survives contact with moderators.

What we are trading on is technical usefulness, design-system insight, transparent engineering and real
product proof. We have **no users to point at** (`STRATEGY.md` §8.6), so every channel is carrying
engineering credibility or it is carrying nothing.

---

## 2. Channel roles

Roles follow Phase 4's prioritisation ([`../audits/PHASE-4-CONTENT-ENGINE.md`](../audits/PHASE-4-CONTENT-ENGINE.md)).
`ATTRIBUTION METHOD` names the `utm_source` value from `ATTRIBUTION_SOURCES` in
`apps/web/src/lib/analytics-attribution.ts` — the closed vocabulary the runtime will actually keep.

### LinkedIn — **PRIMARY**

| | |
| --- | --- |
| **Primary audience** | P1, P2, S1, S2 — design-system owners and engineering leads |
| **Channel job** | Carry the architecture argument at length, to the people who decide |
| **Best content** | Pillars **A** (verified cross-platform), **C** (engineering), **D** (accessibility/RTL), **G** (build-in-public). One idea, 150–300 words, a generated diagram |
| **Bad fit** | Release notes · component showcases · anything whose point is a screenshot · pillar **E** (device interfaces — the audience is elsewhere) |
| **Cadence** | **1–2 posts a week.** Never two in a day, never two on the same idea in a week |
| **CTA style** | One link, in the post body, phrased as evidence: *"See the coverage"*, not *"Read more"*. One CTA per post |
| **Attribution** | `utm_source=linkedin` · medium `social` · the tagged URL from `register.json`, copied never retyped |
| **Success signal** | Qualified Evaluation from `kx_source=linkedin` sessions. A substantive comment from someone who owns a design system outranks any number of likes |
| **Stop / reduce** | Four or more posts with real reach and **zero** qualified evaluation, across ≥2 review cycles. Reduce — do not stop — if reach holds but the comments are all from other builders |

### Long-form off-site (dev.to) — **PRIMARY**

| | |
| --- | --- |
| **Primary audience** | P1, P2, S2, S4 — people searching the problem, not the product |
| **Channel job** | Hold the full argument. Every other asset in a family derives from here |
| **Best content** | Pillars **A**, **B** (tokens), **C**, **D**, **E**. Anything needing >500 words or real code |
| **Bad fit** | A short observation padded to article length. One thin article costs more than no article |
| **Cadence** | **One article per 2–3 weeks.** Two are finished (ART-001, ART-002); a third is not drafted and will not be forced |
| **CTA style** | A contextual link inside the section it supports, plus one at the end. Never a banner |
| **Attribution** | `utm_source=devto` · medium `referral` (dev.to normalises to `community` by default; the register sets it explicitly) |
| **Success signal** | Qualified Evaluation rate of `devto`-attributed sessions vs `linkedin`. Articles should convert *better* and reach less |
| **Stop / reduce** | Two articles with measurable reads and no qualified evaluation. That is a destination problem first (§6), a topic problem second |

### X — **SECONDARY**

| | |
| --- | --- |
| **Primary audience** | P1, S4, C1 — engineers, and the people who repeat things |
| **Channel job** | Technical credibility in public, and replies. This is where being visibly rigorous compounds |
| **Best content** | Pillars **G** (a caught bug), **F** (platform idioms), **B**. Single sharp observations; threads only where there is a real sequence |
| **Bad fit** | Nuance · anything requiring a caveat to be true · a shortened LinkedIn post |
| **Cadence** | **1–3 assets a week**, plus replies. Replies matter more than posts here |
| **CTA style** | **Usually none in the post.** See §4 for link placement |
| **Attribution** | `utm_source=x` · medium `social` |
| **Success signal** | Replies from named engineers; a thread quoted rather than liked. Qualified Evaluation from `x` will be low and that is expected |
| **Stop / reduce** | Reduce if it becomes a posting chore with no conversation. Do not stop for low reach — X reach on a new technical account is low for months |

### GitHub — **SECONDARY, conversion not feed**

| | |
| --- | --- |
| **Primary audience** | Everyone who arrived from somewhere else and is now checking whether this is serious. Plus C1 |
| **Channel job** | Convert interest into belief. It is the destination that decides whether the rest worked |
| **Best content** | The repository itself · Releases with real notes · Discussions answers · the README's first screen |
| **Bad fit** | Posting. There is no feed here. A manufactured commit or issue is worse than silence |
| **Cadence** | Event-driven: a Release when [`github.md`](./github.md) §2 says one is warranted; a Discussions reply within 24h |
| **CTA style** | The README's own CTA. Outbound links carry `utm_source=github` |
| **Success signal** | `kx_source=github` sessions reaching Qualified Evaluation at a **higher** rate than social — they arrived already interested |
| **Stop / reduce** | Not applicable. GitHub is not a channel you stop; it is where the product lives |

### Reddit — **EXPERIMENTAL, contribute only**

| | |
| --- | --- |
| **Primary audience** | S4 (mobile engineers), P2, P1, depending on the subreddit |
| **Channel job** | Answer a real question better than anyone else in the thread. Discovery is a side effect |
| **Best content** | A substantial comment carrying pillar **B** or **F** knowledge, in an existing thread |
| **Bad fit** | Text posts about KinetixUI · launch announcements · anything with a link as its point |
| **Cadence** | **Opportunistic.** No scheduled Reddit post exists and none should. Never the same idea in three communities in one week |
| **CTA style** | **None.** A link only when it is the shortest path to something the reader specifically asked for, and then untagged |
| **Attribution** | **Deliberately none** — see §5. Reddit traffic arriving without a tag classifies as `reddit`/`community` from the referrer alone |
| **Success signal** | The comment is upvoted or replied to *on its own merit*. Someone asks a follow-up |
| **Stop / reduce** | Any moderator action, or a comment removed. Stop in that community and record why in `research/` |
| **Blocking condition** | **`LIVE RULE CHECK REQUIRED`** for every subreddit. See §5 |

### Design-system communities — **EXPERIMENTAL**

| | |
| --- | --- |
| **Primary audience** | **P1 primary**, S1, S2 — the highest-alignment audience that exists for this product |
| **Channel job** | Be a useful participant among people who already have the vocabulary. This is the only channel where "verification is the product" needs no explanation |
| **Best content** | Pillars **A**, **C**, **D**. The reporting-decision argument (COM-004) is the single best fit we have |
| **Bad fit** | Product introductions · anything implying the reader's current system is naive |
| **Cadence** | Genuine participation, not a schedule. Read for a fortnight before contributing |
| **CTA style** | None. Answer, disclose the bias, link only on request |
| **Attribution** | **Community-dark.** Slack and Discord referrers classify as `other`. Accepted — see §5 |
| **Success signal** | Being asked a follow-up question, or asked for the repository unprompted |
| **Stop / reduce** | Reduce if the conversation is design-tooling rather than engineering — the audience overlaps less than the name suggests |

### Frontend communities — **EXPERIMENTAL**

| | |
| --- | --- |
| **Primary audience** | S1, P1, C1 |
| **Channel job** | Establish that the engineering is real, in rooms where the React story alone is unremarkable |
| **Best content** | Pillars **C** and **G**. The registry-defect story (COM-003) carries with zero product context |
| **Bad fit** | Pillar A framed as a product claim · "another component library" positioning. `STRATEGY.md` §6 is explicit that the React library is our least differentiated artefact |
| **Cadence** | Opportunistic |
| **CTA style** | None |
| **Success signal** | The *class of bug* gets discussed without us steering it |
| **Stop / reduce** | Reduce quickly. This audience is large, adjacent and mostly not our buyer |

### Mobile communities — **EXPERIMENTAL, highest upside**

| | |
| --- | --- |
| **Primary audience** | **S4**, P2 — engineers handed web design decisions and asked to match them |
| **Channel job** | Own the native half of the token conversation, which is genuinely under-served |
| **Best content** | Pillar **B** only. Token generation, the primitive/semantic split, the theme-adapter pattern |
| **Bad fit** | Component claims · anything implying the native libraries are installable — **they are not on any registry** (`CLAIMS.md` C3) · any suggestion that KinetixUI substitutes for platform expertise |
| **Cadence** | Opportunistic |
| **CTA style** | None. If asked for an example, the committed generated token artefacts — they read without installing anything |
| **Attribution** | `reddit` from the referrer where applicable; otherwise community-dark |
| **Success signal** | A native engineer engaging with the *pipeline*, not the components |
| **Stop / reduce** | Stop in any community that reads a token-architecture comment as promotion |

### Not now — and why

| Channel | Verdict | Reason |
| --- | --- | --- |
| Reddit self-promotion threads | **NOT NOW** | Audience is other builders; format rewards screenshots over substance |
| Hacker News **submissions** | **NOT NOW** | Two viable stories exist (`../community.md`), both for a substantial launch. A weak first submission is spent permanently. HN *comments* on relevant threads are in scope |
| Product Hunt | **AFTER BASELINE** | [`../launches.md`](../launches.md) §Product Hunt |
| YouTube / video | **NOT NOW** | Three motion shot lists exist unproduced (`../content/motion-briefs.md`). Production cost per asset is wrong for month one |
| Newsletter | **NOT NOW** | Nothing to send it to. Revisit at launch Stage 3 |
| Paid anything | **NOT NOW** | No baseline. Paid reach into an unmeasured funnel buys nothing but a number |

**No account is created because a channel exists.**

---

## 3. LinkedIn distribution

**Ten finished posts exist** (LI-001 … LI-010). This is how they go out.

**Cadence.** One or two a week, on the days in `../content/calendar.md`. Two posts in a day halves both.
LI-002 is explicitly held ~3 weeks after LI-001 — it is the same argument re-angled and posting it early
reads as repetition.

**When to use a visual.** Attach the generated card when the post's argument is *structural* — something with
parts and arrows. VIS-001 (drift), VIS-002 (manifest → surfaces), VIS-003 (token architecture), VIS-006
(coverage), VIS-007 (ladder), VIS-008/VIS-009 all qualify. The mapping is in
`../content/visuals/manifest.json` under each asset's `content` field.

**When text-only is stronger.** When the post *is* a story — the registry defect (LI-006), the reporting
decision (LI-008). A diagram beside a narrative competes with it. LI-006 has no visual on purpose: VIS-004
was deferred rather than shipped weak, and the post reads fine without it.

**A post ships without its visual rather than late.**

**Comment and reply workflow.** See §8. Specific to LinkedIn: reply to every substantive comment; reply to
*no* one-word comments; never post a comment on your own post to boost it.

**Follow-up behaviour.** If a post produces a real question, the answer is the next asset's raw material, not
a second post the same week. Route it per §8.

**Article repurposing.** An article gets **one** LinkedIn post, not a serialisation. ART-002 → LI-005.
ART-001 → LI-001, and LI-002 three weeks later. That is the ceiling.

**P1/P2 sequencing.** Week 1's pair is the experiment: LI-003 (P2, drift-led) on day 1, LI-004 (P1,
architecture-led) on day 4. 48 hours apart, different campaigns, **no cross-linking**, same destination. Do
not mention one in the other — that contaminates the only clean comparison in the month.

**Hashtags.** A small policy, because hashtag walls read as marketing. **Three, maximum, at the end,
all genuinely descriptive**: `#designsystems` always, plus at most two from `#designtokens`,
`#frontend`, `#accessibility`, `#swiftui`, `#jetpackcompose`, `#flutter`, `#angular` — whichever the post is
actually about. Never `#tech`, `#innovation`, `#buildinpublic`, or any hashtag naming the product.

**Never:** engagement pods · mass tagging · a question you do not want answered · comment bait ·
*"thoughts?"* endings · DM promotion · reposting your own post for a second impression.

---

## 4. X distribution

**Eleven finished assets exist** (X-001 … X-011). X is not LinkedIn with fewer characters — six of the nine
new assets have no LinkedIn counterpart at all.

**Cadence.** One to three a week. Replies are the point; posts are the excuse to be in the conversation.

**Single posts** are the default: X-003, X-005, X-007, X-009, X-010, X-011. One observation, no wind-up.

**Threads** only where there is a real sequence — X-004 (5 posts), X-006 (6), X-008 (4), plus the two
existing threads X-001 and X-002. A thread that could be one post should be one post.

**Link placement — the decision worth writing down.** Most X assets carry **no link in the post**: the
calendar's CTA column says `—` for X-005, X-003, X-007, X-009 and X-011, while `register.json` still holds a
tagged URL for each. Both are right, and the resolution is placement:

> **The post carries the argument. The tagged URL goes in the first reply**, when it goes anywhere.

For threads, the link goes in the **final** post, where someone who read the whole thing will find it. Never
mid-thread.

**Visual use.** One card, on the opening post only. A thread with an image on every post reads as an
advertisement.

**Technical observations** are the highest-value X content we have and they are not all on the calendar. A
check that caught something this week is a legitimate unplanned post, provided the number is re-derived
from `pnpm marketing:stats` on the day. It belongs to pillar G and it gets logged in `register.json` like
anything else.

**Reply participation.** Replying usefully to other people's threads about design systems, tokens and
cross-platform work is worth more here than any post. It is unattributable and it is still the best use of
the channel.

**P1/P2 testing on X is secondary.** The campaigns carry the ICP hypothesis (X-005 is `kx_p2_*`, X-003 is
`kx_p1_*`), but X volumes will be too small to compare. LinkedIn owns the experiment; X contributes rows.

**Never:** cross-posting LinkedIn copy verbatim · engagement-bait openers (*"A thread 🧵"* as the hook) ·
quote-tweeting yourself · reply-guy behaviour on unrelated accounts.

---

## 5. Community participation, and what we cannot check from here

Per-community assessment — candidates, fit classification, what we can teach, whether a link is
necessary, promotion risk — lives in [`../community.md`](../community.md). The four finished contribution
briefs are [`../content/community-briefs.md`](../content/community-briefs.md).

### `LIVE RULE CHECK REQUIRED` — verified, not assumed

**No community's rules were read in producing this phase, and none could be.** This container's network
policy denies them. The proxy answered `403` to `CONNECT www.reddit.com:443` and `CONNECT
old.reddit.com:443`, and `news.ycombinator.com`, `dev.to` and `linkedin.com` were equally unreachable.

Therefore **no rule is quoted, paraphrased or assumed anywhere in this phase.** Every community carries
`LIVE RULE CHECK REQUIRED`, and the standing assumption is the safe one:

> **Assume promotion is not allowed until the current rules say otherwise.**

Read the sidebar, the rules page and recent moderator notes before posting anywhere. A removed post costs
more than the post was worth, and a moderator ban is permanent in the community that matters most.

### Community-dark traffic — a known limitation, accepted

Community channels are deliberately **unattributed**:

- Comments carry **no tagged link**. Dropping a `utm_campaign` URL into someone else's thread is the instinct
  this project should not have.
- Slack and Discord referrers classify as **`other`** — they are not in `ATTRIBUTION_SOURCES`.
- Hacker News is **not in the attribution vocabulary either**, so an HN referral also lands in `other`.

This is a real gap in the measurement and it is the right trade. We will not know what community
participation produced, beyond a rise in `other` and `direct` that coincides with it.

**The review trigger that would change it:** if HN ever becomes a deliberate *submission* channel with a
tagged link — which `../launches.md` puts at Stage 4, not month one — add `hackernews` to
`ATTRIBUTION_SOURCES` **then**. Adding a source nothing will tag is machinery pretending to be measurement.

---

## 6. Content promise → destination proof

**Do not send everything to `/`.** The destination is chosen by what the content promised. Every route below
was verified to exist in `apps/web/src/app`.

| The content is about | Destination | Why that page |
| --- | --- | --- |
| Coverage, parity, verification, drift, denominators | `/docs/platforms` | The coverage table with its documented exceptions. The claim, checkable |
| Tokens, DTCG, the web boundary, the smallest way in | `/docs/tokens` | The token contract, and the only page where token-only adoption is the subject |
| The catalogue, native implementations, the two trades | `/components` | 98 entries with per-platform availability |
| What the CLI installs, the dependency story | `/docs/installation` | Rewritten in Phase 0.9.1 to describe what actually gets installed |
| Blocks, composed patterns | `/blocks` | Analytics source `blocks_gallery`, added in Phase 3 |
| Direction-awareness | `/docs/rtl` | The evidence fraction for each implementation, including the zeros |
| Contrast gates, axe in a browser | `/docs/accessibility` | Evidence, never the word *compliant* |
| Angular | `/docs/angular` | The only page where published-**and**-preview travel together |
| SwiftUI · Compose · Flutter | `/docs/swiftui` · `/docs/compose` · `/docs/flutter` | **No install command.** Source you compile |
| Device and fleet interfaces | `/iot`, `/docs/iot` | Pillar E's only surfaces |
| A release | `/docs/changelog` | The core line, with per-package versions kept separate |
| Contributing | `/docs/contributing` | Canonical; `CONTRIBUTING.md` points here rather than duplicating |

**Platform-specific rule.** A post about SwiftUI sends a reader to `/docs/swiftui`, not `/components` — and
that page must not grow an install command to make the CTA feel stronger. `marketing-claims.test.ts` fails
the build if one appears.

**The month's four destinations** are `/docs/platforms`, `/docs/tokens`, `/components` and
`/docs/installation`. The rest of this table is for month two and for unplanned posts.

---

## 7. The open-source discovery loop

```
        CONTENT                    (an argument, with a fact in it)
           │
           ▼
   GITHUB / PRODUCT                (the reader checks whether it is real)
           │
           ▼
      EVALUATION                   Qualified Evaluation — analytics.md §3
           │
           ├──► STAR / WATCH       context, not a metric
           ├──► DISCUSSION         a question we did not anticipate
           └──► ADOPTION INTENT    analytics.md §4
           │
           ▼
       LEARNING                    research/YYYY-MM-DD.md
           │
           ▼
    BETTER CONTENT                 the question becomes the next asset
```

**The loop closes at LEARNING or it is not a loop.** The mechanism is concrete: a recurring question becomes
a documentation change and an asset (`../community.md` §Feedback loop — the Flutter token-only request is the
worked case, start to end).

**Stars are context, not a success metric.** The repository has 2 stars and 0 forks today. A star costs one
click from someone who will never install anything; Qualified Evaluation costs someone opening the product.
We will record stars weekly because the *shape* of the curve against posting dates is informative, and we
will never report them as a result. `analytics.md` §6 Tier 1 has no star count in it and should not grow one.

---

## 8. Response and engagement workflow

What Ziad does after publishing. Deliberately not real-time monitoring: this is one person who also maintains
the product, and a channel that demands constant attention is a channel we cannot afford.

| Window | Do | Do not |
| --- | --- | --- |
| **0–24 hours** | Reply to substantive questions and to anyone who disagrees with a reason. One check in the morning, one in the evening | Sit in the notifications. Reply to one-word comments. Argue |
| **24–72 hours** | Capture objections and confusion — *what did someone misread?* Misreading is a messaging defect, not a reader defect | Edit the post to defend it |
| **Weekly** | Feed recurring questions into content or docs. Fill the distribution block in [`../weekly-review.md`](../weekly-review.md) and append results to `register.json` | Report a rate. No baseline until `analytics.md` §10 closes |
| **Monthly** | Channel keep / reduce / stop decisions, per §10 | Drop a channel on one weak week |

### Where feedback goes

| Kind | Goes to | Because |
| --- | --- | --- |
| **Message confusion** | `../research/YYYY-MM-DD.md`, then `../MESSAGING.md` if it recurs | Wording is canonical; one person's misreading is not yet evidence |
| **Product question** | Answer publicly. If asked twice, it is a docs gap — open an issue against the docs page | The second time makes it a pattern |
| **Objection** | `../MESSAGING.md` §4 objection system, if it is not already there | The objection table exists to be extended by reality |
| **Bug** | A repository issue, with the reporter credited. Never a marketing note | A bug in `research/` is a bug nobody will fix |
| **Feature request** | `../roadmap.md` if it recurs; otherwise `../research/` with the link. **Never** promised in a reply | `STRATEGY.md` §8.7 — we do not tease what does not exist |
| **Content request** | `../content/backlog.json` with `sourceFeature` naming the evidence | A request with a name attached beats an idea |

**Anything said three times is a roadmap item.** Once is noise (`../community.md`).

**No AI-generated reply goes out unread.** A reply that misreads someone in public costs more than silence.

---

## 9. Social listening without tool bloat

**Manual, 30–45 minutes, one sitting a week.** No listening software, no alerts product, no purchase. The
routine and its source table live in [`../community.md`](../community.md) §Weekly research process; the
topics to search are:

`cross-platform design system` · `design tokens` · `DTCG` · `design token pipeline` ·
`React native consistency` (the phrase, not the framework) · `SwiftUI design system` ·
`Compose design system` · `Flutter design system` · `design system drift` · `theme adapter` ·
`Style Dictionary`

**A signal is the same problem stated three times by three people.** One complaint is noise.

**Never automate an unsolicited reply.** Searching for a phrase and replying to strangers with a product is
spam regardless of how relevant the match was. What listening produces is *content ideas* and *evidence*,
captured in `research/` — not a reply queue.

---

## 10. Stop rules

A channel is reduced or stopped on evidence, and the evidence bar is deliberately high — we have no baseline,
so most early signals are noise (`analytics.md` §10).

### Reduce or stop when

| Condition | Action |
| --- | --- |
| **Repeated zero qualified evaluation** despite a meaningful sample — ≥4 assets with real reach, across ≥2 review cycles | **REDUCE.** Halve the cadence, change the destination first (§6), then the framing |
| **Audience mismatch confirmed by conversation** — the replies are consistently from people who are not P1, P2 or any secondary persona | **REDUCE.** Keep one asset a month to stay present |
| **Community resistance** — a moderator action, a removed post, or hostile replies to a genuine contribution | **STOP in that community immediately.** Record what happened in `research/`. Do not appeal |
| **High effort, no learning** — the channel costs disproportionate time and produces neither arrivals nor questions | **STOP.** Effort is the scarce resource here, not reach |
| **Format mismatch** — the channel's native format cannot carry the pillar without making it untrue | **STOP** posting that pillar there. Not the channel |

### Do **not** stop for

- **One weak post.** The commonest error, and it usually reveals a destination problem.
- **Small initial reach.** A new technical account is quiet for months. This is expected, not a signal.
- **A single negative comment.** A reasoned disagreement is the most useful reply we can get; it is often the
  next objection-table row.
- **A week with no posts.** The calendar is deliberately slack enough to lose one.

**No numerical threshold is set**, on purpose. "Stop below a 2% conversion rate" against no baseline is a
number invented to be met. The thresholds above are *sample-shaped* (≥4 assets, ≥2 cycles), which is the only
honest form available before `analytics.md` §10's window closes.

---

## 11. The P1 / P2 distribution test

Two ICP hypotheses, one open question: `STRATEGY.md` §2's ranking puts P1 and P2 both primary, and
`analytics.md` §9 keeps the winner undeclared.

**Not simply P1 to engineers and P2 to designers.** The hypothesis travels in the *argument*, and the
argument decides where it is most naturally tested:

| Hypothesis | Argument | Tested best on | Why there |
| --- | --- | --- | --- |
| **P1** — architecture-led | *"A claim should be checkable"* — the manifest, the check, the denominator | **LinkedIn** (LI-004, LI-008, LI-010) and **design-system communities** | The only audiences for whom verification-as-product is immediately legible rather than an oddity |
| **P2** — drift-led | *"Six months later, they don't"* — drift as a mechanism problem, tokens as the smallest way in | **LinkedIn** (LI-003, LI-005, LI-009) and **mobile communities** | The people living the pain without the vocabulary for it. Mobile communities are where the pain is described most concretely |
| **NEUTRAL** | The engineering itself | **X** and **dev.to** | Where the reader self-selects, and no ICP framing is doing work |

**The clean test is week 1, on one channel.** LI-003 (P2) day 1 against LI-004 (P1) day 4 — same channel,
same destination, 48 hours apart, no cross-linking. Same-channel is the whole point: comparing a P1 post on
LinkedIn against a P2 comment on Reddit measures the channel, not the message.

**Two further contrasts run across the month:** F2 (tokens, P2-led) against F3 (parity, P1-led), and F1's
drift framing against F5's evidence framing.

### What we track, in order

1. `kx_p1_*` vs `kx_p2_*` **attributed sessions** — context only.
2. **Qualified Evaluation Rate** per prefix — the first number that means anything.
3. **Adoption Intent Rate** per prefix.
4. **Which ladder rung** (`adopt_tokens` vs `adopt_components`) — the most interesting signal available,
   because it is behaviour rather than a click.

**Never decide on impressions.** A P2 post outreaching a P1 post tells us LinkedIn's algorithm liked a
sentence. And per `analytics.md` §9, the honest framing is *"P2-attributed sessions evaluate at a higher
rate"* — **never** *"P2 is our ICP"*. The month is P1-skewed 15:8:4 by inheritance, which weakens the
comparison and is stated rather than corrected.

---

## 12. Community safety and trust

Non-negotiable. The long-term goal is reputation; every rule below trades a short-term click for it.

1. **Never pretend to be an unaffiliated user.** No alt accounts, no "I found this useful library".
2. **Never hide that Ziad builds KinetixUI** where it is relevant. *"I build KinetixUI, so I have a bias
   here"* costs nothing and buys everything.
3. **Never mass-post identical content.** Not across subreddits, not across channels. Each version is
   adapted or it is not posted.
4. **Never post a product link where the rules prohibit it** — and assume they do until read (§5).
5. **Never fabricate usage or customer stories.** There are no users. No invented counts, testimonials,
   benchmarks or anecdotes — including a plausible-sounding *"a team told me…"*.
6. **Never manipulate votes.** No asking for upvotes, no voting rings, no coordinated timing.
7. **Never DM a stranger with unsolicited promotion.** Outreach is one-to-one, disclosed and about
   something specific — see [`outreach.md`](./outreach.md).
8. **Never publish an AI-generated reply without reading it.** Drafting help is fine; unreviewed output in
   someone else's thread is not.

**No tool in this repository posts anything anywhere**, and none will. Publishing is a human action.

---

## 13. Automation

Classified by whether automation makes the thing *safer* or merely faster.

### AUTOMATE NOW — exists, or is one small script

| What | Status | Why it is safe |
| --- | --- | --- |
| **Campaign URL generation and validation** | **Exists** — `pnpm check:content`, and `register.json` holds every built URL | A malformed campaign is *dropped silently* by the runtime. The check is the only thing standing between that and a month of unattributable posts |
| **Distribution register validation** | **New this phase** — `pnpm check:distribution` | Catches a logged row naming an asset, channel, destination or campaign that does not exist, before it becomes a false record |
| **Content register validation** | **Exists** — `pnpm check:content` | Structural, mechanical, no judgement |
| **Product number re-derivation** | **Exists** — `pnpm marketing:stats` | The only cleared source for a public number |
| **Destination existence checking** | **New this phase**, inside `check:distribution` | A CTA pointing at a route that does not exist is a 404 in a post that cannot be edited |
| **Visual regeneration** | **Exists** — `pnpm gen:visuals && pnpm render:visuals` | Numbers in images go stale silently |

### AUTOMATE LATER — with a named trigger

| What | Trigger |
| --- | --- |
| **Weekly analytics summary** | Once the PostHog dashboard exists and has ≥4 weeks of data. Automating a summary of an empty dashboard produces a report nobody reads |
| **Stale-screenshot detection** | Once `.github/assets/home.png` has gone stale twice. It has gone stale once |
| **Broken-link sweep over published assets** | Once there are enough published links that checking them by hand is unreliable — roughly month three |

### KEEP HUMAN — permanently

| What | Why |
| --- | --- |
| **Publishing** | Auto-publishing is how an unverified claim reaches an audience while nobody is looking |
| **Community replies** | A reply is a relationship. Automating it is the behaviour every community bans |
| **Reddit posting** | See above, plus the rules are unread |
| **Outreach** | A template is fine. Sending it without reading the recipient's work is cold spam |
| **Claim approval** | `CLAIMS.md` judgement. A check can catch a stale version; it cannot decide whether a sentence is honest |
| **Scheduling** | A queue posts a number that was true when it was queued |
| **Deciding what a metric means** | `analytics.md` §10's evidence ladder is a judgement, deliberately |
| **Anything resembling engagement** | Likes, follows, votes, replies-for-reach |

**Nothing large is built in this phase.** One validation script, because a register that agrees only with
itself is a second source of truth wearing a validator — the exact failure Phase 4 caught in its own work.

---

## 14. Weekly distribution review

Connected to Phase 3, not a second ritual. The block lives in
[`../weekly-review.md`](../weekly-review.md) and captures land in `../research/YYYY-MM-DD.md`.

Reviewed weekly:

- **Assets distributed**, by channel — from `register.json`
- **Attributed sessions** per `kx_source` and per `kx_campaign` — absolute counts
- **Qualified evaluations** and **adoption intent** — absolute counts (`analytics.md` §3, §4)
- **Content → Qualified Evaluation** — campaign-attributed vs direct
- **P1 vs P2** — counts per prefix, with no winner declared
- **Platform interest** — `platform_selected` by platform
- **Meaningful replies and questions** — the number that is a person, not an event

Each line resolves to exactly one of:

| Verdict | Means |
| --- | --- |
| **KEEP** | Under ~30 qualified evaluations in the comparison. This is noise. Change nothing |
| **INVESTIGATE** | A directional gap that has persisted across 2+ cycles. Look for a mechanism |
| **TEST** | A mechanism plus a repeated pattern. One change, stated in advance |
| **CHANGE** | A tested change that held, or qualitative feedback agreeing with the behaviour |

**Never optimise on likes.** `analytics.md` §2's one rule: a metric that cannot change a decision does not
belong on the scorecard.
