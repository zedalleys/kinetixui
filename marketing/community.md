# Community & channels

## Channel strategy

Each channel gets its own angle. Never the same copy twice.

### LinkedIn — design-system and engineering leadership
Architecture thinking, build-in-public, diagrams. Longer posts do well. This is
where ICP A and B actually are.
- **Format:** 150–300 words, one idea, one diagram or code image, link in the post.
- **Works:** before/after numbers, decisions and their trade-offs, honest misses.
- **Avoid:** engagement bait, emoji-led hooks, "thoughts?" endings.

### X — developer-to-developer
Concise technical observations, threads, release notes.
- **Format:** one insight per post; threads only when there is a real sequence.
- **Works:** code screenshots, a surprising CI failure, before/after diffs.
- **Avoid:** cross-posting LinkedIn copy verbatim.

### Reddit — contribute, do not promote
r/reactjs · r/FlutterDev · r/androiddev · r/iOSProgramming · r/Angular2 ·
r/webdev · r/design_system
- **Rule:** answer the question with no link. Mention KinetixUI only when it is
  genuinely the best answer, and disclose that you build it.
- **Best use:** real architecture questions where we made a decision and can
  explain the trade-off. Those threads teach us more than they promote us.
- **Never:** launch announcements in unrelated subs, or a link with no substance.

### GitHub — where credibility compounds
Releases with real notes, Discussions, issue templates, roadmap transparency,
contributor onboarding.
- **Already present:** bug/feature issue templates, PR template.
- **Worth adding when there is traffic to justify it:** Discussions categories —
  Announcements · Show and tell · Help · Ideas · Platform requests ·
  Design-system architecture.
- **Not created automatically.** Enabling Discussions is the maintainer's call.

### DEV / Hashnode — long-form home until `/blog` exists
Tutorials and architecture deep-dives. Canonical link back to the docs page the
article supports.

### Hacker News — rare, substantial only
Two viable stories in the next quarter, at most:
1. "How we verify cross-platform parity against source" (engineering depth)
2. A genuine milestone launch (see `launches.md`)

Anything less is a wasted first impression.

## Weekly research process

30–45 minutes, one sitting. Capture in `research/YYYY-MM-DD.md`.

| Source | Looking for |
| --- | --- |
| r/FlutterDev, r/androiddev, r/iOSProgramming | "how do I share design tokens with…" |
| r/reactjs, r/Angular2 | design-system adoption and migration pain |
| Hacker News | design-system and token threads |
| GitHub issues on token tooling / Style Dictionary | pipeline friction |
| Stack Overflow | RTL, theming, token questions per platform |
| DEV | what design-system content is landing |

**What counts as a signal:** the same problem stated three times by three people.
One person's complaint is noise; three is a roadmap item.

**Output:** append to `content/backlog.json` with `sourceFeature` naming the
evidence, or open a repository issue when it is a product gap.

## Feedback loop

The Flutter "tokens without widgets" request is the reference case, start to end:

1. **Capture** — user says the tokens are unusable without the widgets.
2. **Classify** — adoption-path gap, not a bug.
3. **Validate** — is this one person or a pattern? (It was a pattern: every
   design system with a component library has this complaint.)
4. **Prioritise** — small, unblocks a whole class of adopter.
5. **Implement** — foundation tokens + Material/Cupertino theme adapters.
6. **Publish the lesson** — article + post + docs section.
7. **Measure** — traffic to `/docs/flutter`, Flutter-platform doc views,
   repeat requests stopping.

Do this for every substantive request. The lesson is the content.
