# Phase 0.75 — Public surface closure

**Against:** [`READINESS-AUDIT.md`](./READINESS-AUDIT.md) and
[`PHASE-0.5-REMEDIATION.md`](./PHASE-0.5-REMEDIATION.md) · **Date:** 2026-09-29
**Nothing was published, released, deployed or merged.** No npm package, no GitHub Release, no tag, no PR,
and no GitHub repository setting was changed.

## Public surface status

Four things changed on the public surface, all of them corrections rather than additions: a Code of Conduct
now exists, the security policy covers the two published packages it had been silently excluding, the issue
and PR templates let a contributor select the two platforms they could not select before, and one factually
false sentence in the positioning guidance was fixed.

Three findings came out of the work that were not on the list, and two of them matter more than anything on
it:

1. **`pnpm release:notes 0.2.0` produced the wrong cohort's notes and exited 0.** `0.2.0` is
   `@kinetixui/iot@0.2.0` today and was also the core release that shipped the rebrand on 2026-09-03.
   Anyone preparing the IoT Release by running the documented command would have pasted three-week-old
   notes about a rebrand onto it. Now refused, with the right source named.
2. **A guard had the right rule and could not see the sentence.** `marketing/positioning.md` said
   `@kinetixui/angular` was not on npm, months after it shipped, on the same page whose objection table
   called Angular installable. `current-truth.test.ts` has had a rule against exactly this since Angular
   was published. It missed it twice over: the sentence was hard-wrapped, so the package name and the
   denial were in different units; and the denial was **elliptical** — *"…are on npm; `@kinetixui/angular`
   and the three native libraries are not."* No phrase the guard searched for appears anywhere in it.
   Both holes are now closed and both were verified against the original text.
3. **No production-readiness claim about KinetixUI exists anywhere.** The audit flagged the claim as the
   highest-risk one available. A full search found it had never been made.

---

## Community readiness

### Created

| File | What it is | Note |
| --- | --- | --- |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1, with the standard attribution and enforcement ladder | See the contact caveat below |
| `.github/FUNDING.yml` | Every key commented out — **no account is named** | Parses as empty YAML, so GitHub renders no Sponsor button, which is correct for a project with no funding account |

`CORE-AUDIT.md:190` had already recorded the real blocker: *"Code of Conduct — open. Not added; needs an
adoption decision and a private contact for reports."* That is still the open part.

**The contact caveat, stated plainly.** A Code of Conduct with no working private channel is a promise it
cannot keep, and this repository has exactly one private channel: GitHub's vulnerability reporting form. The
document names it, says outright that it is not what the form was built for, and says why it is named
anyway. It also names GitHub's own abuse reporting as the escalation route, because with a single maintainer
"report it to the maintainer" is not a complete answer.

### Repaired — five concrete gaps, all the same shape

Every one was a surface that knew about three published packages when there are five.

| Surface | Gap | Fix |
| --- | --- | --- |
| `SECURITY.md` | "Supported versions" and "Scope" named `@kinetixui/{tokens,ui,cli}` only. By that text a vulnerability in `@kinetixui/angular` or `@kinetixui/iot` was **out of scope** | Scope now follows `release/publish-packages.json` — publishable means in scope — with the three version lines tabulated |
| `.github/PULL_REQUEST_TEMPLATE.md` | "Platforms affected" had no Angular and no IoT row | Both added, marked Preview and Experimental |
| `.github/PULL_REQUEST_TEMPLATE.md` | Changeset checklist named three of five cohorts | Now covers any published package, and says which share a version line |
| `.github/ISSUE_TEMPLATE/bug_report.yml` | Platform dropdown had no Angular and no IoT — **a user with an Angular bug could not file it** | Both added |
| `.github/ISSUE_TEMPLATE/feature_request.yml` | "Platforms it should exist on" had no Angular | Added, with its 31-of-98 scope in the label. IoT is deliberately absent: it is a module, not a platform a component exists on |

`CONTRIBUTING.md` gained one line linking the new Code of Conduct.

