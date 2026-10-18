---
type: owner editorial decisions
window: 20 to 23 October 2026
prepared: 2026-10-18 (M3); supersedes the per-asset tables in ../m2/REVIEW-PACKET-2026-10-19.md, which stays as the record
status: READY FOR OWNER APPROVAL. Nothing here is approved, scheduled or published by preparing it; the owner approves each asset explicitly or it stays unapproved
---

# Approval queue — X-001, LI-008, X-008

One decision per asset. Each section is complete on its own: the exact words, who they are for, what they claim
and the evidence, where they send people, the tracked link, the day, the visual, the risks and a recommendation.

**How to decide.** Reply in the thread with "approve X-001" (or decline, or ask for a change). Claude then adds
`approval: { by, on, evidence, copy }` to that asset in `../../register.json`, using the pin given below, and runs
`pnpm check:content`, which fails if a single word of the approved copy changes afterwards. Approval is editorial
only: every post is published by hand, and closed out only with its own live URL.

All three pins below were re-computed on 2026-10-18 from `main` (`df596cf`) and equal the ones in the M2 packet, so
no copy has changed since it was prepared.

| Asset | Day (UTC / Riyadh) | Recommendation | One-line reason |
| --- | --- | --- | --- |
| X-001 | Tue 20 Oct, 15:00 / 18:00 | **Approve, but post only after LI-001 is live** | Every figure is historical and pinned; it depends on LI-001 going first and points at an article whose "today" paragraph is stale until the owner edits it |
| LI-008 | Thu 22 Oct, 14:00 / 17:00 | **Approve** | Every claim re-checked today against `pnpm marketing:stats` and `CLAIMS.md` B-claims; no figure that can drift is quoted |
| X-008 | Fri 23 Oct, 15:00 / 18:00 | **Approve, with the link check after posting** | Claims hold against source; its LinkedIn sibling LI-007 produced no tagged session, so the link must be watched |

---

## 1. X-001 · X thread · Tue 20 Oct, 15:00 UTC

