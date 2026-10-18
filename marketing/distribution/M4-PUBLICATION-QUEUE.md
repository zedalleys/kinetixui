---
type: publication queue
window: Monday 2026-10-19 to Friday 2026-10-23
prepared: 2026-10-18 (M4), on `main` @ `984792b`
status: nothing here is published, scheduled or approved by preparing it. Every post goes out by hand, by the owner
---

# M4 publication queue — LI-001, X-001, LI-008, X-008

One section per asset, each complete on its own. The dates are the ones in
[`execution-calendar.md`](./execution-calendar.md); the identities, campaigns, destinations and tracked URLs are
read from the two registers rather than restated from the brief, and where the brief and a register disagreed, the
difference is named.

## The three states, and what they mean

| State | What it says |
| --- | --- |
| **READY TO PUBLISH** | Copy approved and pinned, claims re-checked, tracked link verified, attribution gate closed. Only the owner's own posting remains |
| **READY WITH NOTES** | Everything verifiable is verified, and one named thing is outstanding — an approval reply, or an ordering dependency on another post |
| **BLOCKED** | Something has to change that posting cannot change: a setting, an edit on a third-party site, a missing fact |

| Asset | Date (UTC / Riyadh) | State | The one outstanding thing |
| --- | --- | --- | --- |
| **LI-001** | Mon 19 Oct, 14:00 / 17:00 | **READY TO PUBLISH** | Nothing gating. One optional owner decision: the stale "today" paragraph in the dev.to article it links to |
| **X-001** | Tue 20 Oct, 15:00 / 18:00 | **READY WITH NOTES** — ready for owner approval | The owner's approval reply, and LI-001 live the day before |
| **LI-008** | Thu 22 Oct, 14:00 / 17:00 | **READY WITH NOTES** — ready for owner approval | The owner's approval reply |
| **X-008** | Fri 23 Oct, 15:00 / 18:00 | **READY WITH NOTES** — ready for owner approval | The owner's approval reply, and a link check the day after posting |

Approving all three outstanding assets is one reply in the thread. The decision packet, with the exact copy and the
pins, is [`../content/drafts/m3/APPROVAL-QUEUE-2026-10-20.md`](../content/drafts/m3/APPROVAL-QUEUE-2026-10-20.md);
this file does not repeat the copy, so there is one place to read it and one place it is pinned.

## Register reconciliation done for this window

- **Day offsets versus this window's dates.** The content register's day offsets are the 30-day campaign's slots
  (day 1 = 2026-09-29): LI-001 day 16, X-001 day 17, X-008 day 18, LI-008 day 20. Four of them have passed. The
  execution calendar re-sequences them into 19–23 October **without renumbering anything**, which is why X-008
  (day 18) is posted after LI-008 (day 20): LinkedIn leads its family, and X-008's sibling LI-007 is already out.
- **Two missing distribution rows added.** LI-008 and X-008 had entries in the content register and slots on the
  calendar but no row in [`register.json`](./register.json), so nothing would have carried their tracked link,
  link placement or metric to watch. Both are added as `planned`, with no date and no result —
  `check:distribution` re-derives every field from the content register and passes (17 rows, 8 published).
- **Nothing was marked published.** No live URL exists for any of the four, so all four stay `planned`.

---

## 1. LI-001 · LinkedIn · Mon 19 Oct, 14:00 UTC / 17:00 Riyadh

| | |
| --- | --- |
| Final copy | [`../content/drafts/a01/linkedin.md`](../content/drafts/a01/linkedin.md) § **A — default**, 1,538 characters, pasted unchanged. Pinned in the content register (`LI-001.approval.copy`, sha256 `09a3994…3cfb`); `check:content` fails if one word changes |
| Destination | the dev.to article in the post body; `/docs/platforms` as the first comment |
| Tracking URL | `https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=li_primary` |
| Target audience | P1 — design-system engineers working across several platforms (`icp: p1`) |
| Positioning pillar | Primary: cross-platform design system infrastructure. Pillar **a** |
| Approval status | **APPROVED 2026-10-18** by the owner, editorial only. Not published. Publishing is the owner's own act |
| Claims | The copy quotes historical figures in the past tense only, so nothing in it can drift. Re-checked 2026-10-18: `verify-package.mjs` reports no stale current-state figure in `linkedin.md` |
| Attribution gate | **CLOSED 2026-10-18 19:07 UTC.** See below |