### Reviewed and deliberately left alone

| File | Why no change |
| --- | --- |
| `CONTRIBUTING.md` (structure) | Delegates to `/docs/contributing` rather than duplicating it. That is the right call and the file says why |
| `GOVERNANCE.md` | Accurate and unusually honest — "there's no RFC process today because there's no one to vote against". Nothing to correct |
| `.github/ISSUE_TEMPLATE/config.yml` | Blank issues disabled, security advisory and docs contact links present. Complete |
| `.github/CODEOWNERS` | **Not created.** One maintainer owns everything; a CODEOWNERS file would restate that and add a review gate with nobody else to satisfy it. Bureaucracy for its own sake |
| `SUPPORT.md` | **Not created.** `config.yml` already routes questions to the docs and security reports to advisories. A third file would only add a hop |

### New guard

`SECURITY.md` names five packages in prose, and prose drifts. Three tests in
`scripts/release/test/readme.test.mjs` now assert that the policy names every allowlisted package, points at
the allowlist as its authority, and still documents the private reporting route.

---

## Repository metadata recommendations

**No GitHub setting was changed.** This session has no repository-settings tooling — the GitHub tools
available here can read repository metadata but cannot write it — so everything below is a recommendation
for you to apply.

### Description

The current one enumerates, and the enumeration has already drifted: it names four platforms, omitting
Angular (published since 0.24.0) and IoT (since 0.1.0).

> **Recommended (185 characters):**
>
> `One DTCG token source compiled to every platform's own output, with native component implementations per platform — and a published, per-component record of what each is verified to do.`

No platform names, so it cannot drift as platforms are added, published or renamed. It leads with the
mechanism and closes on the differentiator that no competitor markets. Keyword discovery is left to topics,
which is what topics are for.

If you would rather name the one platform that cannot drift — `GOVERNANCE.md` makes React the invariant
source of truth — this variant is 199 characters:

> `One DTCG token source compiled to every platform's own output. React components and design tokens on npm; native implementations per platform, compiled in CI. Verification is published, not asserted.`

Avoid: any wording that names SwiftUI, Compose or Flutter next to "install", since none is distributed.

### Topics

Twenty, which is GitHub's maximum. Ordered by expected search value.

```
design-system  design-tokens  dtcg  style-dictionary  component-library
react  tailwindcss  radix-ui  typescript  accessibility
wcag  cross-platform  swiftui  jetpack-compose  flutter
angular  shadcn  monorepo  iot  design-system-tooling
```

Topics **should** enumerate platforms even though the description should not: they are search keys, and
someone looking for a SwiftUI design system searches `topic:swiftui`. A topic is not a distribution claim,
and the implementations it points at are real.

### Manual settings to check — not verified, not claimed

> **Since resolved — 2026-09-30.** Description and topics are both applied, and a custom social preview is
> uploaded. The rows below record what the API returned *when this audit ran*; they are left as written
> rather than retro-edited. Current verified state lives in [`../distribution/github.md`](../distribution/github.md) §1.


| Setting | Current (read via API) | Recommended |
| --- | --- | --- |
| Discussions | `has_discussions: false` | **Enable.** It is the only place launch traffic can land that is not the issue tracker |
| Wiki | `has_wiki: true` | **Disable** if still empty. An empty Wiki tab reads as an abandoned surface. Whether it is empty could not be checked from here |
| Description | 4 platforms, omits 2 published packages | Replace, above |
| Topics | none returned by the API | Set, above |

---

## Production endpoint results

**Every endpoint is UNVERIFIED.** `kinetixui.com` is denied by this container's network policy — the proxy
answered `403` to `CONNECT kinetixui.com:443`, six times, recorded in its own relay log. That is a fact
about this container and **not** evidence about production, so nothing below infers a status from source.
Expected behaviour *is* derived from source, which is legitimate: source is the build input.

