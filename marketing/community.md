# Community participation

**Supporting document.** Which communities are worth participating in, how to behave in them, and the weekly
listening routine. Channel *roles* and the distribution system are in
[`distribution/README.md`](./distribution/README.md) — this file is about the communities themselves and is
not a second copy of that.

The four finished contribution briefs are [`content/community-briefs.md`](./content/community-briefs.md).
GitHub is a channel of its own and lives in [`distribution/github.md`](./distribution/github.md).

---

## `LIVE RULE CHECK REQUIRED` — every community below

> **No community rule in this file is quoted, paraphrased or assumed, because none could be read.**
>
> This container's network policy denies them: the proxy answered `403` to `CONNECT www.reddit.com:443` and
> `CONNECT old.reddit.com:443`, and `news.ycombinator.com`, `dev.to` and `linkedin.com` were equally
> unreachable. That is a fact about the container, not about the communities.
>
> **Before posting anywhere: read the current sidebar, the rules page and recent moderator notes.** Several of
> these communities prohibit self-promotion outright, and some permit it only in a weekly thread or with
> specific flair. **Assume promotion is not allowed until the rules say otherwise.**

A removed post costs more than the post was worth. A ban in the community that matters most is permanent.

---

## The standing rules

Every community, every time. From `content/community-briefs.md`, and they are not negotiable per-community.

1. **Answer the question that was asked** — not the question you wish had been asked.
2. **The useful content goes in the comment.** A link is never the answer; it is at most a footnote to one.
3. **Disclose.** *"I build KinetixUI, so I have a bias here"* costs nothing and buys everything.
4. **A link is justified only when it is the shortest path to something the reader specifically asked for** —
   real source, a coverage table, a generated artefact. Never a landing page.
5. **Do not post the same idea in three communities in one week.** It reads as a campaign because it is one.
6. **One excellent contribution beats ten cross-posts.** This is the whole strategy, not a slogan.

Full safety rules — including the eight *nevers* — are in
[`distribution/README.md`](./distribution/README.md) §12.

---

## Fit classification

**Fit is judged on audience alignment, content fit, our ability to contribute useful knowledge, and
promotion tolerance.** It is deliberately **not** ranked by speculative conversion potential: we have no
baseline, so any conversion estimate would be a number invented to justify a preference.

Communities are named as **types and candidates**, not as a verified list. Whether a given community is
currently active, moderated the way it was, or even exists under that name is not checkable from here.

### HIGH FIT

| Community type | Candidates | Audience | Why the content fits | Value with every KinetixUI link removed | Product link necessary? | Best format | Promotion risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Design-system communities** | Design Systems Slack; design-system Discords; design-system meetups | **P1**, S1, S2 | The only rooms where *"verification is the product"* needs no explanation. Pillars A, C, D land as-is | **High.** The reporting-decision argument — that a green tick collapses "tested everywhere" and "spot-checked" into one symbol — is useful to anyone maintaining a matrix, with no product in it at all | **No** | Substantial comment; a write-up if asked | **Medium.** These rooms are small and remember a member who turned up to sell |
| **Design-token / DTCG ecosystem** | Spec discussions; token-tooling repositories and their issue trackers; Tokens Studio community | P1, S2 | Pillar B's position *is* the native half of the token conversation, which is thin while web token content is saturated | **High.** Primitive/semantic layering and the theme-adapter pattern are transferable technique | **Rarely** — and then the committed generated artefacts, which read without installing anything | Issue, spec discussion, or a written ambiguity report | **Low.** Technical rooms, and a real implementation report is welcome |
| **Mobile platform communities** | r/FlutterDev · r/androiddev · r/swift · r/iOSProgramming; Flutter and Kotlin Discords | **S4**, P2 | Engineers handed web design decisions and asked to match them. This is the pain, described most concretely | **High.** How a token pipeline crosses the web boundary is useful to someone who will never adopt KinetixUI | **No.** And **never an install command** — the native libraries are on no registry (`CLAIMS.md` C3) | Comment in an existing thread | **High.** Strong anti-promotion norms. `LIVE RULE CHECK REQUIRED` matters most here |

### MEDIUM FIT

| Community type | Candidates | Audience | Why the content fits | Value without KinetixUI | Product link? | Best format | Promotion risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Frontend / framework communities** | r/reactjs · r/Angular2 · r/Frontend · r/webdev; framework Discords | S1, P1, C1 | Pillars C and G carry. The registry-defect story works with **zero** product context | **High** for pillar G, **low** for pillar A — which reads as a product claim here | **No** | Comment | **Medium.** Large, adjacent, and mostly not our buyer |
| **General engineering** | Hacker News **comments**; r/programming; engineering Discords | C1, S1 | *A hand-maintained list cannot fail — it can only be incomplete* is a bug **class**, and that travels | **Very high.** COM-003 is the most link-free asset we have | **Rarely** | **Comment, never a submission.** HN submissions are for a substantial launch — `launches.md` | **Medium.** Low tolerance for anything that smells like marketing, high reward for a real finding |
| **Accessibility communities** | r/accessibility; accessibility Slacks | S3, S1, S5 | Pillar D, specifically the *reporting* decision rather than the tooling | **High.** Publishing fractions instead of ticks is a practice recommendation | **Only** if asked to see a matrix built that way | Comment, or a short post where measurement practice is on topic | **Low–medium.** But **never** present automated checks as compliance — `CLAIMS.md` E1, and the word *compliant* does not appear |