**The gate, and exactly what it proves.** The owner's diagnostic visit at 19:07 UTC arrived in PostHog 620385 as
`$pageview` 19:07:22.944, `docs_viewed` 19:07:22.946 and `page_engaged` 19:07:29.248, each carrying kx_source
**linkedin**, kx_medium social, kx_campaign kx_p1_a_parity_proof, kx_content li_primary, landing
`/docs/platforms`, kx_traffic_type diagnostic (session `01a15069-53d6-788a-a041-498cefb22366`, Chrome on macOS).
Read from PostHog independently by two threads. It proves the tracked LI-001 link delivers the whole attribution
quartet from kinetixui.com. It does **not** prove the earlier failure is fixed: that visit was iOS Safari, this one
was desktop Chrome, nothing was deployed between them, and PR #409 is unmerged and does not claim to fix it. The
earlier failed diagnostic (10:30 UTC, `kx_source=other`) stands in the record as evidence. Full history, both
corrections in order: [`../content/drafts/m2/LI-001-publish-packet.md`](../content/drafts/m2/LI-001-publish-packet.md) §4.

**The publishing sequence, in order.** Nothing here is automated; each step is the owner's own.

1. Post section A unchanged on LinkedIn, at about 14:00 UTC. The copy was re-hashed on `984792b` and still
   matches its pin: 1,538 characters, sha256 `09a3994…3cfb`.
2. Immediately add the tracked `/docs/platforms` URL as the **first comment**, in full. It carries no `kx_traffic`
   parameter: that mark belongs only to the owner's diagnostic visits, never to a public link.
3. Copy the post's own URL (it contains `/feed/update/urn:li:activity:` or `/posts/`).
4. Close out both registers from that URL — `status: "published"`, the real date, `liveUrl`, and a first result
   line of absolute counts only. Until that is done with a real URL, LI-001 is approved, not published.
5. Start the post-publication checklist at T+1 hour
   ([`../measurement/M4-POST-PUBLICATION-CHECKLIST.md`](../measurement/M4-POST-PUBLICATION-CHECKLIST.md)).

**The one optional decision.** The post sends readers to ART-001 on dev.to, whose "today" paragraph still says 98
catalogue entries and Angular 64; both are now 109 and 80. It **understates** current coverage rather than
overstating it, and the LinkedIn copy quotes none of those figures, so it is not a launch blocker. Updating that
paragraph before Monday is the better outcome; posting as is costs a reader seeing figures five weeks behind.
Correction text ready to paste: [`../content/drafts/m3/ART-001-CORRECTION.md`](../content/drafts/m3/ART-001-CORRECTION.md).

## 2. X-001 · X thread · Tue 20 Oct, 15:00 UTC / 18:00 Riyadh

| | |
| --- | --- |
| Final copy | [`../content/drafts/a01/x-thread.md`](../content/drafts/a01/x-thread.md), the whole file after its front matter: posts 1–9 and standalone posts A–D. Pin if approved: sha256 `38796bd…2642`, no section, so editing any standalone post later needs a fresh approval |
| Destination | the dev.to article in post 9; the tracked `/docs/platforms` link as the first reply under post 9 |
| Tracking URL | `https://kinetixui.com/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=x_thread` |
| Target audience | P1 — multi-platform design-system engineers |
| Positioning pillar | Primary: infrastructure. Pillar **a** |
| Approval status | **READY FOR OWNER APPROVAL.** Recommended: approve, post only after LI-001 is live |
| Claims | Every figure historical and pinned to a commit, except "six of a hundred-odd so far": 6 of **113** demo keys today, which `verify-package.mjs` flags against its own `< 110` bound. "A hundred-odd" at 113 is a judgement call, not a wrong number; the alternative is re-pinning the copy for a word |

