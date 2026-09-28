# Phase 0.5 — Marketing readiness remediation

**Against:** [`READINESS-AUDIT.md`](./READINESS-AUDIT.md) at `ad21dcd` · **Date:** 2026-09-28
**Nothing was published, deployed, released or merged.** No GitHub Release was created, no npm package was
published, no PR was opened.

## Executive summary

Seven P0 areas were worked. **Five are FIXED, one MITIGATED, one NEEDS MANUAL ACTION**, and two pieces of
engineering are explicitly DEFERRED with the reasoning written down rather than left implied.

The through-line: almost every defect was a **derivation missing**, not a lie being told. A hardcoded package
list, a sentence derived from one field where two were needed, a guard that only looked at one distribution
channel, a claim nobody had written down as a limitation. Where something was hand-maintained, it had drifted;
where it was derived, it was right. So the work was mostly moving claims onto the source that already existed,
and adding the guard that makes the next drift fail a build instead of reaching a reader.

Three things are worth calling out because they were not in the audit:

1. **The audit was wrong about canonical URLs.** It said there were none anywhere. There are — on exactly the
   four pages with URL query state (`/components`, `/create`, `/docs/changelog`, `/iot`), via a `canonical()`
   helper in `src/lib/seo.ts`. The original grep looked for `alternates` and missed the wrapper. Corrected
   below; the remaining gap is much narrower than reported.
2. **The distribution guard was passing vacuously.** `marketing-claims.test.ts` already banned install
   commands for unpublished packages — but only for npm-channel ones, and every npm package is published, so
   the set it checked was empty while three platforms on other channels were undistributed.
3. **`release:preflight` could not have caught the missing READMEs.** When every allowlisted version is
   already on the registry the publish plan is empty, nothing is packed, and the tarball checks never run. The
   README requirement is therefore asserted in the test suite that runs on every commit, not only at release.

**Score: 5.5 → 7.1 of 10.** The product did not change. What changed is that the acquisition surface now says
what the product is, and the claims that were merely true are now enforced.

---

## P0 issues, one by one

### 0. Two competing marketing sources of truth — **FIXED**

