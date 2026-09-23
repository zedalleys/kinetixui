# Growth experiments

Ordered by expected value per unit of effort, not by precision. Effort is
S/M/L. No fake confidence scores — we have no baseline data yet, and inventing
one would be the same sin as inventing coverage.

**Run one at a time.** Concurrent experiments on this traffic volume produce
noise, not results.

| # | Experiment | Hypothesis | Metric | Effort | Expected signal | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Homepage CLI CTA above the fold | The install command is the fastest proof; burying it costs activation | `cli_command_copied` from `homepage_hero` | S | Moderate | Crowds the hero |
| 2 | "Start with tokens only" path on the homepage | Token-only is a lower-commitment entry the site never offers | `/docs/tokens` entries, Flutter/SwiftUI doc views | M | High | Splits the primary CTA |
| 3 | `/design-tokens/flutter` landing page | Real depth, thin competition, real user demand behind it | organic entries, `install_command_copied` | L | High | Slow to index |
| 4 | `/rtl-design-system` landing page | Almost unserved query with genuine evidence | organic entries | M | Moderate–high | Small volume |
| 5 | Related components on component pages | Exploration depth predicts activation | components per session | S | Moderate | — |
| 6 | Copy-to-CLI button on component pages | One click from "I like this" to "I have it" | `cli_command_copied` from `component_page` | S | High | — |
| 7 | Platform filter made prominent on `/components` | Mobile-platform visitors cannot see their coverage fast | `platform_selected`, gallery depth | S | Moderate | — |
| 8 | Interactive platform comparison | Makes verified coverage visceral | `/docs/platforms` time, GitHub clicks | L | Moderate | Effort-heavy |
| 9 | Token pipeline animation on the homepage | The architecture is the pitch and is currently static | scroll depth, `/docs/tokens` clicks | M | Moderate | Motion/perf budget |
| 10 | README CTA restructure | GitHub is the first touch for many developers | GitHub → site referrals | S | Moderate | — |
| 11 | Per-platform quick starts | Every platform should have a first-15-minutes path | platform doc views, install copies | M | High | Docs upkeep |
| 12 | Framework migration guides | Migration intent is high-intent traffic | organic entries, time on page | L | Moderate | — |
| 13 | Flagship demo above the features ledger | Proof before claims | flagship `platform_selected`, scroll depth | S | Moderate | — |
| 14 | Component page "verified on" badges | Surfaces the differentiator where people actually browse | component → platform doc navigation | M | Moderate | Clutter |
| 15 | Changelog as a growth surface | Releases are recurring content with real intent | `changelog_viewed`, returning users | S | Moderate | — |
| 16 | `/docs` landing restructured by goal | "I want tokens" vs "I want components" are different journeys | docs → activation rate | M | Moderate–high | — |
| 17 | Search on the components gallery | Ninety-eight items is past browsing scale | gallery depth, component views | M | Moderate | — |
| 18 | Social preview per docs page | Shared links currently look generic | referral CTR | S | Low–moderate | — |
| 19 | "Why not React-only?" FAQ | Pre-empts the main objection and sharpens positioning | bounce on `/docs` | S | Low–moderate | — |
| 20 | Contributor onboarding path | Contributors are the cheapest durable growth | first-time contributor PRs | M | Low, slow | — |
| 21 | Demo GIF in the README hero | Proof in three seconds, where discovery starts | GitHub → site referrals | S | Moderate | Keeping it current |
| 22 | Post-install next step in CLI output | The moment after install is unused | return visits, docs entries | S | Moderate | Touches CLI UX |

## Rules

- Change one thing. Measure for at least two weeks — traffic is too low for less.
- If a result is ambiguous, it is negative. Keep the simpler version.
- Never A/B a truth claim. Accuracy is not an experiment variable.