Same campaign as LI-001 with a different `utm_content`, which is what separates the two posts' arrivals. X can wrap
or strip the reply link, so no tagged session afterwards means "no tagged arrival observed", never "no clicks".

## 3. LI-008 · LinkedIn · Thu 22 Oct, 14:00 UTC / 17:00 Riyadh

| | |
| --- | --- |
| Final copy | [`../content/linkedin.md`](../content/linkedin.md) § **LI-008**, campaign line to closing `---`. Pin if approved: sha256 `2584e24…6491` |
| Destination | `/docs/platforms` |
| Tracking URL | `https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_d_partial_evidence&utm_content=li_primary` — paste it in place of the bare URL on the last line. The pin covers the bare URL, so the swap at posting time does not break it |
| Target audience | P1 — design-system engineers. Message: a partial count is not a tick |
| Positioning pillar | Primary: infrastructure, verification as published evidence. Pillar **d** |
| Visual | VIS-006, regenerated 2026-10-17 from the generator (109 / Angular 80) |
| Approval status | **READY FOR OWNER APPROVAL.** Recommended: approve |
| Claims | Re-run 2026-10-18 against `pnpm marketing:stats`: direction-aware testing "from most of the catalogue on one platform to a single component on another, and none at all on a third" holds — Flutter RTL 58/90, Compose 1/90, SwiftUI 0/90. "Contrast is gated in CI" and "accessibility checked in a real browser across the site and every Storybook story" are `CLAIMS.md` B-claims with live gates (`check:contrast`, `check:a11y-site`, `check:a11y-browser`). The copy quotes no number, so the fractions moving does not stale it |

First post on `kx_p1_d_partial_evidence`, so there is no earlier arrival on this campaign to compare against.

## 4. X-008 · X thread · Fri 23 Oct, 15:00 UTC / 18:00 Riyadh

| | |
| --- | --- |
| Final copy | [`../content/x.md`](../content/x.md) § **X-008**. Pin if approved: sha256 `1444496…6ccd` |
| Destination | `/components` |
| Tracking URL | `https://kinetixui.com/components?utm_source=x&utm_medium=social&utm_campaign=kx_p2_f_two_trades&utm_content=x_thread` — paste it in place of the bare URL in post 4 |
| Target audience | P2 — product teams shipping web and native |
| Positioning pillar | Secondary: multi-platform component library, with the infrastructure argument underneath. Pillar **f** |
| Visual | VIS-005. Known nit: its alt text says "presented as equals" while one column is accent-styled — fix the alt text when posting |
| Approval status | **READY FOR OWNER APPROVAL.** Recommended: approve, and check the link the day after |
| Claims | Re-checked 2026-10-18: "five implementations" holds (React 109, Angular 80, SwiftUI / Compose / Flutter 90 each). "An Angular button is a directive on a real HTML button" holds (`packages/ui-angular/src/lib/button.ts`, `@Directive({ selector: 'button[kxButton], a[kxButton]' })`). "We publish the gaps" holds: `/docs/platforms` lists the 19 documented exceptions with reasons. The copy does not call Angular complete |

Its LinkedIn sibling LI-007 shares this campaign and produced no tagged audience arrival, so the `x_thread` content
tag is the only thing that will separate this post's arrivals from LI-007's. Watch the tagged `/components` link.

---

## Platform claims: what may and may not be said this window

The boundary matters most for LI-008 and X-008, which argue about verification itself. Figures from
`pnpm marketing:stats` and `verification.json` on `main` @ `984792b`.

| Platform | Implementations | Package | Install | Where the evidence ran |
| --- | --- | --- | --- | --- |
| React | 109 / 109 | stable, published | npm | 61 Build verified, 48 Headless verified, **0 Runtime verified** |
| Angular | 80 / 109 | **preview**, published | npm | 60 Runtime verified, 20 Headless verified, 29 not implemented |
| SwiftUI | 90 / 109 | stable, **not published** | source only | 90 Build verified |
| Jetpack Compose | 90 / 109 | stable, **not published** | source only | 86 Build verified, 4 Headless verified |
| Flutter | 90 / 109 | stable, **not published** | source only | 85 Build verified, 5 Headless verified |

