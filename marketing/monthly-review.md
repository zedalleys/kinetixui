# Monthly review

## Channel performance

Roles, success signals and stop rules per channel: [`distribution/README.md`](./distribution/README.md) §2
and §10. Counts come from [`distribution/register.json`](./distribution/register.json) and PostHog.

**No "activations" column.** Activation is not measurable from this website ([`analytics.md`](./analytics.md)
§5). The rightmost signal available is Adoption Intent.

| Channel | Assets out | Attributed sessions | Qualified evaluation | Adoption intent | Keep / reduce / stop |
| --- | --- | --- | --- | --- | --- |
| LinkedIn | | | | | |
| X | | | | | |
| dev.to | | | | | |
| GitHub | | | | | |
| Communities (unattributed) | | **community-dark** | **community-dark** | **community-dark** | |
| Organic search | | | | | |

**Community rows cannot be filled** and that is the design, not an omission —
[`distribution/README.md`](./distribution/README.md) §5. Judge them on the replies they earned.

**A channel is reduced or stopped on the rules in §10**, never on one weak month. Specifically **not** stop
signals: one weak post, small initial reach, a single negative comment.

## Content themes
- Pillars that worked:
- Pillars that did not, and why:
- Formats that worked (article / thread / demo / diagram):

## Search growth
- Impressions trend · new ranking queries · pages worth building next:

## Adoption Intent trend

**Not activation.** [`analytics.md`](./analytics.md) §5 — a copied command is where our knowledge ends, and
`CLAIMS.md` **D1** is `PENDING LIVE VERIFICATION`.

- Adoption Intent sessions, four-week series (counts):
- **Adoption Intent Rate** (÷ eligible arriving sessions) and **Evaluation → Intent Progression**
  (÷ qualified-evaluation sessions) — two measures, `analytics.md` §4, and only if §10's baseline window has
  closed. Otherwise counts:
- Which entry path leads to it most often (components / tokens / CLI / platform docs):
- **Returning evaluators** — distinct anonymous IDs with a qualified evaluation in ≥2 sessions. Directional:
  cleared cookies and multiple devices both undercount, by an unknown amount:

## ICP hypothesis

`kx_p1_*` against `kx_p2_*` on qualified evaluation, adoption intent, and which ladder rung.

- Counts per prefix:
- Which rung each skews toward:
- **Verdict: the winner stays undeclared.** `STRATEGY.md` §13 unknown #1 is open until the evidence rules in
  `analytics.md` §10 are met. The honest framing is *"P2-attributed sessions evaluate at a higher rate"* —
  never *"P2 is our ICP"*. Attribution indicates which **message** earned the click, not who the person is:

## Platform interest
Which platform docs are actually read. **This is the roadmap signal** — build
depth where demand already is, not where it is assumed.

## Feature requests
- Recurring themes:
- Anything asked three times:

## Competitor / category watch
Track categories, not individual rivals. Note only material changes.

| Category | Watch for | Change this month |
| --- | --- | --- |
| shadcn ecosystem | distribution model, registry patterns | |
| Radix | primitive/behaviour layering | |
| Material / Carbon / Fluent | multi-platform token strategy | |
| Tamagui / NativeWind | cross-platform React approaches | |
| Token tooling (Style Dictionary, Tokens Studio) | DTCG adoption, pipeline features | |
| Enterprise design systems | governance and audit features | |

Record facts: new platform support, token architecture changes, licensing,
major releases, positioning shifts. Never disparage. If a competitor solves
something better, that is a roadmap input.

## Roadmap adjustment
- What the data says to do more of:
- What to stop:
- Next month's single biggest bet:

## The question that decides whether this ritual is worth keeping

**Did any number here change a decision this month?**

If a metric has not informed a decision in three months, it is a candidate for deletion — from the
dashboard and from [`analytics.md`](./analytics.md). A scorecard nobody acts on is a scorecard that
quietly teaches everyone to stop reading it.

Before drawing any conclusion, check the evidence rules in `analytics.md` §10:

| Evidence | Action |
| --- | --- |
| Under ~30 qualified evaluations in the comparison | **KEEP** — this is noise |
| A directional gap across 2+ cycles | **INVESTIGATE** |
| A mechanism plus a repeated pattern | **TEST** |
| A tested change that holds | **CHANGE** |

Specifically: do not declare a P1/P2 winner, do not stop a channel on one weak month, and do not report a
rate before the baseline window closes.