| # | Endpoint | Expected | Actual | Status | Consumer | Impact if unavailable |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/r/registry.json` | `200`, `application/json`, `{ items: [...] }` with **97** entries | Not reached (403 CONNECT) | **UNVERIFIED** | `@kinetixui/cli` — `add`, `list`, `inspect`, `doctor`, via `DEFAULT_REGISTRY` | **Critical. Every `add` fails for every user.** No offline mode, no automatic fallback. This is the single point of failure for activation |
| 2 | `/r/<name>.json` (e.g. `/r/button.json`) | `200`, JSON with `name`, `files[]`, optional `registryDependencies` — **98** files exist | Not reached | **UNVERIFIED** | `@kinetixui/cli` — `resolveTree` | Critical, per component. `add button` fails even if the index loads |
| 3 | `/specs/<name>.json` (e.g. `/specs/button.json`) | `200` for the ~**97** that exist; **`404` is correct and expected** for components without a spec | Not reached | **UNVERIFIED** | `@kinetixui/cli inspect` | Low. `inspect` degrades to no variant table; `add` is unaffected |
| 4 | `/sitemap.xml` | `200`, `application/xml`, **127** `<loc>` entries, no `/r/` paths | Not reached | **UNVERIFIED** | Search engines | Medium and slow-acting. Organic discovery degrades; nothing user-facing breaks |
| 5 | `/robots.txt` | `200`, `text/plain`, `Allow: /`, `Disallow: /r/`, a `Sitemap:` line | Not reached | **UNVERIFIED** | Crawlers | Medium. Without `Disallow: /r/`, 98 JSON payloads become indexable search results |
| 6 | `/schema/config.json` | `200`, JSON Schema with a `registry` property (added in Phase 0.5) | Not reached | **UNVERIFIED** | Editors validating a user's `kinetixui.json` | Low. Editor validation stops working; nothing fails at runtime |

### Run this to close it

One command. Every expected value above is asserted, so the output is pass/fail rather than something to
read.

```bash
set -e
base=https://kinetixui.com

# 1 — the CLI's index. The count is the one that matters: 97 items.
curl -fsS "$base/r/registry.json" | jq -e '.items | length == 97' \
  && echo "OK  /r/registry.json — 97 items" || echo "FAIL /r/registry.json"

# 2 — one component descriptor, with the shape resolveTree needs.
curl -fsS "$base/r/button.json" | jq -e '.name == "button" and (.files | length > 0)' \
  && echo "OK  /r/button.json" || echo "FAIL /r/button.json"

# 3 — a spec that exists, and a 404 that is correct rather than a failure.
curl -fsS "$base/specs/button.json" | jq -e '.name == "button"' \
  && echo "OK  /specs/button.json" || echo "FAIL /specs/button.json"
test "$(curl -s -o /dev/null -w '%{http_code}' "$base/specs/does-not-exist.json")" = 404 \
  && echo "OK  /specs 404 for a missing spec (expected, not an error)" || echo "WARN /specs 404 behaviour"

# 4 — the sitemap, and that it does not advertise the registry.
n=$(curl -fsS "$base/sitemap.xml" | grep -c '<loc>')
echo "    /sitemap.xml <loc> count: $n (expected 127)"
curl -fsS "$base/sitemap.xml" | grep -q '<loc>[^<]*/r/' \
  && echo "FAIL sitemap advertises /r/" || echo "OK  sitemap does not advertise /r/"

# 5 — robots.
curl -fsS "$base/robots.txt" | grep -q 'Disallow: /r/' \
  && echo "OK  robots disallows /r/" || echo "FAIL robots does not disallow /r/"

# 6 — the config schema, including the key Phase 0.5 added.
curl -fsS "$base/schema/config.json" | jq -e '.properties.registry != null' \
  && echo "OK  /schema/config.json has the registry key" || echo "FAIL /schema/config.json"
```

**The one that decides activation** is the end-to-end test, not the endpoints:

```bash
cd "$(mktemp -d)" && npm init -y >/dev/null
npx @kinetixui/cli@latest init --yes && npx @kinetixui/cli@latest add button card
ls components/ui/   # expect button.tsx and card.tsx
```

