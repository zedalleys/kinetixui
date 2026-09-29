# Research

Dated observations. What we saw, where, and when — **not** what we decided.

This directory existed as an instruction before it existed as a directory: `weekly-review.md`,
`community.md`, `roadmap.md` and two of the `a01` campaign files all told a reader to capture findings in
`marketing/research/`, which was not there. Those references now resolve.

## What belongs here

One file per observation session, named `YYYY-MM-DD.md`:

- **Weekly and monthly review captures** — the filled-in blocks from [`../weekly-review.md`](../weekly-review.md)
  and [`../monthly-review.md`](../monthly-review.md).
- **Channel observations** — what a subreddit, a Hacker News thread or a LinkedIn post actually did, including
  when it did nothing. A channel that produced nothing is a finding.
- **Post-publication notes** — what surprised you, from a campaign's `publish-checklist.md`.
- **Competitive and category observations** — what another library claims, how it words it, what it does not
  say. Quote and link; never paraphrase a competitor into something easier to argue with.
- **Audience evidence** — a real question from a real person, with a link. The Flutter token-only request that
  shaped an adoption path is the model.

## What does not belong here

- **Decisions.** Those go in [`../STRATEGY.md`](../STRATEGY.md) or [`../MESSAGING.md`](../MESSAGING.md).
  Research is the input; canonical strategy is the output. If a file here starts saying what we *should* do, it
  has drifted.
- **Product numbers.** Coverage, versions and verification fractions come from `pnpm marketing:stats` at the
  moment of use. Writing one down here creates a second, ageing source — the failure this whole directory tree
  is organised to prevent.
- **Claims.** [`../CLAIMS.md`](../CLAIMS.md) owns those. An observation is not a licence to assert.
- **Audit records.** Dated engineering or readiness audits go in [`../audits/`](../audits/).

## How to cite evidence

Every observation needs enough that someone else can re-check it:

| Kind | Cite as |
| --- | --- |
| A post or thread | Full URL, platform, date, and the metric you are quoting at the time you quote it |
| A person's question | Link, and their words quoted — never summarised into support for a conclusion |
| A product number | The command (`pnpm marketing:stats`) and the date. Not the number alone |
| A competitor claim | URL, date retrieved, exact wording |
| An analytics figure | The event name from [`../analytics.md`](../analytics.md), the date range, and the caveat |

Where something is not known, write that it is not known. An honest gap is usable; a confident guess is a
liability, and this project's entire position is built on not making them.

## Research versus canonical strategy

| | Research | Canonical strategy |
| --- | --- | --- |
| **Answers** | What happened | What we do about it |
| **Shape** | Dated, append-only, never retro-edited | Living, rewritten as understanding improves |
| **Authority** | None on its own | Governs all public copy |
| **Lives in** | `research/YYYY-MM-DD.md` | `STRATEGY.md`, `MESSAGING.md`, `PERSONAS.md`, `CLAIMS.md` |
| **Wrong later?** | Stays as written — it was true when observed | Gets corrected, with the correction noted |

A file here graduates into strategy by being *cited* in one of the canonical documents, not by being moved.