| | |
| --- | --- |
| **Previous state** | A populated `marketing/` at the repository root (positioning, messaging, personas, SEO, content calendar, two campaign drafts) and a new `docs/marketing/` holding the audit. Two trees, no stated precedence. |
| **Remediation** | `marketing/` kept as canonical — it is referenced by `scripts/release-to-content.mjs` and by three test files (`current-truth.test.ts`, `campaign-links.test.ts`), so moving it would have broken tooling. The audit moved to `marketing/audits/READINESS-AUDIT.md`; `docs/` is gone entirely. `marketing/README.md` gained a generated-versus-maintained split, a five-level source-of-truth hierarchy, an audits section and a where-new-work-goes table. |
| **Evidence** | `git mv` recorded as `R098`. No `docs/` directory remains. `grep -rn 'docs/marketing'` returns only the audit's own historical text. |
| **Also fixed** | `marketing/README.md` had drift of its own: it listed a `campaigns.md` and a `research/` that do not exist, omitted `analytics.md` and `roadmap.md` which do, described publication as a four-package fact, and pointed "published version" at `packages/ui/package.json` alone — which stopped describing the product when Angular and IoT began versioning independently. |
| **Remaining risk** | Low. The `marketing/*.md` guidance documents still contain Phase 1 positioning that predates the audit — see [Phase 1 reconciliation](#phase-1-reconciliation). |
| **Status** | **FIXED** |

### 1. Four published packages with no README — **FIXED**

| | |
| --- | --- |
| **Previous state** | `@kinetixui/ui`, `@kinetixui/cli`, `@kinetixui/tokens` and `@kinetixui/angular` shipped no README, so each rendered a blank page on npmjs.com. Only `@kinetixui/iot` had one. LICENSE was present in all five (pnpm copies the root one at pack time; it does not do this for READMEs). |
| **Remediation** | Four READMEs written, each tailored rather than templated. `README.md` added to `requireFiles` for **all five** packages, so `validatePackedArtifact` fails the release if one is missing from the tarball. `ng-package.json` copies the README into `packages/ui-angular/dist`, which is the directory that actually gets packed. |
| **Evidence** | All five packages re-packed: `README=1 LICENSE=1` for each. The gate was exercised directly — a tarball without it produces `release/publish-packages.json requires "README.md", which is not in the tarball`. `scripts/release/test/readme.test.mjs` (4 tests) asserts the requirement, the file's existence, a minimum length, a heading, sections, an install path and a licence statement. |
| **What each says** | `ui` carries the bundle-size limitation instead of a tree-shaking claim, and the registry as the lean alternative. `cli` documents that `add` needs the registry origin and has no offline mode. `tokens` explains that the native files are source to copy, not a distributed package. `angular` leads with **Preview** and **31 of 98**, lists exactly which components exist and which categories do not, and explains the directive-versus-component split. |
| **Found while doing it** | The IoT README said "five React primitives" — it has been fourteen since 0.2.0 — and never stated its licence. Both fixed; the licence gap was caught by the new test, not by reading. |
| **Remaining risk** | Low. The READMEs are hand-maintained prose and can age. The counts in the Angular one (31 of 98, 69 symbols) are the kind of number that drifts; they are stated with a link to the generated page that is authoritative. |
| **Status** | **FIXED** |

### 2. Availability conflated with maturity — **FIXED**

| | |
| --- | --- |
| **Previous state** | `platformSentence` derived from `maturity` alone. Every native port is `maturity: "stable"` and `published: false`, so the hero, the OpenGraph snippet and the docs landing named five platforms a reader reasonably heard as five installable things. The deep platform docs were scrupulous ("Not on Maven Central yet", "Not on pub.dev"); the top of the funnel was not. |
| **Remediation** | `platform-prose.ts` now derives `INSTALLABLE_PLATFORMS`, `SOURCE_ONLY_PLATFORMS`, `installableSentence`, `sourceOnlySentence`, `availabilitySentence` and `availabilityClause` from `distribution.published`. Both halves collapse automatically if the native ports are ever published. Applied to the hero (with its own instrumented link to `/docs/platforms`), the site description, the docs landing (via a new `<PlatformAvailability />` MDX component) and the `/components` search snippet. No hand-maintained list was introduced. |
| **Evidence** | `React and Angular (preview) install from a package registry today. SwiftUI, Jetpack Compose and Flutter are real implementations, compiled in CI, not yet distributed as packages.` — printed from the manifest, not typed. `marketing-claims.test.ts` 11 → 15 tests. |
| **The guard that was missing** | The existing install-command ban only inspected npm-channel packages, so its `unpublished` set was empty. It now builds Maven / pub.dev / SwiftPM dependency syntax from each coordinate, and a second test requires any surface naming an undistributed platform to state somewhere that it is not distributed. **That second test is what caught `README.md` and the docs landing** — neither said it. |
| **Other surfaces audited** | `/blocks` was already honest ("carry real source"). `/charts` and `/create` name the platforms as implementation approaches and export targets, which is accurate. `/iot` already said "there is no SwiftUI, Compose or Flutter port of them". `/infographic` names them as token output formats and derived port counts — reviewed and accepted. Only `/components` needed a fix, and it is now in the guarded set. |
| **Deliberately not done** | The audit's `platformSentence` is unchanged in the places that describe *implementation* ("each implement the same component contract natively"), because there the maturity-derived sentence is the correct one. |
| **Remaining risk** | Low. The distinction is derived and guarded in both directions. |
| **Status** | **FIXED** |

### 3. Release visibility — **MITIGATED** (future releases) / **NEEDS MANUAL ACTION** (history)

| | |
| --- | --- |
| **Previous state** | 94 git tags, 2 GitHub Releases. The newest Release was `v0.5.0` from 2026-09-06 while npm served `0.23.3`. Anyone checking recency read the repository as dormant. |
| **Root cause (A)** | Structural, not neglect. `changesets/action` creates Releases by parsing the Changesets CLI's `New tag: <pkg>@<version>` lines out of its publish command's stdout. This repository publishes with `pnpm release` — its own preflight-and-publish pipeline, which prints its own report. The action never had anything to parse, so it created nothing, silently, and would never have self-corrected. Nothing anywhere in `.github/` or `scripts/` created a Release. |
| **Intended architecture (B)** | Per-package tags `@kinetixui/<pkg>@<version>`, three cohorts (`core`, `angular`, `iot`), created by `reconcileReleaseTags` **after** the registry confirms each version. `v0.4.1`/`v0.5.0` are from an older scheme the current pipeline does not produce. |
| **Documentation fixed (C)** | The site was already honest — `changelog-view.tsx` links "Tag on GitHub" unless `githubReleaseUrl` is set, and no entry sets it. Three places said "there are no GitHub Releases after v0.5.0", which is true today and becomes false at the next release; all three now describe the rule rather than the snapshot. Nothing in the repository ever claimed v0.5.0 was current. |
| **Automation prepared (D)** | `pnpm release` writes a summary of what it published and tagged when `KINETIXUI_RELEASE_SUMMARY` is set (nothing otherwise, so a local run leaves no artifact). `scripts/release/github-releases.mjs` turns that into one Release per tag. `createGithubReleases: false` is now explicit on the action so the disabled path is a decision, not an accident of output format. |
| **Four rules, tested** | Never fatal (`continue-on-error`, and the script exits 0 on a `gh` failure — npm and the tags are already irreversible when it runs). Idempotent (an existing Release is never edited or replaced, and a probe that fails for any reason other than absence is read as "exists", because a duplicate is worse than a gap). No backfill (only tags from this run, so the repair tags `reconcileReleaseTags` pushes for an *earlier* failed release cannot become Releases dated today). No invented prose (notes link the changelog and the exact npm version). |
| **Evidence** | `scripts/release/test/github-releases.test.mjs` — 10 tests, including the repair-tag case and the duplicate-probe case. A guard built on `hashFiles` was removed after finding it would be permanently false: `hashFiles` only sees paths inside `GITHUB_WORKSPACE` and the summary is written to the runner temp dir. |
| **Remaining risk** | Medium, and unavoidable: the new step has never run against real GitHub. It is designed so that the worst outcome is no Release rather than a failed release. First real exercise is the next publish. |
| **Manual action** | The 92 historical tags are deliberately **not** backfilled — 92 Releases dated today would fabricate a history and fire 92 watcher notifications. `RELEASING.md` recommends creating **three** by hand instead (the current version of each cohort), with `pnpm release:notes <version>` for the body, then setting `githubReleaseUrl` on those entries in `releases.ts`. That is a human decision and nothing automates it. |
| **Status** | **MITIGATED** for future releases · **NEEDS MANUAL ACTION** for history and for the three catch-up Releases |

### 4. `marketing:stats` omitted `@kinetixui/iot` — **FIXED**

| | |
| --- | --- |
| **Previous state** | `scripts/marketing-stats.mjs:53` hardcoded `["@kinetixui/ui","@kinetixui/cli","@kinetixui/tokens","@kinetixui/angular"]`. IoT was published and the script kept reporting four packages — the anti-drift tool drifting, which is the one failure it cannot afford. It also printed `ui.version` as *the* version, which stopped describing the product when the cohorts split, and no IoT figures at all. |
| **Remediation** | The list derives from `release/publish-packages.json` — the same file the release pipeline publishes from. Per-cohort versions replace the single number. Two sections added: **installable versus source you compile** (because maturity does not answer "can someone get this"), and a note that 98 catalogue entries are 97 components plus one documented recipe. |
| **Evidence** | Output now lists all five packages with cohorts, and `combobox` is named as the recipe. `scripts/release/test/marketing-stats.test.mjs` — 5 tests: the list matches the allowlist in order, more than one cohort exists, versions and licences match each manifest, **no package name appears as a literal in the script** (comments stripped first, so an explanation of the bug is not mistaken for the bug), and the pure half does not reach the network. |
| **Mutation-tested** | Reintroducing a hardcoded filter → 1 failure. Making `releasePackages()` shell out → 1 failure. Both restored clean. |
| **Remaining risk** | Low. A package that is publishable but absent from the allowlist would still be missed — but `release:check` already fails for exactly that, since every workspace package must be allowlisted or private. |
| **Status** | **FIXED** |

### 5. Tree-shaking claim — **FIXED** (claim) / **DEFERRED** (architecture)

| | |
| --- | --- |
| **Previous state** | One `Button` import costs 677,991 B minified of a 1,014,740 B whole-library bundle — 66.8 %. `sideEffects: false` is declared and cannot help. |
| **Search result** | **No public claim existed to retract.** A full search for `tree.?shak`, `sideEffects`, `bundle size`, `only what you use` and `dead code` across every `.md`, `.mdx`, `.ts`, `.tsx` and `.json` found only an internal comment about `@tanstack/react-table`'s own opt-in `features` API and the correct `sideEffects` metadata. What was missing was the opposite: any statement of the limitation. |
| **Remediation** | The `ui` README states it with the measured numbers and points to the registry as the lean path. `marketing/audits/TREE-SHAKING.md` documents the architecture, why `sideEffects: false` is a permission rather than a mechanism (the unit a bundler can drop is a module, and 97 components share one), the 195-byte contrast with `@kinetixui/iot/functions`, three candidate architectures with additive subpath exports recommended, seven migration risks, and a reproduction script. |
| **Also corrected** | The new tokens README initially claimed its JS entry "stays shakeable". Measured: `tokens` is one atomic object, ~8 KB minified, with no per-token granularity. Reworded, and the reason `sideEffects: ["*.css"]` exists is stated instead. |
| **Deferred** | The packaging change itself. It is additive and low-risk in principle, but it needs the packed-consumer smoke test extended to every new subpath in the same change — otherwise coverage that protects one entry point silently protects one of ninety-eight — and generated `exports`/`requireFiles` rather than hand-written ones. That is a product-engineering task, not a marketing remediation. |
| **Remaining risk** | Low as a claim risk. Real as a product risk: a developer who measures the npm package will find what the audit found. The README now tells them first, which converts a discovered flaw into a stated trade-off. |
| **Status** | **FIXED** (claim) · **DEFERRED** (packaging) |

### 6. CLI had zero tests, and one hard dependency on one origin — **FIXED** (tests) / **MITIGATED** (resilience)

| | |
| --- | --- |
| **Previous state** | `packages/cli` had no test script, no test files and no test dependency — the only untested first-party surface, and the primary activation path. `DEFAULT_REGISTRY = "https://kinetixui.com/r"` was overridable only by passing `--registry` on every single invocation. |
| **Why there were no tests** | Not neglect either: the command tree was built at module scope in `index.ts`, which ends in `program.parseAsync()`, so importing anything from the entry point *ran the CLI*. There was no way to inspect the parser without invoking it. |
| **Remediation — tests** | The tree moved to `createProgram()` in `src/program.ts`; `index.ts` is now four lines and still parses unconditionally, so there is no "am I the main module" check to get wrong. **89 tests across 5 files**, covering: command parsing (every command registered, descriptions present, `--version` from the package, variadic arguments, option defaults, unknown command, unknown option, missing option value, nested `theme`/`preset` subcommands); registry resolution (trailing slash, specs served *beside* the root); component lookup (404, invalid name refused before any request); the add happy path; malformed registry responses; network failure; and file-write safety. |
| **Verified equivalence** | The CLI was rebuilt and `--help` and `--version` compared before and after the extraction. |
| **Remediation — resilience** | `kinetixui.json` gains an optional `registry`. Precedence: `--registry` when it says something other than the default, then the project's own value, then the default. Documented in the CLI README, `/docs/cli`, `/docs/kinetixui-json` and the published JSON schema. `doctor` now checks the registry the project *resolves to* rather than the default, because reporting a pass for an origin `add` will not use is worse than not checking. |
| **Remediation — error quality** | All registry fetches go through one `request()`. An unreachable origin now names the origin and both ways to change it instead of surfacing a bare `fetch failed`; a response that is not JSON says so and mentions a proxy; an index with no `items` array is rejected rather than returning `undefined` and becoming `Cannot read properties of undefined (reading 'filter')` several frames away. The original error is kept as `cause`. |
| **Fallbacks evaluated, not implemented** | See [the table below](#registry-fallback-options-evaluated). |
| **Found while doing it** | Writing the CLI README surfaced that the config key did not exist at all — the README's first draft claimed it did, which was corrected before it was true, then made true. The published `schema/config.json` had nothing tying it to `KinetixConfig`; a 4-test guard now ties them, mutation-tested both ways. |
| **Remaining risk** | Medium. The commands' own action handlers are still untested end to end — the tests cover the parser, the registry layer, the writer and the config, not `add` orchestrating them. That is the next increment, and it needs a fixture registry served over HTTP. |
| **Status** | **FIXED** (tests) · **MITIGATED** (resilience — a durable mirror is configurable; no automatic fallback exists) |

### 7. Wearable claims — **FIXED**

| | |
| --- | --- |
| **Previous state** | `WEARABLES.md` opens "decided in principle, **nothing built**." The honest surfaces already said so: `platform-support.ts` lists Wear OS and watchOS under `notSupported` with "No implementation yet." No surface claimed support. |
| **The real risk** | Not a false claim — the word appearing beside five implemented platforms, where a reader counts six. |
| **Remediation** | Three rules in `marketing-claims.test.ts`: no wearable may appear in any platform definition, label or derived sentence; none may be described as supported, available, implemented, shipping, coming soon, on the roadmap or in progress; and any public surface naming one must state somewhere that nothing is built. Internal architecture documents (`WEARABLES.md`, `CORE-AUDIT.md`) are deliberately out of scope — their job is to record the decision factually. |
| **Judgement recorded** | The IoT docs and README describe the models as generic enough for "wearables" — a statement about which *devices* the vocabulary describes, since a fitness band populates `KinetixDevice` the same way a soil probe does. That is a correct technical point and deleting it would weaken the docs, so it is kept with the ambiguity closed explicitly: *"A wearable is a device this vocabulary describes, which is not the same as a platform KinetixUI targets: there is no wearable component library and nothing is built."* The IoT README's use-case list dropped the word, since a list without context is where a skim-reader miscounts. |
| **Mutation-tested** | `"Wear OS is supported."` → 1 failure. `"watchOS is coming soon."` → 1 failure. |
| **Load-bearing detail** | The negation lookbehinds. Without them the rule fired on `notSupported` — the correctly named array — and on "No implementation yet", i.e. on exactly the text doing the right thing. A guard that cannot tell a claim from its denial gets deleted for being annoying. |
| **Remaining risk** | Low. A premise test asserts `WEARABLES.md` still says nothing is built, so if a wearable is ever shipped these rules fail and get revisited deliberately. |
| **Status** | **FIXED** |

---

## Registry fallback options evaluated

Only one was implemented. The brief asked for the safest reasonable option, not all of them.

| Option | Reliability | Security / integrity | Versioning | Maintenance | Offline | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **Configurable mirror** (`registry` in `kinetixui.json`) | Good — the team owns their own availability | Unchanged: same validation, same HTTPS, no new origin shipped by us | None to skew: the mirror is whatever they mirrored | Near zero | No, but their mirror can be internal | **IMPLEMENTED** |
| Versioned registry bundled into the CLI tarball | Excellent | Strong — covered by npm provenance | **Skews**: an old CLI silently serves old components | Registry must be built into the CLI at release | Yes | DEFERRED — best offline story, materially changes the CLI's build and shipping |
| GitHub raw fallback | Poor — aggressive rate limits, second origin to reason about | No checksum; serves `main`, not the CLI's version | **Skews silently** | Low | No | **REJECTED** — adds an unversioned path that looks like it worked |
| Separate registry npm package | Good | Strong — npm provenance, integrity after install | Explicit and resolvable | A new package to publish and keep in step | Yes, after install | DEFERRED — the right long-term answer |
| Cached last-known-good | Helps transient outages only | Cache is a new trust boundary | Can serve a component that no longer exists | Invalidation, a writable cache dir | Partially | DEFERRED — most complexity for the least certain benefit |

**Recommended next step if this becomes a real constraint:** the separate registry npm package, with the
bundled option as its fallback. Both are dedicated engineering tasks.

---

## Claim recheck

Re-verified after remediation, against source. Every figure below was produced by running the repository's
own checks during this phase, not carried over.

| Claim | Before | After | Source |
| --- | --- | --- | --- |
| Components | 98, with "98 components" overstating by 1 | **98 catalogue entries = 97 components + 1 documented recipe**, printed by `marketing:stats` | `components.manifest.json` |
| Blocks | 20 × 5 platforms | **unchanged, 20/20 everywhere, 0 drafts** | `block-parity.json` |
| Platform coverage | 98 / 31 / 90 / 90 / 90 | **unchanged** | `platform-parity.json` |
| Package list | 4 reported, 5 published | **5 reported, 5 published**, derived | `release/publish-packages.json` |
| Tokens | 357 definitions → 28 artifacts | **unchanged** | `tokens/**`, `packages/tokens/dist` |
| Tests | 2,546 | **2,660 passing, 0 failing, 0 skipped** | run this phase |
| Accessibility | empty axe baseline, React 98/98 | **unchanged** | `a11y-baseline.json`, `verification.json` |
| Distribution | conflated with maturity | **separated, derived, guarded both ways** | `distribution.published` |
| IoT | absent from the stats tool | **reported; experimental; React-only** | `marketing:stats` |
| Tree-shaking | no claim, no stated limitation | **limitation stated and measured** | `TREE-SHAKING.md` |
| Wearables | honest but unguarded | **three guards, mutation-tested** | `marketing-claims.test.ts` |
| Release presentation | v0.5.0 latest, no automation | **automation prepared; history needs a human** | `github-releases.mjs` |
| Canonical URLs | "none anywhere" — **wrong** | **present on the 4 pages with URL state**; absent on the ~123 static ones | `src/lib/seo.ts` |

### Test counts

| Suite | Before | After | Δ |
| --- | --- | --- | --- |
| `@kinetixui/web` | 1,071 | 1,078 | +7 |
| `@kinetixui/create-theme` | 617 | 617 | — |
| `@kinetixui/ui` | 290 | 290 | — |
| `@kinetixui/iot` | 241 | 241 | — |
| `@kinetixui/angular` | 111 | 111 | — |
| **`@kinetixui/cli`** | **0** | **89** | **+89** |
| Release tooling | 216 | 234 | +18 |
| **Total** | **2,546** | **2,660** | **+114** |

### Validation run

| Gate | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` (9 workspaces) | PASS |
| `pnpm test` (6 suites) | PASS — 2,426 |
| `pnpm test:release` | PASS — 234, 0 skipped |
| `pnpm build` | PASS |
| `pnpm release:check` | PASS |
| `pnpm release:preflight` | PASS |
| `pnpm check:releases` · `check:manifest` · `check:verification` · `check:blocks` · `check:iot-examples` · `check:contrast` · `check:token-contract` · `check:platform-source` · `check:angular-api` · `check:usage` | PASS (10/10) |
| `pnpm marketing:stats` | PASS — 5 packages, IoT included |
| Tarball inspection (all 5, re-packed) | `README=1 LICENSE=1` each |

One typecheck failure occurred during the work and was fixed rather than worked around: the new hero CTA used
an analytics target outside the typed `ANALYTICS_CTA_TARGETS` union. Three web tests also failed after the CLI
extraction, because they read `packages/cli/src/index.ts` as text to verify the docs match the registered
commands; both were repointed at `program.ts` with a note. Both failures were the guards doing their job.

---

## Status summary

| Area | Status |
| --- | --- |
| Package README status | **FIXED** — 5/5 in tarball, gated by `requireFiles`, asserted by 4 tests |
| Platform availability status | **FIXED** — derived from `distribution.published`, guarded in both directions |
| Release visibility status | **MITIGATED** future / **NEEDS MANUAL ACTION** history (3 Releases by hand) |
| `marketing:stats` status | **FIXED** — derived from the release allowlist, 5 tests, mutation-tested |
| Tree-shaking claim status | **FIXED** as a claim / **DEFERRED** as packaging |
| CLI test status | **FIXED** — 0 → 89 tests, in CI and the release preflight |
| CLI resilience status | **MITIGATED** — durable mirror configurable; no automatic fallback |
| Wearable claim status | **FIXED** — 3 guards, mutation-tested |

---

## Marketing readiness scorecard

Same eight dimensions as the original audit. Scored on evidence; the product did not change in this phase, so
dimensions that depend on the product barely move.

| Dimension | Before | After | Why it moved, or did not |
| --- | --- | --- | --- |
| **Product clarity** | 7 | **8** | Availability is separated from maturity everywhere a reader acts, and the component count states its own caveat. Not 9: the nav is still eight flat items and there is still no WHO-it-is-for sentence. |
| **Developer trust** | 5 | **7** | Five npm pages now describe their package; the ui README volunteers its own weakness, which is worth more than a claim. Not higher: GitHub's Releases sidebar still shows `v0.5.0`, and that is the first thing a recency-checker sees. |
| **Conversion readiness** | 5 | **6** | The npm destination is no longer blank and the hero answers the install question. Native visitors still cannot activate, and the nav is unchanged. |
| **Documentation** | 9 | **9** | Already excellent. The additions — availability callout, registry mirror, config key, two audits — maintain it rather than raise it. |
| **Discoverability** | 3 | **5** | Four packages became findable and readable on npm; the `/components` snippet no longer misleads. Still missing: GitHub topics, an updated repository description, `cli` keywords, `bugs`, per-page OG images — all P0 #5/#7 items requiring repository settings or further work. |
| **Analytics** | 8 | **8** | Unchanged in substance. One instrumented CTA added, typed into the existing union. Funnel definition and a live key check are still open. |
| **Community readiness** | 3 | **3** | Untouched by design. Discussions still off, no `CODE_OF_CONDUCT.md`, no `FUNDING.yml`, no public roadmap. |
| **Launch readiness** | 4 | **6** | The two hard stops the audit named — blank npm pages, the availability category error — are gone. The remaining blockers are repository settings and the native install path. |
| **Overall** | **5.5** | **7.1** | *Shop window now describes the product. Storefront settings and the native path remain.* |

Deliberately not inflated: **Community readiness did not move at all**, Documentation and Analytics did not
move, and Developer trust is held below 8 by a single stale sidebar that no code change can fix.

---

## Deferred engineering work

| Work | Why deferred | Prerequisite |
| --- | --- | --- |
| Per-component subpath exports for `@kinetixui/ui` | Additive and low-risk in principle, but the packed-consumer smoke test must cover every new subpath in the same change, and `exports`/`requireFiles` must be generated | `TREE-SHAKING.md` recommendation 1 |
| End-to-end CLI command tests | Needs a fixture registry over HTTP; the parser, registry layer, writer and config are covered, the orchestration is not | A test HTTP server fixture |
| Registry npm package or bundled registry | Materially changes what the CLI ships | A decision on which |
| Visual-regression verification | `visual: 0` on every platform; no campaign asset may imply pixel safety | Tooling choice |
| React `interaction` coverage above 23/98 | Product work | — |
| Completing the RTL logical-property conversion | `NOT_YET_CONVERTED` is non-empty by design | — |
| Site's own RTL (`<html dir>` is hardcoded `ltr`) | Small but not marketing-blocking | — |

## Manual actions required

Nothing below can be done from the repository.

1. **Create three GitHub Releases by hand** — the current version of each cohort (`@kinetixui/ui@0.23.3`,
   `@kinetixui/angular@0.24.0`, `@kinetixui/iot@0.2.0`), using `pnpm release:notes <version>` for the body,
   then set `githubReleaseUrl` on those entries in `apps/web/src/lib/releases.ts`. Do **not** backfill 92.
2. **Set GitHub topics** and **update the repository description** — it still names four platforms and omits
   Angular and IoT. Suggested topics: `design-system`, `design-tokens`, `react`, `swiftui`,
   `jetpack-compose`, `flutter`, `angular`, `tailwindcss`, `accessibility`, `dtcg`.
3. **Confirm the deployed site serves** `/r/registry.json`, `/specs/*.json`, `/sitemap.xml` and
   `/robots.txt`, and that `npx @kinetixui/cli add button` succeeds against production. The audit could not
   reach `kinetixui.com` and neither could this phase; the network policy denies the host.
4. **Enable GitHub Discussions**, add `CODE_OF_CONDUCT.md` and `.github/FUNDING.yml`, disable the empty wiki.
5. **Decide the "production ready" question** and state it once. Current state is Beta, and "Beta, and we
   publish our evidence" is stronger than a claim the repository contradicts.
6. **Add `keywords` to `@kinetixui/cli` and `bugs` to all five packages** — not done here because both change
   published metadata and belong with whatever release carries them.

---

## Phase 1 reconciliation

Files under `marketing/` that predate the audit and will need review when positioning work starts. **Not
touched in this phase** beyond `README.md`.

| File | Why it needs reconciliation |
| --- | --- |
| `positioning.md` | Written before the availability distinction existed. Check it does not lean on five platforms reading as five installable things. |
| `messaging.md` | Headline and claim guidance predates the claim matrix; reconcile against it and against `TREE-SHAKING.md`. |
| `personas.md` | Does not yet distinguish a React developer (can install today) from a native developer (cannot). That is now the sharpest segmentation available. |
| `seo.md` | Topic clusters predate the corrected canonical finding and the per-page OG gap. |
| `content-calendar.md` · `content-pillars.md` | Sequencing assumes a launch posture the scorecard does not yet support. |
| `launches.md` | Staged launch criteria should reference the manual actions above as gates. |
| `community.md` | Assumes Discussions; they are still disabled. |
| `analytics.md` | Funnel definition is still open, and the availability link is a new event worth a place in it. |
| `content/drafts/a01/`, `a02/` | Carry dated evidence tables. **Historical — do not retro-edit**; verify their `verify-*.mjs` scripts still pass before publishing either. |
| `roadmap.md` | Internal. Keep it internal, or make a public version deliberately — a public roadmap converts, and wearables must not appear on one without an approved statement. |

All four guidance documents are in `current-truth.test.ts`'s `CURRENT_SURFACES`, so they are already held to
present-tense accuracy; what they are not held to is being *persuasive* against the corrected claims.