If that succeeds, endpoints 1 and 2 are proven and the activation claim is safe to make. If it fails, no
amount of positioning matters until it does.

---

## Release actions

Three Releases, one per cohort. **All three tags already exist on `origin`; none has a Release.** Only
`v0.5.0` and `v0.4.1` do, from 2026-09-06.

### 1 — Core cohort

| | |
| --- | --- |
| **Tag** | `@kinetixui/ui@0.23.3` — the canonical tag for the cohort, which is how `/docs/changelog` already treats it |
| **Packages** | `@kinetixui/ui@0.23.3`, `@kinetixui/tokens@0.23.3`, `@kinetixui/cli@0.23.3` (one shared version line) |
| **Body** | `pnpm release:notes 0.23.3` — verified to produce correct notes |
| **Tag exists** | Yes — `b580575037` |
| **Release exists** | No |
| **Afterwards** | Set `githubReleaseUrl` on the `version: "0.23.3"` entry in `apps/web/src/lib/releases.ts` |

### 2 — Angular cohort

| | |
| --- | --- |
| **Tag** | `@kinetixui/angular@0.24.0` |
| **Packages** | `@kinetixui/angular@0.24.0` |
| **Body** | **No `release:notes` command exists.** `0.24.0` is not a core version, so `RELEASES` does not describe it. Use the `## 0.24.0` section of `packages/ui-angular/CHANGELOG.md`, which Changesets generated and which is already a good release body |
| **Tag exists** | Yes — `36df86e174` |
| **Release exists** | No |
| **Afterwards** | **Nothing.** `releases.ts` has no `0.24.0` entry, because `RELEASES` is the core line. Do not add one, and do not set `githubReleaseUrl` on some other version's entry |

### 3 — IoT cohort

| | |
| --- | --- |
| **Tag** | `@kinetixui/iot@0.2.0` |
| **Packages** | `@kinetixui/iot@0.2.0` |
| **Body** | **Do not run `pnpm release:notes 0.2.0`.** Use the `## 0.2.0` section of `packages/iot/CHANGELOG.md` |
| **Tag exists** | Yes — `b52c5f07b5` |
| **Release exists** | No |
| **Afterwards** | **Nothing** — `releases.ts`'s `0.2.0` entry is the *core* 0.2.0 from 2026-09-03. Setting `githubReleaseUrl` on it would link the rebrand release to the IoT Release |

### The collision, and what was done about it

`pnpm release:notes 0.2.0` used to print the core 0.2.0 notes — *"Rebrand to KinetixUI"*, dated
2026-09-03 — and exit 0. Following the Phase 0.5 instruction to use `release:notes` for all three would have
put those notes on the IoT Release. The script now refuses a version that is also an independently versioned
package's current release, names the package, and points at that package's own CHANGELOG. `--ui` confirms
the core line when that is genuinely what is wanted. `0.24.0`, which used to fail with a bare "unknown
version", now says where Angular's notes live.

Covered by `scripts/release/test/release-notes-cohorts.test.mjs` (5 tests), including the assertion that
each independent cohort has a `## <version>` section to take a body from.

**This corrects Phase 0.5's own recommendation**, which said to use `pnpm release:notes <version>` for all
three and to set `githubReleaseUrl` on all three. Only the core one is right on both counts.

### No backfill

92 tags have no Release and will not get one. Dates would be wrong on every one and every watcher would
receive 92 notifications. `RELEASING.md` records the reasoning.

---

## Production-ready claim findings

**No occurrence anywhere asserts that KinetixUI is production-ready.** The audit ranked this the
highest-risk claim available; it turns out never to have been made. A search for `production[ -]?ready`,
`ready for production`, `enterprise[ -]?ready`, `battle[ -]?tested`, `production[ -]grade`,
`industrial[ -]strength` and `rock[ -]solid` across every `.md`, `.mdx`, `.ts`, `.tsx`, `.json`, `.yml`,
`.swift`, `.kt` and `.dart` file returned four distinct occurrences:

| Occurrence | What it says | Classification | Action |
| --- | --- | --- | --- |
| `packages/ui/src/components/kanban-board.tsx:53` (and its two generated copies in `registry/` and `public/r/`) | A doc comment: hand-rolling accessible drag-and-drop "would likely be worse than a **battle-tested** library", explaining why `@dnd-kit` is a dependency | **INTERNAL ONLY** — and **VERIFIED** as a statement about `@dnd-kit`, which it is | None. It is a claim about a dependency, in source, and it is true |
| `packages/ui/CHANGELOG.md:298` | The same sentence, in the changeset that added the component | **INTERNAL ONLY** — and historical | None. Changelogs are not retro-edited here |
| `marketing/content/drafts/a02/publish-checklist.md:55` | Lists "best-in-class, 'the future of', production-ready everywhere" among the phrases **not** to write | **INTERNAL ONLY** | None. It is a ban list; it is the guard working |
| `marketing/audits/*.md` | These audits discussing whether the claim may be made | **INTERNAL ONLY** | None |

**Nothing needed changing.** The exposure was never a claim in place — it was how easy the claim would be to
write and how hard to notice, because so much of the evidence looks like it supports one: 2,674 tests,
roughly 35 CI gates, an empty axe baseline, npm provenance on all five packages. None of those is the claim.
The claim is that a product is finished, and the project says otherwise in its own voice: every published
package is `0.x`, IoT is Experimental, Angular is Preview, and the homepage eyebrow reads "Free while in
beta".

### Guard added

Four tests in `apps/web/src/lib/marketing-claims.test.ts`, tied to evidence rather than taste:

- **The premise is asserted.** Every published package must still be `0.x`. The day one reaches `1.0.0`
  this test fails and the wording gets reconsidered deliberately instead of drifting in.
- No public copy may contain any of the overstated phrases.
- The homepage must still state its stage (`beta`).
- No copy may promise API stability the `0.x` line does not support — `stable API`, `no breaking changes`,
  `semver guarantee`.

Mutation-tested three ways: inserting "production-ready", "battle-tested" and "stable API" into `README.md`
each failed the suite. The component source, the ban-list draft and these audits are outside the guarded
copy set on purpose — a rule that cannot tell a claim from its refutation gets deleted for being annoying.

### What may be said instead

Every one of these is measurable and currently true: **2,674 tests passing, 0 failing, 0 skipped**;
~35 CI gates of which 8 exist only to fail when documentation drifts from source; **zero baselined
accessibility violations** across 102 stories in light and dark with every axe rule enabled; WCAG AA
contrast audited on every semantic token pair; **npm provenance (SLSA v1) on all five packages**;
90 of 98 components on all four catalogue-complete platforms with 8 documented exceptions;
**20 Blocks at true 5-platform parity**.

---

## Release dry-run results

Maximum safe exercise. Nothing published, no Release created, no tag pushed.

| Stage | Result |
| --- | --- |
| `pnpm release:check` | **PASS** — 5 allowlisted packages publication-ready, 4 private and excluded |
| `pnpm release:plan` | **PASS** — three cohorts resolved (`core`, `angular`, `iot`), all versions already on the registry, publish set empty |
| `pnpm release:preflight` | **PASS** — and short-circuits: "nothing to publish; every allowlisted version is already on the registry" |
| Packing, all five | **PASS** — 31 / 208 / 4 / 8 / 50 files |
| `validatePackedArtifact`, all five, against the **packed** manifests | **PASS — 0 errors across all five** |
| `workspace:*` rewriting | **PASS** — `@kinetixui/ui`'s tokens dependency packs as `0.23.3`, not `workspace:*` |
| Provenance metadata | **PASS** — `publishConfig: { access: "public", provenance: true }` on all five, read from inside each tarball |
| Workflow permissions | **PASS** — `release` job has `id-token: write` (OIDC attestation), `contents: write`, `pull-requests: write`; `preflight` has `contents: read` and no OIDC |
| `NPM_CONFIG_PROVENANCE` | **PASS** — `true` |
| `createGithubReleases` | **PASS** — explicitly `false`, with the summary path set |
| GitHub Release planning | **PASS** — a synthetic core+iot run yields the 4 expected Releases, the cohort that published nothing yields none, every body links the changelog |
| Release step failure mode | **PASS** — `continue-on-error: true`, and the script exits 0 with an explanation when given no summary or an unreadable one |
| `pnpm release:notes 0.23.3` | **PASS** |

