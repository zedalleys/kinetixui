# Content pillars

Six pillars. Every piece belongs to exactly one, and every piece must contain at
least one fact a reader could verify in the repository.

| Pillar | What it argues | Best channels |
| --- | --- | --- |
| **A — Cross-platform design systems** | Parity is a claim that should be verified, not asserted | LinkedIn, DEV, HN |
| **B — Design tokens** | Tokens are the real shared artefact; components are not | DEV, X, Reddit |
| **C — Engineering a design system** | Source of truth, generation, CI guardrails | DEV, HN, LinkedIn |
| **D — Accessibility & RTL** | Both are infrastructure, not a late patch | LinkedIn, DEV |
| **E — Build in public** | Bugs found, decisions made, numbers before/after | X, LinkedIn |
| **F — Platform-specific implementation** | How each platform's idiom actually differs | DEV, X, framework subreddits |

## The multiplier: one development event → many outputs

This is the engine. A substantive change becomes a week of material.

**Worked example — the Flutter "tokens without widgets" request:**

| Output | Angle |
| --- | --- |
| Long-form article | "Your design system's tokens should be usable without its components" |
| LinkedIn post | The request, the gap it exposed, what shipped |
| X thread | Before/after code: stock Flutter widgets styled from Kinetix tokens |
| Reddit (r/FlutterDev) | Genuine question: how do you consume a design system's tokens without buying its widgets? |
| Demo (30s) | `ThemeData` from `KinetixMaterialTheme.light()`, stock widgets inherit it |
| Changelog entry | What changed, who benefits, migration impact |
| Docs change | `/docs/flutter` token-only section |
| Roadmap signal | Token-only adoption is a real entry path — do it for every platform |

**Template for the next one:** `content/source-event-template.md`

## Standing rule

If a piece cannot cite a file, a check, a number or a commit, it is an opinion
post. Ship at most one of those a month.
