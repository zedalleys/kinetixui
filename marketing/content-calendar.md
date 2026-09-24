# 30-day content calendar

Cadence is deliberately **not** five posts a week. At this stage, fewer and
better compounds; a thin daily post costs credibility with exactly the audience
we want. Target rhythm:

- **Mon** — substantive technical post (long-form or a real thread)
- **Wed** — short engineering lesson or demo
- **Fri** — build-in-public update

Everything below maps to work that has actually happened in this repository.

## Week 1 — Establish the position

| Day | Channel | Piece | Pillar |
| --- | --- | --- | --- |
| 1 (Mon) | DEV + LinkedIn | **Article 1:** "Your cross-platform design system is probably lying about parity" — the `direction-provider` and `chart-demo` findings, and the checks that caught them | A |
| 2 | X | Thread: the three guardrails, what each one caught, with the real before/after counts | A |
| 3 (Wed) | LinkedIn | Diagram: DTCG source → five token outputs → five separate implementations | B |
| 4 | X | Short: "98 components is not the interesting number. 90 of 98 on the four catalogue-complete platforms is." — a02 `x_numbers` | A |
| 5 (Fri) | X + LinkedIn | Build-in-public: what shipped this week, what broke, what the CI caught | E |

## Week 2 — Tokens as the real product

| Day | Channel | Piece | Pillar |
| --- | --- | --- | --- |
| 8 (Mon) | DEV + LinkedIn | **Article 2:** "Tokens without widgets: a design system you can adopt one layer at a time" — the Flutter request, `KinetixMaterialTheme`, stock widgets inheriting tokens | B |
| 9 | Reddit r/FlutterDev | Genuine discussion: consuming a design system's tokens without its widget set | B |
| 10 (Wed) | X | Demo clip: `ThemeData` from the adapter; stock `FilledButton`/`TextField` restyle with no Kinetix widget | F |
| 11 | LinkedIn | Semantic vs primitive tokens — why `--action` beats `--blue-600` | B |
| 12 (Fri) | GitHub Release + X | Release notes written for humans: what changed, who benefits, migration impact | E |

## Week 3 — Platform-native implementation

| Day | Channel | Piece | Pillar |
| --- | --- | --- | --- |
| 15 (Mon) | DEV | "Angular without React wrappers: directives on the elements HTML already has" — `<button kxButton>`, CVA, signals | F |
| 16 | X | Thread: four platforms, four idioms, one contract — Button in React/SwiftUI/Compose/Flutter side by side | F |
| 17 (Wed) | LinkedIn | Carousel: "same semantic Button, four native implementations" | F |
| 18 | Reddit r/Angular2 or r/androiddev | Architecture question grounded in a real decision we made (overlay/portal design) | F |
| 19 (Fri) | X + LinkedIn | Build-in-public: the `material-icons` classpath bug CI caught before a human did | E |

## Week 4 — Accessibility, RTL, and the milestone

| Day | Channel | Piece | Pillar |
| --- | --- | --- | --- |
| 22 (Mon) | LinkedIn + DEV | "RTL is infrastructure, not a patch" — logical properties enforced in CI, direction-aware tests per platform | D |
| 23 | X | Short: contrast as a build gate, not a review step | D |
| 24 (Wed) | X + LinkedIn | Demo: RTL toggle, same components mirroring correctly | D |
| 25 | GitHub Discussions | Open a "Platform requests" thread — which platform should deepen next | — |
| 26 (Fri) | LinkedIn + X | **Milestone post:** "Every code sample on our website is now generated from source that compiles" — the blocks + component-snippet work | E |

## Counts

2 long-form articles · 10 LinkedIn · 11 X · 2 Reddit · 2 GitHub · 4 demo concepts · 1 milestone post.

## Rules

- Never post the same copy to two channels. Re-angle it.
- Reddit: answer first, mention KinetixUI only if genuinely relevant.
- Hacker News: not in these 30 days. It is for a substantial launch (see `launches.md`).
- Every number re-read from generated truth on the day of posting, not from this file.