### Two findings from the dry run

**The preflight could not have proven the README requirement.** With every version already published the
plan is empty, nothing is packed, and the tarball checks never run. That is why the requirement is asserted
in `test:release`, which runs on every commit, rather than only at release time. It also means a green
`release:preflight` today says less than it looks like it says — it is a real gate, but only when there is
something to publish.

**A core release will create three GitHub Releases, not one.** All three core packages are tagged, so
`releasesOwed` returns three — three near-identical pages, three watcher notifications, all linking the same
changelog. The site already treats `@kinetixui/ui@<version>` as the cohort's canonical tag. **Recommended
change, not made here:** have `releasesOwed` emit one Release per cohort at its canonical tag. It is a small
change to automation that has not run yet, and adding a second unproven behaviour before the first has been
exercised is the wrong order — so it is flagged for your decision before the next release rather than
changed now. If it ships as-is, the cost is two extra Releases that can be deleted.

### What only a real release can prove

1. **That `pnpm release` writes the summary** at `KINETIXUI_RELEASE_SUMMARY`. The writer is exercised only
   on a run that publishes.
2. **That `gh release create` succeeds** with `GITHUB_TOKEN` and `contents: write`. The logic is tested
   against a fake `gh`; the real one has never been called.
3. **That `createGithubReleases: false` does not suppress something else** the action was doing.
4. **That the peer gate holds.** `onlyUpdatePeerDependentsWhenOutOfRange` still has not been exercised,
   because that needs a **core** release. IoT 0.2.0 moved no cohort member. This has been pending since
   Phase 0.
5. **That publishing still works end to end** — npm auth, OIDC provenance, registry confirmation before
   tagging.

None of these is a Phase 1 blocker. All five are proven by one ordinary release.

---

## Phase 1 marketing-document inventory

Freshness was measured, not guessed: the campaign drafts ship their own verifiers and they were run.

### Strategy and guidance

| File | Purpose | Freshness | Verified claims? | Overlap | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `README.md` | The directory's own rules; source-of-truth hierarchy | **Current** — rewritten in Phase 0.5 | Yes — points at `marketing:stats` and names six distinct questions | Authority over all others | **KEEP** |
| `positioning.md` | What KinetixUI is, who it is not for, the risk list | **Current, with one sentence corrected today** — risk 3 claimed Angular was not on npm | Now yes. It carries a `Corrected 2026-09-29` note in the file's own convention | Overlaps `messaging.md` on the value proposition | **UPDATE** in Phase 1 — the positioning is sound; it predates the installable-versus-source-only distinction and should lead with it |
| `messaging.md` | Headline, subhead, proof points | **Current** — headline matches the live site tagline | Partly — the headline is derived-consistent; the proof points need re-checking against the claim matrix | Overlaps `positioning.md` and `content-pillars.md` | **UPDATE** — reconcile against `READINESS-AUDIT.md`'s matrix and `TREE-SHAKING.md` |
| `personas.md` | ICPs, ordered by how well KinetixUI serves them | **Stale in one dimension** — does not distinguish a React developer (can install today) from a native developer (cannot) | No numbers to verify | Feeds `content-pillars.md`, `seo.md` | **UPDATE** — that distinction is now the sharpest segmentation available |
| `seo.md` | Topic clusters, landing-page architecture | **Mostly current** | No | Overlaps `content-pillars.md` | **UPDATE** — predates the corrected canonical finding and the single-OG-image gap |
| `content-pillars.md` | Six pillars; every piece must contain a verifiable fact | **Current** | The rule is the verification | Overlaps `seo.md`, `content-calendar.md` | **KEEP** |
| `content-calendar.md` | 30-day cadence | **Current but unstarted** | n/a | Overlaps `content/backlog.json` | **UPDATE** — sequencing assumes a launch posture the scorecard does not yet support |
| `community.md` | Per-channel angles | **Current, one broken instruction** — captures into `research/`, which does not exist | n/a | Overlaps `launches.md` | **KEEP**, fix the path or create the directory |
| `launches.md` | Staged launch criteria, Product Hunt prep | **Current** | Criteria are facts, by design | Overlaps `community.md` | **UPDATE** — its entry criteria should reference this phase's manual actions as gates |
| `experiments.md` | Growth backlog, no fake confidence scores | **Current** | Honest about having no baseline | Minimal | **KEEP** |
| `analytics.md` | Funnel, event taxonomy | **Current** | Matches the typed `ANALYTICS_*` unions | Minimal | **UPDATE** — one event was added this phase (`platform_availability`) and the funnel is still undefined |
| `roadmap.md` | 30/60/90 outcomes, explicitly directional | **Current** | Refuses to invent numbers | Overlaps `launches.md` | **KEEP** — internal. If a public roadmap is ever made, wearables must not appear on it |
| `weekly-review.md` · `monthly-review.md` | The review ritual | **Current, same broken path** — both write into `research/` | The ritual's own rule is "read every number from source" | Duplicate each other by design | **KEEP**, fix the path |

