---
type: community contribution briefs
status: briefs — nothing posted
---

# Community contribution briefs

Four contributions (**COM-001 … COM-004**). Each is written to be worth reading **with every KinetixUI link
removed**. If a brief fails that test it does not get posted.

> **RULES REQUIRE LIVE CHECK.** This environment has no network access to these communities, so no subreddit
> or forum rule below is quoted or assumed. Before posting anywhere here, read the current sidebar, rules
> page and recent moderator notes. Several of these communities prohibit self-promotion outright, and some
> permit it only in a weekly thread or with flair. **Assume promotion is not allowed until the rules say
> otherwise.** A removed post costs more than the post was worth.

## The standing rule for every community

1. **Answer the question that was asked.** Not the question you wish had been asked.
2. **The useful content goes in the comment.** A link is never the answer; it is at most a footnote to one.
3. **Disclose.** "I build KinetixUI, so I have a bias here" costs nothing and buys everything.
4. **A link is justified only when it is the shortest path to something the reader specifically asked for** —
   real source, a coverage table, a generated artifact. Never to a landing page.
5. **Do not post the same idea in three communities in one week.** It reads as a campaign because it is one.

---

## COM-001 · Cross-platform token architecture · P2 · Pillar B

- **Where:** r/FlutterDev, r/androiddev, r/swift, and design-system Slack/Discord communities.
- **Audience:** mobile engineers who have been handed web design decisions and asked to match them.
- **What we can teach:** how a token pipeline crosses the web boundary — Style Dictionary transforms per
  target, the primitive/semantic split, why dark mode has to be a contract rather than two constant sets,
  and the theme-adapter pattern that lets stock widgets inherit a design system with no custom widgets.
- **What we must not do:** turn up in a "how do you manage colours?" thread with a product link. Do not
  imply the native libraries are installable — **they are not on any registry**, and saying otherwise breaks
  `CLAIMS.md` C3.
- **Content type:** a substantial comment in an existing thread, or a text post if the community's rules
  permit one and nobody has covered it recently.
- **Link justified when:** someone asks for a concrete working example of native token generation. Then:
  the committed generated artifacts, because they can be read without installing anything.
- **Derived from:** ART-002.

---

## COM-002 · Verifying a coverage claim · P1 · Pillar A

- **Where:** design-system communities (Design Systems Slack, relevant Discords), r/Frontend, Hacker News if
  ART-001 is posted there.
- **Audience:** people who own a design system across more than one platform and have been burned by a
  parity claim.
- **What we can teach:** how to check whether a cross-platform library actually implements what it lists —
  read the manifest or the component index, then check the filesystem for each claimed platform. The
  generalisable lesson is that a platform list is free to write and expensive to verify, so treat it as a
  marketing artifact until proven otherwise.
- **What we must not do:** name another library as the bad example. The story works with ours as the
  subject — **our own check caught our own false claims**, which is both more persuasive and not a fight.
- **Content type:** comment, or a short write-up if asked.
- **Link justified when:** someone asks what the checks actually look like. Then: the coverage table, with
  the documented exceptions visible.
- **Derived from:** ART-001, LI-004.

---

## COM-003 · The dependency-list bug class · NEUTRAL · Pillar G

- **Where:** Hacker News (as a comment on a related thread, not a submission), r/programming if genuinely
  relevant, engineering Discords.
- **Audience:** anyone who maintains a code generator, a scaffolding CLI or a package registry.
- **What we can teach:** a hand-maintained list of things to look for cannot fail — it can only be
  incomplete, and incompleteness is silent. The concrete case: a generator that matched dependencies against
  a written list *and* scanned only part of the delivered file set, so 91 of 97 items shipped undeclared
  dependencies while the command exited 0. The fix was deletion, not extension: derive from source, compute
  over the full delivered set.
- **What we must not do:** dramatise it. It was a bug, it was found, it was fixed structurally, and the
  interesting part is the class rather than the incident. No "horror story" framing.
- **Content type:** comment. This one is genuinely better as a reply than a post.
- **Link justified when:** rarely. The story is self-contained; the repository link is for someone who asks
  to see the generator.
- **Derived from:** LI-006, X-006.

---

## COM-004 · Reporting partial evidence · P1 · Pillar D

- **Where:** accessibility communities, design-system communities, r/accessibility.
- **Audience:** people who maintain a compliance or verification matrix and have to decide what a tick means.
- **What we can teach:** the reporting decision, not the tooling. A green tick collapses "tested everywhere"
  and "spot-checked" into one symbol. Publishing fractions instead makes the matrix look worse and makes it
  actionable, because a reader can see whether the component *they* need is covered. Includes the
  uncomfortable part: some of our fractions are single digits and one platform is zero.
- **What we must not do:** present automated checks as compliance. `CLAIMS.md` E1 — axe and contrast gates
  are evidence, not certification, and the word "compliant" does not appear.
- **Content type:** comment, or a short post in a community where measurement practice is on topic.
- **Link justified when:** someone asks to see a matrix built this way.
- **Derived from:** LI-008, X-007.

---

## Not now

- **Reddit self-promotion threads.** Weekly "show off your project" threads are low-value here: the audience
  is other builders, not adopters, and the format rewards screenshots over substance.
- **Product Hunt.** Launch surface, governed by `launches.md`. Not a month-one channel.
- **Stack Overflow.** Answering questions is fine and good. It is not a distribution channel and should not
  be treated as one.