### LOW FIT

| Community type | Why low | Verdict |
| --- | --- | --- |
| **Design / UI-design communities** | Audience influences rather than decides, and the content is engineering. S2 is an influencer persona, not a buyer | Participate if already a member. Not a distribution channel |
| **Startup / indie-hacker communities** | The audience is other builders. Sympathetic, and not adopters | **No** |
| **"Show your project" threads** | Format rewards screenshots over substance, and the audience is builders | **No** |
| **IoT / embedded communities** | Pillar E is real and deliberately small, with a narrow audience. Month one has no pillar E asset | **Revisit in month two** |
| **Stack Overflow** | Answering questions is good and right. It is **not** a distribution channel and should not be treated as one | Answer, do not distribute |

---

## Which asset goes where

Mapping the finished Phase 4 assets to community types. Every one is written to be worth reading with all
KinetixUI links removed — if a brief fails that test it does not get posted.

| Asset | Pillar | ICP | Community types | The transferable lesson |
| --- | --- | --- | --- | --- |
| **COM-001** | B | P2 | **Mobile platform** · design-token ecosystem | How a token pipeline crosses the web boundary: transforms per target, the primitive/semantic split, dark mode as a contract, and the theme-adapter pattern that lets stock widgets inherit a design system with no custom widgets |
| **COM-002** | A | P1 | **Design-system** · frontend (r/Frontend) | How to check whether a cross-platform library implements what it lists. A platform list is free to write and expensive to verify |
| **COM-003** | G | NEUTRAL | **General engineering** (HN comments, r/programming) | A hand-maintained list of things to look for cannot fail — it can only be incomplete, and incompleteness is silent |
| **COM-004** | D | P1 | **Accessibility** · design-system | The reporting decision. Fractions make the matrix look worse and make it actionable |
| **ART-002** derivatives | B | P2 | Mobile platform · design-token ecosystem | As COM-001 |
| **ART-001** derivatives | A | P1 | Design-system · general engineering | As COM-002 |

**No asset maps to more than two community types**, and none is posted to three in a week.

### What must never be said in a mobile community

- That the native libraries are installable. **They are not on any registry.**
- That KinetixUI substitutes for platform expertise. The message is **shared system intent plus
  platform-appropriate implementation** — never *"you don't need to know SwiftUI"*.
- Anything implying components are transpiled from one source. Five implementations share a contract, not a
  codebase.

---

## Weekly listening routine

**30–45 minutes, one sitting.** Manual. No listening software, no alerts product, no purchase — and no
automated replies, ever. Capture in [`research/YYYY-MM-DD.md`](./research/).

| Source | Looking for |
| --- | --- |
| r/FlutterDev, r/androiddev, r/swift, r/iOSProgramming | *"how do I share design tokens with…"* |
| r/reactjs, r/Angular2 | design-system adoption and migration pain |
| Hacker News | design-system and token threads |
| Token tooling issue trackers (Style Dictionary, Tokens Studio) | pipeline friction |
| Stack Overflow | RTL, theming and token questions per platform |
| dev.to | which design-system content is landing |
| Design-system Slack / Discord | what people are actually stuck on this week |

**Topics to search:** `cross-platform design system` · `design tokens` · `DTCG` · `design token pipeline` ·
`SwiftUI design system` · `Compose design system` · `Flutter design system` · `design system drift` ·
`theme adapter` · `Style Dictionary`

**What counts as a signal:** the same problem stated three times by three people. One person's complaint is
noise; three is a roadmap item.

**Output:** append to `content/backlog.json` with `sourceFeature` naming the evidence, or open a repository
issue when it is a product gap. Never a reply queue — what listening produces is *ideas* and *evidence*.

---

## Feedback loop

The Flutter *"tokens without widgets"* request is the reference case, start to end:

1. **Capture** — someone says the tokens are unusable without the widgets.
2. **Classify** — adoption-path gap, not a bug.
3. **Validate** — one person or a pattern? It was a pattern: every design system with a component library has
   this complaint.
4. **Prioritise** — small, and it unblocks a whole class of adopter.
5. **Implement** — foundation tokens plus Material and Cupertino theme adapters.
6. **Publish the lesson** — article, post, docs section. This became pillar B and ART-002.
7. **Measure** — `/docs/tokens` entries, Flutter platform-doc views, and the request stopping.

**Do this for every substantive request. The lesson is the content.** Where each kind of feedback is routed —
message confusion, product question, objection, bug, feature request, content request — is in
[`distribution/README.md`](./distribution/README.md) §8.

---

## Channels that are not communities

Covered elsewhere, and listed here only so nobody looks for them in this file:

| | Where |
| --- | --- |
| LinkedIn, X, dev.to — roles, cadence, CTA style | [`distribution/README.md`](./distribution/README.md) §2–§4 |
| GitHub — settings, Releases, Discussions, contributors | [`distribution/github.md`](./distribution/github.md) |
| Launch staging, Product Hunt, Hacker News submissions | [`launches.md`](./launches.md) |
| Partnerships and one-to-one outreach | [`distribution/outreach.md`](./distribution/outreach.md) |
| Day-by-day execution | [`distribution/first-14-days.md`](./distribution/first-14-days.md) |