### Campaign drafts — both fail their own verifiers

| File | Purpose | Freshness | Verified claims? | Recommendation |
| --- | --- | --- | --- | --- |
| `content/drafts/a01/*` (10 files) | "Your cross-platform design system may be lying about parity" — article, X thread, LinkedIn, dev.to, sources, measurement, visual brief, checklist | **STALE** — `verify-package.mjs` **exits 1, 2 problems**: `sources.md` and `publish-checklist.md` name version `0.23.1`, which no package is at (core is 0.23.3, angular 0.24.0) | `verify-evidence.mjs` passes **48/48**. The historical before/after tables are intact and correct | **UPDATE before publishing.** The argument is strong and still true; only the version strings are stale |
| `content/drafts/a02/*` (7 files) | Second campaign piece | **STALE** — `verify-package.mjs` **exits 1, 2 problems**: the same `0.23.1` in `sources.md` and `publish-checklist.md` | Every other assertion passes, including "no unpublished claim for the published `@kinetixui/angular`" | **UPDATE before publishing** |
| `content/campaign-sequence-a01-a02.md` | Operator sequence for running both | Current | n/a | **KEEP** |
| `content/visual-production-a01-a02.md` | Visual production plan | Current | n/a | **KEEP** |
| `content/backlog.json` | Machine-readable piece backlog | Current | n/a | **KEEP** |
| `content/source-event-template.md` | Template for turning a release into content | Current | n/a | **KEEP** |

**Do not archive either draft.** Their verifiers are the reason the staleness is known at all, and both
would pass after a version-string pass. `a01`'s article has also drifted 1.9% in length since its verifier
recorded a baseline — tracked, not a problem.

### Audits

| File | Recommendation |
| --- | --- |
| `audits/READINESS-AUDIT.md` | **KEEP** — dated snapshot, never retro-edited. Its claim matrix is the Phase 1 input |
| `audits/PHASE-0.5-REMEDIATION.md` | **KEEP** — note that this document corrects two of its recommendations (release notes, `githubReleaseUrl`) |
| `audits/TREE-SHAKING.md` | **KEEP** — the wording rules in it are binding on Phase 1 copy |
| `audits/PHASE-0.75-PUBLIC-SURFACE.md` | This file |

### Cross-cutting

- **`research/` does not exist** but `weekly-review.md`, `monthly-review.md`, `community.md` and
  `roadmap.md` all write into it. The first weekly review will fail its own first instruction. One
  `mkdir` and a `.gitkeep`, or four path edits.
