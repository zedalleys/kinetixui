# Content cadence

> **SUPERSEDED as a calendar.** The 30-day schedule is
> **[`content/calendar.md`](./content/calendar.md)**, with every asset indexed in
> [`content/register.json`](./content/register.json) and validated by `pnpm check:content`. Distribution of
> those assets is [`distribution/first-14-days.md`](./distribution/first-14-days.md).
>
> This file is the **cadence principle** plus a record of ideas the Phase 4 calendar did not carry. It no
> longer schedules anything, and where it disagreed with `content/calendar.md` it was the one that was wrong.

## The cadence principle

**Not five posts a week.** At this stage fewer and better compounds, and a thin daily post costs credibility
with exactly the audience we want. Two to three original assets a week plus repurposing, from one person who
also maintains the product.

The operative rhythm is in `content/calendar.md`: **day 1 is a Tuesday**, and community contributions carry no
fixed day because they are opportunistic and rules-gated.

## Why this file was superseded

It described a different month, and three of its differences were substantive rather than cosmetic:

| It said | The reconciled position |
| --- | --- |
| Pillar **E** meant *build in public* | Phase 1 moved build-in-public to **pillar G** and made **E** device interfaces. Every "E" row below therefore reads as the wrong pillar today |
| Reddit posts scheduled on named days (9, 18) | **No Reddit post is scheduled and none should be.** Community work is opportunistic and `LIVE RULE CHECK REQUIRED` — `community.md` |
| A GitHub Release and a Discussions thread as calendar beats (days 12, 25) | A Release is hygiene, not a launch beat — `distribution/github.md` §2. Discussions is enabled when there is a question to seed it with |
| A fixed Mon/Wed/Fri rhythm | Day offsets, because the start date is not chosen yet |

Article titles here also predate the finished drafts: the parity article is *"…may be lying about parity"*,
and ART-002 is *"Your design tokens stop at the web boundary"* rather than *"Tokens without widgets"*.

## Ideas this file had that the Phase 4 month did not carry

Kept because they are good, and because a superseded plan's *ideas* are worth more than its schedule. None is
drafted; all belong in `content/backlog.json` at the next planning pass, re-mapped to the current pillar set.

| Idea | Pillar today | Why it did not make month one |
| --- | --- | --- |
| *"Angular without React wrappers: directives on the elements HTML already has"* — `kxButton`, CVA, signals | **F** | Angular is deliberately absent from the first month. Real, and it needs the preview framing in every paragraph |
| The `material-icons` classpath bug CI caught before a human did | **G** | A good build-in-public story that lost its slot to a stronger one — the registry defect |
| Semantic versus primitive tokens: why `--action` beats `--blue-600` | **B** | Folded into ART-002's argument rather than standing alone |
| *"RTL is infrastructure, not a patch"* | **D** | Pillar D's month-one asset is the **reporting** argument instead. This is the `launches.md` theme 4 gap |
| A demo clip: `ThemeData` from the adapter, stock widgets restyling with no Kinetix widget | **B** | Needs motion. `content/motion-briefs.md` has three shot lists and none is produced |
| *"Every code sample on our website is generated from source that compiles"* | **C** | Overlaps X-009 (marketing copy under CI), which says the sharper version of it |
| A "which platform should deepen next" thread | — | Belongs in Discussions **Ideas**, once Discussions is enabled |

## The rules, which did not change

- **Never post the same copy to two channels.** Re-angle it. Each channel version is adapted, not truncated.
- **Communities: answer first.** Mention KinetixUI only when it is genuinely the best answer, and disclose the
  bias.
- **Hacker News submissions are not in the first 30 days.** They are for a substantial launch — `launches.md`.
- **Every number re-read from generated truth on the day of posting**, never from a previous draft or from
  this file. `pnpm marketing:stats`.