Four rules this window follows:

1. **No platform has a runtime-verified catalogue.** Angular has the most runtime evidence of any platform (60
   components), because its tests run in a real browser. Say "60 of its 80 components", never "Angular is runtime
   verified". No native component has simulator, emulator or device evidence at all.
2. **Angular's evidence tier is not Angular's maturity.** Its package is Preview and its catalogue is knowingly
   incomplete at 80 of 109. A post may say its tests run in a browser; it may not imply the package is finished,
   complete, or ahead of React as a product.
3. **"Available on five platforms" is true; "installable on five platforms" is false.** SwiftUI, Compose and
   Flutter are source you compile. Never show an install command for them.
4. **Fractions, never ticks**, and catalogue verification is the weakest component on a platform, not an average —
   the rule [`/docs/platforms`](https://kinetixui.com/docs/platforms) states about itself.

`/docs/platforms`, where three of these four posts land, says all of this on the page, including "No native
component has simulator, emulator or device evidence yet, so none is Runtime verified". Checked 2026-10-18 against
the page source on `main`: the first comment LI-001 posts quotes the page's own sentence about generated counts
word for word, and it still reads that way.

Capabilities merged today and **not** usable in public claims until a post needs them: #407's Headless verified
tier and #401's Angular block compilation are on `main` but this window's copy does not mention either, so nothing
depends on whether production is serving them yet. #409 is unmerged; nothing refers to it.

## Older and missed content, reconciled against live URLs

| Asset | Register says | Live URL | State |
| --- | --- | --- | --- |
| ART-001 (dev.to, 13 Oct) | published, `stale` | [dev.to/…-may-be-lying-about-parity-4bj0](https://dev.to/zedalleys/your-cross-platform-design-system-may-be-lying-about-parity-4bj0) | Live and the URL is recorded. Its "today" paragraph is five weeks behind (98 / Angular 64 against 109 / 80). Owner decides whether to edit; dev.to is unreachable from this environment and nothing edits it automatically |
| ART-001-PILLAR | brief / planned | none | **BLOCKED.** The pillar-link edit is unconfirmed. The single `art_pillar` arrival (17 Oct 03:51 UTC) matches the suspected-automation fingerprint, so it is not evidence the edit is live |
| ART-002 (dev.to, 6 Oct) | published | [dev.to/…-stop-at-the-web-boundary-4p6a](https://dev.to/zedalleys/your-design-tokens-stop-at-the-web-boundary-4p6a) | Live, URL recorded, closed out |
| LI-007 (12 Oct) | published | the LinkedIn activity URL in the register | Live, URL and exact posting time recorded |
| X-004 (9 Oct) | published | the x.com status URL in the register | Live, URL recorded; posting time derived from the status id, not read |
| LI-003, X-005, LI-004, X-003 | published, `liveUrl: null` | **missing** | Each row carries a `liveUrlGap` saying no URL was recorded at close-out and that nothing is inferred. Only the author can supply them. Rows dated before 2026-10-17, which is why the check still passes |
| LI-005 | **blocked** | n/a | Whether it ever went out is unresolved: the 7 October post the short link pointed at was an IoT post, verified. Nothing is backfilled |
| GH-001 (Wed 21 Oct slot) | drafted | n/a | **BLOCKED.** GitHub Discussions is disabled on the repository. Owner enables it; the numbers are re-derived on the day |
| LI-010, X-002 | drafted, `stale` | n/a | **BLOCKED** by their own figures: both state 98 and Angular 31 as today's. The flag blocks approval until they are refreshed |
| COM-001 … COM-004 | blocked | n/a | Opportunistic only, and each needs a live re-read of that community's rules. Not scheduled |

Nothing above was marked published, unmarked, or given a URL by this pass. No post was published.