- **No competitive-positioning document exists.** `positioning.md` has an objection table, which is not
  the same thing. If Phase 1 needs competitor comparison, it is a new document, not an edit.

---

## Remaining manual actions

Carried forward, with what changed. Nothing here can be done from the repository.

| # | Action | Status |
| --- | --- | --- |
| 1 | **Verify the production endpoints** and the end-to-end `add`. Commands above | **Open — the only Phase 1 blocker** |
| 2 | Create the three GitHub Releases, per the tables above. Only the core one takes a `githubReleaseUrl` | Open — corrected this phase |
| 3 | Set the repository description and topics | Open — exact values above |
| 4 | Enable Discussions; disable the Wiki if empty | Open |
| 5 | Add a private contact address to `CODE_OF_CONDUCT.md`, replacing the advisory-form stopgap | Open — new this phase |
| 6 | Decide whether to enable GitHub Sponsors, then uncomment one line in `.github/FUNDING.yml` | Open — the file now exists with nothing active |
| 7 | Add `keywords` to `@kinetixui/cli` and `bugs` to all five packages | Open — belongs with a release |
| 8 | Decide whether a core release emits one Release or three, before the next release | **New — decision needed** |
| 9 | Run one ordinary release, which proves the five unproven things listed above | Open |

---

## BLOCKS PHASE 1

Strictly one.

### 1. The production endpoints are unverified, and `/r/registry.json` is the activation path

Phase 1 will write positioning that rests on *"copy a component into your project with one command"*. That
sentence is either true or it is the most damaging claim on the page, and **nobody has confirmed it since
before the audit.** `DEFAULT_REGISTRY` is a single origin, `add` has no offline mode and no automatic
fallback, and this environment has been unable to reach the host across three phases.

This is a claim-accuracy blocker, not an engineering one, which is why it is here and nothing else is. It is
also roughly ten minutes of your time — the two command blocks above.

**Nothing else blocks Phase 1.** Explicitly including things that might look like blockers:

- The three missing GitHub Releases damage trust *at launch*, not the work of writing positioning.
- The stale `0.23.1` strings block **publishing a01/a02**, not Phase 1 reconciliation — and Phase 1 is
  where they get fixed.
- The repository description and topics affect discovery, which matters when traffic arrives, not when
  copy is written.

## DOES NOT BLOCK PHASE 1

Everything below is real and worth doing. None of it changes what Phase 1 may claim.

| Item | Why it does not block |
| --- | --- |
| Three GitHub Releases missing | Trust signal at launch. Positioning can be written and reviewed without them; they must exist before traffic arrives |
| Repository description and topics | Discovery. Needed at launch, not to write copy |
| Discussions off, Wiki possibly empty | Community surface. Needed before traffic, not before strategy |
| Code of Conduct contact is a stopgap | The channel works today and reaches the maintainer privately. An address improves it; its absence blocks nothing |
| `FUNDING.yml` has no account | No Sponsor button is the correct state for a project with no funding account |
| `@kinetixui/ui` cannot tree-shake per component | Stated in the package README and in `TREE-SHAKING.md`. A documented limitation is not a claim risk — and Phase 1 must respect the wording rules there |
| One site-wide OG image | Share CTR. An optimisation |
| Canonicals on 4 of 127 pages | Corrected finding: they exist where URL state makes them matter. The rest is a mild SEO improvement |
| `keywords` on `cli`, `bugs` on all five | npm metadata. Belongs with a release |
| A core release emitting three Releases | Cosmetic, reversible, and a decision rather than a defect |
| `research/` missing | Breaks the first weekly review, not any public claim |
| Five things only a real release can prove | Including the Angular peer gate. All proven by one ordinary release |
| End-to-end CLI command tests | The parser, registry layer, writer and config are covered. Orchestration is not, and no public claim depends on it |
| No visual-regression suite | `visual: 0` on every platform, stated everywhere. Phase 1 simply may not imply pixel safety |
| Community readiness at 3/10 | Honest for a 2-star project. Phase 1's job is partly to change it |