| | |
| --- | --- |
| Copy | [`../a01/x-thread.md`](../a01/x-thread.md), the whole file after its front matter: posts 1–9 and the four standalone posts A–D. Quoted in full below |
| Audience | P1, multi-platform design-system engineers (`icp: p1` in the register) |
| Core message | A platform matrix is a description of code and decays toward optimism; only checks that can fail (a file exists, it compiles) keep it true |
| Positioning | Primary: cross-platform design system infrastructure (the verification is the product's spine) |
| Destination | ART-001 on dev.to in post 9; the tracked `/docs/platforms` link as the first reply under post 9 |
| Tracked link (reply) | `https://kinetixui.com/docs/platforms?utm_source=x&utm_medium=social&utm_campaign=kx_p1_a_parity_proof&utm_content=x_thread` (the register's built URL; the parser test passes) |
| Visual | Post 6 attaches the code card, `visual-brief.md` asset D, as the file already says |
| Pin if approved | `copy: { file: "marketing/content/drafts/a01/x-thread.md", sha256: "38796bd1c88e715812769ec50fc1a406efe30e331e6cb2dac9f0fe538d3d2642" }` (no `section`: the whole file, so editing a standalone post later also needs a fresh approval) |

**Claims and evidence**

| Claim | Kind | Evidence |
| --- | --- | --- |
| `direction-provider` advertised on SwiftUI, Compose, Flutter with no file | historical | `verify-evidence.mjs`, pinned to a commit (48/48 on 2026-10-17) |
| SwiftUI 91 → 90, Compose 90 → 89, Flutter 91 → 90, all-four 90 → 89 | historical | same; past tense in the copy |
| `KinetixChart` did not exist; `CustomPaint` rationale on a Compose tab | historical | same |
| `KinetixDataColumn` audit miss (param name, trailing lambda) | historical | same |
| "Mine found four more problems" | historical | same |
| "Six of a hundred-odd so far" | **current** | 6 of 113 demo keys today (`verify-package.mjs`). Still fairly "a hundred-odd"; the script's own `< 110` bound flags it |
| "Current coverage is generated from the manifest — edit it by hand and the build fails" | current, structural | `check:platform-source` and the generated coverage in `/docs/platforms` |

**Risks**

- Post 9 sends readers to ART-001, whose "today" paragraph still says 98 / Angular 64. See
  [`ART-001-CORRECTION.md`](./ART-001-CORRECTION.md). Low reputational risk (the thread quotes none of those
  figures) but a reader who clicks through sees outdated current numbers.
- Depends on LI-001 being live the day before. If LI-001 slips, X-001 slips with it.
- X may wrap or strip the reply link; zero tagged sessions afterwards means "no tagged arrival observed", not "no
  clicks".

**Recommendation: approve.** Post only after LI-001 is live, ideally after the ART-001 paragraph is updated.

<details>
<summary>Exact copy (as pinned)</summary>

````markdown
# X — thread (9 posts)

No "🧵👇". Post 1 stands alone if nobody reads on. Every post should still make
sense quoted out of context. Link only at the end.

---

**1/**

I wrote a script to check whether my design system's platform claims were true.

First run: a component we advertised on SwiftUI, Compose and Flutter had no
implementation on any of them.

Not partial. No file.

---

**2/**

The component was `direction-provider`.

Turns out SwiftUI, Compose and Flutter all carry layout direction in the
framework itself:

`environment(\.layoutDirection)`
`LocalLayoutDirection`
`Directionality`

Nothing to port. React-only by design — a better thing to document than a claim
that isn't true.

---

**3/**

Fixing it moved our published numbers down.

SwiftUI 91 → 90
Compose 90 → 89
Flutter 91 → 90
On all four catalogue-complete platforms: 90 → 89

The numbers got worse. The documentation got true.

---

**4/**

A platform matrix isn't code. It's a description of code.

And it decays in one direction: toward optimism.

Nobody forgets to add a platform they just shipped. People forget to remove one
they abandoned — or never started.

---

**5/**

Three levels of verification:

0. the platform name is spelled correctly
1. a source file exists
2. it compiles

Most projects stop at 0 without noticing, because 0 has a script, runs in CI,
and goes green.

---

**6/**

Level 2 found this on our Chart page:

> `KinetixChart` is a hand-drawn CustomPaint bar chart…

`KinetixChart` didn't exist. There was no Chart in our Compose package.

`CustomPaint` is Flutter. The Flutter rationale had been pasted onto an invented
Compose API.

Rendered under a tab labelled "Android".

*[attach: code card, visual-brief asset D]*

---

**7/**

Symbol checking is cheap and catches a lot. It isn't enough.

This passed the audit:

```kotlin
KinetixDataColumn("Invoice", sortKey = { … }) { it.invoice }
```

Wrong class name — caught.
Wrong param name (`rows` vs `data`) — missed.
Trailing lambda binds to `weight: Float`, not `cell` — missed.

Only a compiler catches those.

---

**8/**

The rule I'd actually recommend:

When documentation turns out to be wrong, don't just fix the documentation.

Ask what would have caught it, write that, and run it against everything you've
already published.

Mine found four more problems.

---

**9/**

Examples are migrating into files CI compiles, with the site quoting the
extracted region. Six of a hundred-odd so far.

Current coverage is generated from the manifest — edit it by hand and the build
fails.

https://dev.to/zedalleys/your-cross-platform-design-system-may-be-lying-about-parity-4bj0

---

# Standalone posts

Not thread excerpts. Space them across the following week.

**A.**
A platform matrix is documentation until CI can make it fail.

**B.**
The numbers got worse. The documentation got true.

Those were the same event.

**C.**
Ask this about any cross-platform library, including your own:

What would fail if this platform claim were false?

If the answer is nothing, the claim is decoration.

**D.**
When your verification script is wrong, fix the data — not the script.

A checker full of exceptions stops being a specification.
````

</details>

---

## 2. LI-008 · LinkedIn post · Thu 22 Oct, 14:00 UTC

| | |
| --- | --- |
| Copy | [`../../linkedin.md`](../../linkedin.md) § LI-008, from its campaign line to its closing `---`. Quoted below |
| Audience | P1, multi-platform design-system engineers (`icp: p1`) |
| Core message | A partial count is not a tick: report verification evidence as fractions, so the reader sees the shape of the risk |
| Positioning | Primary: infrastructure (verification as published evidence) |
| Destination | `/docs/platforms` |
| Tracked link | Paste `https://kinetixui.com/docs/platforms?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p1_d_partial_evidence&utm_content=li_primary` in place of the bare URL on the last line, as `linkedin.md`'s publishing notes say. The pin covers the bare URL, so the swap at posting time does not break it |
| Visual | VIS-006 (`marketing/content/visuals/VIS-006.png`), regenerated 2026-10-17 from the generator (109 / Angular 80) |
| Pin if approved | `copy: { file: "marketing/content/linkedin.md", section: "LI-008", sha256: "2584e24daa37dd2b64e866c1c65185d5b23d2aeb75f680214df85e0f41bd6491" }` |

**Claims and evidence** (re-run 2026-10-18)

| Claim | Evidence | Holds |
| --- | --- | --- |
| "contrast is gated in CI for everything" | `check:contrast` (WCAG AA) in CI, `CLAIMS.md` B-claim, approved wording "Contrast is gated in CI" | yes; "for everything" is the copy's gloss on a CI gate over the token pairs |
| "accessibility is checked in a real browser across the site and every Storybook story" | `check:a11y-site` and `check:a11y-browser`, `CLAIMS.md` approved wording, word for word | yes |
| Direction-aware testing "from most of the catalogue on one platform to a single component on another, and none at all on a third" | `pnpm marketing:stats`: rtl Flutter **58/90**, Compose **1/90**, SwiftUI **0/90** | yes |

**Risks**

- The RTL fractions move as tests are added. The copy quotes no number, so a change only matters if Compose gains
  RTL tests or SwiftUI gains any before Thursday; re-run `pnpm marketing:stats` on the morning.
- "For everything" is broader than the approved wording. If the owner prefers the exact approved phrase, the
  change is two words and needs a fresh pin.

**Recommendation: approve.**

<details>
<summary>Exact copy (as pinned)</summary>

````markdown
**Campaign:** `kx_p1_d_partial_evidence` · **Destination:** `/docs/platforms` · **Visual:** VIS-006

> A green tick in an accessibility matrix is one of the least informative things in our industry.
>
> It could mean: every component is tested in a real browser, by an automated tool, on every platform. It
> could also mean: someone checked a few and felt good about it.
>
> When I built KinetixUI's verification data, I had to pick how to report partial evidence. The tempting
> option is a tick with an asterisk. The one I went with is a fraction.
>
> So the published numbers say things like: contrast is gated in CI for everything, accessibility is
> checked in a real browser across the site and every Storybook story — and direction-aware behaviour
> testing runs from most of the catalogue on one platform to a single component on another, and none at
> all on a third.
>
> That last clause is uncomfortable to publish. It's also the only part a reader can act on. "Has RTL
> support" tells you nothing about whether the component you need has been tested. A fraction tells you the
> shape of the risk.
>
> The rule I ended up with: a partial count is not a tick. If the evidence covers part of the surface, the
> number says which part, and I don't round it up in the summary.
>
> It makes the matrix look worse and makes it worth reading.
>
> The evidence, by platform: https://kinetixui.com/docs/platforms
````

</details>

---

## 3. X-008 · X thread · Fri 23 Oct, 15:00 UTC

| | |
| --- | --- |
| Copy | [`../../x.md`](../../x.md) § X-008. Quoted below |
| Audience | P2, web and native product teams (`icp: p2`) |
| Core message | "Cross-platform UI" is either a runtime or native implementations on a shared contract; KinetixUI chose native and publishes the gaps |
| Positioning | Secondary: multi-platform component library, with the infrastructure argument underneath |
| Destination | `/components` |
| Tracked link | Paste `https://kinetixui.com/components?utm_source=x&utm_medium=social&utm_campaign=kx_p2_f_two_trades&utm_content=x_thread` in place of the bare URL in post 4 |
| Visual | VIS-005 (`marketing/content/visuals/VIS-005.png`). Known nit: its alt text says "presented as equals" while one column is accent-styled; fix the alt text when posting |
| Pin if approved | `copy: { file: "marketing/content/x.md", section: "X-008", sha256: "1444496dd7dfe6cb12320b69be9eb5191b72c3c03fddcf29ee03525d12c16ccd" }` |

**Claims and evidence** (re-checked 2026-10-18)

| Claim | Evidence | Holds |
| --- | --- | --- |
| "five implementations" | `pnpm marketing:stats`: React 109, Angular 80, SwiftUI, Compose, Flutter 90 each | yes |
| "An Angular button is a directive on a real HTML button, not React in a bridge" | `packages/ui-angular/src/lib/button.ts`: `@Directive({ selector: 'button[kxButton], a[kxButton]' })` | yes |
| "coverage not identical everywhere" / "We publish the gaps" | `/docs/platforms` lists the 19 exceptions with reasons | yes |

**Risks**

- LI-007, its LinkedIn sibling with the same campaign, produced no tagged session (the only `kx_p2_f_two_trades`
  session in PostHog is a diagnostic-marked probe on 10 Oct). After posting, look for a `kx_p2_f_two_trades` /
  `x_thread` arrival rather than assuming the link kept its tag.
- Angular is in preview; the copy does not call it complete, so no maturity claim is at risk.

**Recommendation: approve**, and check for a tagged arrival the day after.

<details>
<summary>Exact copy (as pinned)</summary>

````markdown
**Campaign:** `kx_p2_f_two_trades` · **Destination:** `/components` · **Visual:** VIS-005

> **1/** "Cross-platform UI" means one of two things. Worth knowing which you're being sold.
>
> **2/** Option A: a runtime that draws your UI everywhere. One codebase, one implementation, a layer
> between you and the platform.
>
> Option B: separate native implementations agreeing on a contract. More code, no layer.
>
> **3/** Neither is a mistake. Different trades.
>
> The runtime buys one codebase and charges you at the edges — where a platform has an opinion your
> abstraction didn't anticipate.
>
> **4/** We took B. A SwiftUI view is a SwiftUI view. An Angular button is a directive on a real HTML button,
> not React in a bridge.
>
> Cost: five implementations, coverage not identical everywhere.
>
> We publish the gaps instead of hiding them.
>
> https://kinetixui.com/components
````

</details>

---

## Not in this queue, preserved as they are

| Asset | State | What unblocks it |
| --- | --- | --- |
| LI-001 | APPROVED 2026-10-18, not published, stop gate **CLOSED 19:07 UTC** | Nothing on the gate. The owner's second diagnostic visit arrived correctly attributed; only the ART-001 decision is open ([packet §4–§5](../m2/LI-001-publish-packet.md)) |
| GH-001 | DRAFTED, BLOCKED | The owner enables GitHub Discussions; numbers re-derived on the day |
| COM-004 | BLOCKED | A live re-read of the community's rules and a real thread to answer |
| LI-005 | BLOCKED, publication history unresolved | The owner says whether it ever went out. Nothing is backfilled |
| LI-010, X-002 | DRAFTED, `stale` | Figures refreshed (98 / Angular 31 → 109 / 80); the flag blocks approval until then |
| ART-001 | PUBLISHED, `stale` | The owner's edit on dev.to ([`ART-001-CORRECTION.md`](./ART-001-CORRECTION.md)) |
| LI-003, X-005, LI-004, X-003 | Published per the author, live URLs missing | The author supplies each post's own URL |

No asset is approved by this file, no published post is duplicated, and no reach, impressions or clicks are quoted.
