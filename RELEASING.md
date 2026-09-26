# Releasing

How `@kinetixui/tokens`, `@kinetixui/ui` and `@kinetixui/cli` get to npm, what the release system
guarantees, what it does not, and what to do when a release goes wrong.

---

## What this guarantees, and what it does not

**npm publication is not transactional.** Publishing three packages is three uploads. A registry,
authentication or network failure between the second and the third still leaves a partial release,
and nothing in this repository can prevent that.

What the release system does guarantee is narrower and worth stating precisely:

> Every deterministic package, metadata, artifact, entry-point and publish-set failure KinetixUI
> can decide for itself is detected **before the first registry mutation**.

The 0.23.0 release failed on a deterministic one. That class is what this removes.

### What happened in 0.23.0

The release command was `pnpm -r publish`, which publishes whatever the workspace happens to
contain. At the time the workspace contained `@kinetixui/angular` — a Preview implementation that
lived in the repository, was built and tested in CI, and was never meant for npm. It was not
marked `private`, and the Changesets `fixed` group gave it a version, so the recursive publish
picked it up. It had no `publishConfig.access`, so npm treated the scoped package as restricted:

```
✅ Published package @kinetixui/tokens@0.23.0
📦 @kinetixui/angular@0.23.0 → https://registry.npmjs.org/
Error: ERR_PNPM_FAILED_TO_PUBLISH
  × Failed to publish package @kinetixui/angular@0.23.0 (status 402 Payment
  │ Required): {"error":"You must sign up for private packages"}
```

`@kinetixui/tokens` was published. `@kinetixui/ui` and `@kinetixui/cli` were never attempted. No
tags were pushed. Every fact needed to predict that failure was in the repository the whole time.

---

## The commands

| Command | Network | Mutates | What it does |
| --- | --- | --- | --- |
| `pnpm release:check` | no | no | Every workspace package is allowlisted or private; every allowlisted package has publication-ready metadata. Runs on every pull request. |
| `pnpm release:plan` | read-only | no | The above, plus the registry: which versions already exist, and therefore what a release would actually upload. `--json` for a machine-readable plan. |
| `pnpm release:preflight` | read-only | no | Plan, build, pack, validate every tarball, install each into a clean consumer and use it, rehearse the upload. |
| `pnpm release` | yes | **yes** | The preflight, then publishes exactly the artifacts it produced, then tags. |

`pnpm release` is `publish(await preflight(...))` — one code path. The publish step is handed
tarball paths and cannot see the workspace, so it cannot reach a package the plan did not name.

---

## The allowlist

[`release/publish-packages.json`](./release/publish-packages.json) is the only thing that grants
publication permission:

```json
{
  "registry": "https://registry.npmjs.org/",
  "packages": [
    { "name": "@kinetixui/tokens", "directory": "packages/tokens", "build": ["build:tokens"], "requireFiles": ["…"] }
  ]
}
```

A package is never published because it merely lacks `private: true`. Publication requires **both**
that it is listed here **and** that its metadata is publication-ready.

The rule that would have caught 0.23.0:

> Every publish-capable workspace package must be either explicitly allowlisted or explicitly
> `private: true`. A package that is neither fails the check.

A package quietly losing its `private` flag is treated as suspicious, not as something to skip.

---

## What gets checked before anything is published

**Metadata**, per allowlisted package: not private; semver version, shared with the rest of the
published set; `publishConfig.access: "public"`; `publishConfig.provenance: true`; a non-empty
`files`; a license; a repository; at least one entry point.

**Artifacts** — checked against the packed tarball, not the source tree, because only the tarball
knows what `files` and the build actually produced:

- the packed manifest's own name, version and public access
- every path declared by `main`, `module`, `types`, every `exports` leaf and every `bin`
- the extra `requireFiles` the allowlist names for that package
- no `workspace:` protocol surviving into the packed dependency fields (correct in the source
  manifest, unresolvable if it reaches npm)

**Consumers**: each tarball is installed into a throwaway directory outside the workspace and used.
`@kinetixui/tokens` is imported and its CSS and type targets read; `@kinetixui/ui` is imported and a
small durable set of exports checked; the `@kinetixui/cli` binary reports its version and runs
`preset decode/css/swiftui/compose/flutter` against the fixed preset in
[`release/smoke-preset.txt`](./release/smoke-preset.txt). These are deliberately small — the
exporters, components and tokens have their own suites, and duplicating them here would make the
release gate fail for reasons that have nothing to do with packaging.

Within the consumer, each `@kinetixui/*` dependency resolves to the sibling tarball from the same
release, since `@kinetixui/ui@X` depends on `@kinetixui/tokens@X` and that version is by definition
not on the registry yet.

**Registry state**: whether each allowlisted version already exists, read from the packument rather
than parsed out of CLI output. An unreachable registry, an authentication failure or a malformed
response is **not** read as "unpublished" — it stops the release, because publishing against
unknown state is exactly the situation to avoid.

---

## Normal flow

1. A change lands on `main` with a changeset.
2. The Release workflow's `preflight` job runs with no credentials: release tooling tests,
   `release:check`, the release-critical subset of CI, then `release:preflight`.
3. Changesets opens or updates the **Version Packages** PR.
4. Merging that PR pushes to `main`, and the `release` job runs `pnpm release`.
5. The lifecycle is **preflight → publish whatever is missing → reconcile tags → push the tags this
   run owes**. Packages are published one at a time; then the tag state is brought in line with the
   registry state.

Between releases every allowlisted version is already on the registry and every tag is on the
remote, so both halves are no-ops. That is not a failure.

### Tags are a separate convergence problem

A release has two states that fail independently: **what is on the registry** and **what is
tagged**. A run can publish all three packages and then fail to create or push the tags. On the
retry every version is already published, so the publish plan is empty — and an implementation that
treated "nothing to publish" as "nothing to do" could never repair those tags.

So tag reconciliation runs on **every** release, including one with an empty publish plan. An empty
npm plan does not mean the release is finished.

What is owed is one tag per allowlisted package whose version is on the registry — including
versions published by an earlier, failed run. Private packages are never owed a tag, which is why
`@kinetixui/angular@0.23.0` has a version and a changelog entry but none.

### Tags are checked by identity, not by name

A tag *name* existing proves nothing. `@kinetixui/ui@0.24.0` pointing at some other commit is worse
than no tag at all, because it is a confident lie about what was released. Every tag is compared by
the commit it resolves to:

| state | behaviour |
| --- | --- |
| absent locally and remotely | created at the release commit, then pushed |
| local, correct commit, absent remotely | pushed by explicit ref; not re-created |
| remote, correct commit | left untouched |
| remote, **different** commit | **fail** — nothing created, nothing pushed, nothing forced |
| local, **different** commit | **fail** before pushing |
| local and remote disagree | **fail** — neither ref is mutated |

Changesets creates *annotated* tags, so `git ls-remote --tags` reports both `refs/tags/X` and the
peeled `refs/tags/X^{}`. The tag object's own sha is not a commit sha, so the **peeled** commit is
the identity; a lightweight tag is compared directly.

Nothing is ever force-pushed and no remote tag is ever deleted. A divergent tag is reported with
both commits and left alone — resolving it is a deliberate decision, not one a release should make.

### Which commit is the release commit

This is not derivable from versions. Six commits carry version 0.23.0 — the Changesets bump, the
merge that landed it, two fixes, the merge that released it, and everything after — and the real
tags point at the fifth. "The commit that introduced the version" would call the genuine 0.23.0 tags
divergent.

What is sound is narrower:

- **If this run published a package, HEAD is the release commit.** The tarballs that went to npm
  were built from this tree.
- **If this run published nothing**, HEAD is not evidence — unrelated commits may have landed since
  the release. A sibling tag from the same release is evidence, and is used when one exists.
- **Otherwise the release commit is unknown**, and the release fails closed rather than tagging
  HEAD. It prints the commands to create the tags at the right commit by hand, and says not to bump
  the version and not to tag HEAD to make it pass.

Changesets' own `git-tag` is no longer what creates the tags: it runs `git tag <name> -m <name>`,
which tags HEAD unconditionally — the exact behaviour that would corrupt a delayed recovery. Tags
are created here in the same annotated form and with the same name, and `releaseTagName` is checked
against the installed Changesets implementation so the naming stays theirs.

Because a recovery may need a commit that is not HEAD, the release job checks out full history and
tags. The preflight job does not: it has no credentials and never touches tags.

If tag creation fails, the report names what was published and says to re-run — not to bump. If the
push fails, it says plainly that **npm publication completed and tag publication is incomplete**.
Re-running is safe in both cases.

Because `privatePackages` is not set in `.changeset/config.json`, it defaults to
`{ version: false, tag: false }`. Now that `@kinetixui/angular` is private, Changesets will neither
version nor tag it, so it will stay at 0.23.0 while the published set moves on — even though it is
still listed in the `fixed` group. That is a decision for the Angular publication-readiness work,
not something to change here.

---

## When a release goes wrong

**Stop.** Do not re-run blindly and do not bump the version.

1. **Stop.** Let the failed run finish; do not retry it.
2. **Inspect the registry.** `pnpm release:plan` prints exactly which versions exist and which do
   not. That is the real state, not the workflow's exit code.
3. **Do not bump the version.** A partial release is half-published, not failed. Bumping strands
   the versions that did publish.
4. **Fix the deterministic cause.** If preflight would have caught it, add the check. If the cause
   was a registry or network failure, there may be nothing to fix.
5. **Re-run the release plan** and read it. A recovered partial release looks like this:

   ```
   REGISTRY
     ○ @kinetixui/tokens@0.24.0 already published — skip
     ✓ @kinetixui/ui@0.24.0 unpublished
     ✓ @kinetixui/cli@0.24.0 unpublished

   PUBLISH
     @kinetixui/ui@0.24.0
     @kinetixui/cli@0.24.0
   ```

6. **Verify that already-published packages are skipped** before publishing. They are skipped
   automatically, but read the plan and confirm it.
7. **Publish only the missing versions** by re-running the release.
8. **Verify the tags.** The recovery run reconciles them, including the tags for packages published
   by the first, partial run. This holds even when *nothing* is left to publish: if a release
   completed on npm and only the tags are missing, re-running the release is still the fix — the
   publish plan will be empty and the tags will be created and pushed anyway.

**Do not unpublish.** npm unpublishing is not a normal recovery step: it breaks anyone who already
installed the version, and the version number can never be reused.

---

## `@kinetixui/angular`

Status: a repository Preview implementation. Versioned here, built and tested in CI, **not on npm**.

It carries `private: true`, which is the mechanism that keeps it out of the publish set, and it is
not in the allowlist — two independent reasons it cannot be published by accident.
`ng-packagr` also copies the flag into `dist/package.json`, so a publish from the build output is
refused too.

### Publication readiness — validated, still not published

`pnpm check:angular-package` proves the artifact behind those locks is genuinely usable, without
unlocking anything:

- ng-packagr builds it, and the generated Angular Package Format manifest is used as-is
- `packages/ui-angular/public-api.json` records the public surface — every exported symbol,
  selector, input and output alias — so a change to it shows up in review
- DOM access goes through the injected element, never a global browser object
- **Publication simulation**: `dist/` is copied to a temp directory where `private` is removed and
  `publishConfig` added — *only* those two switches, and *only* in the copy. The repository is
  never modified. The resulting tarball is then validated by the release tooling's own
  `validatePackedArtifact`, the same function that gates the three published packages
- a clean Angular application outside the workspace installs that tarball, type-checks and runs a
  production AOT build against it, with no `paths` mapping and no workspace link
- the emitted CSS is checked for the token contract, the extras sheet and the component classes, so
  a stylesheet that silently failed to resolve cannot pass

Readiness is not availability. `npm install @kinetixui/angular` still does not work, and no public
documentation says otherwise.

### What activation still requires

Activation is not four manifest edits. Two of the prerequisites are in the release engine, and
neither is in the readiness work.

#### Prerequisite A — an artifact source

The Angular artifact is `packages/ui-angular/dist`: ng-packagr generates the publishable manifest
there, and the package root is what the workspace contains. The release tooling packs from the
allowlist's `directory`, and `classify()` requires that directory to be the one workspace discovery
found — so the allowlist cannot currently say "pack `dist/`". Naming `packages/ui-angular` instead
packs the source root, whose manifest has no `.` export and whose `styles.css` is under `src/`,
which the artifact validator rejects.

So a naive activation is blocked rather than dangerous. Adding Angular to the allowlist today fails
`release:check` offline, before anything is built:

```
✗ @kinetixui/angular: packages/ui-angular/package.json needs a non-empty "files" array.
release:check failed. No package was published.
```

PR #227 needs one of:

- an **artifact directory** in the allowlist schema — workspace identity stays
  `packages/ui-angular`, packing happens in `packages/ui-angular/dist`. The smaller change, and the
  one that keeps ng-packagr's output canonical; or
- a root manifest publishing `dist/` through `files` and root-level `exports` pointing into it,
  which duplicates what ng-packagr already generates and diverges from the Angular Package Format.

#### Prerequisite B — release cohorts

**The release engine assumes every allowlisted package is one release cohort: one version, one
release commit.** That is correct today — `@kinetixui/{tokens,ui,cli}` are one Changesets `fixed`
group by design — and it is exactly what independent Angular versioning breaks.

`buildPlan()` takes the majority version across the whole allowlist and validates every package
against it:

```js
const versions = classified.allowlisted.map((pkg) => pkg.version).filter(Boolean);
const expectedVersion = versions.length > 0 ? mode(versions) : null;
```

and tag reconciliation derives a single commit and maps every owed tag to it:

```js
const expected = new Map(names.map((name) => [name, decision.commit]));
```

Under Strategy B the allowlist holds two versions and the history holds two release commits:

```
core     tokens@0.23.0  ui@0.23.0  cli@0.23.0   → released at commit A
angular  angular@0.24.0                          → released at commit B
```

Both are legitimate. Today's engine rejects both, and
`scripts/release/test/cohort-assumption.test.mjs` pins that behaviour down so the cohort work has
to update it deliberately:

1. **Version contract** — `@kinetixui/angular@0.24.0 does not match the other allowlisted packages
   at 0.23.0`. Its advice ("run `pnpm changeset version`") is right today and would be wrong in a
   two-cohort world.
2. **Tag contract** — an Angular-only release at commit B still has the core packages in
   `alreadyPublished`, so their tags are considered owed *at commit B*. Their real tags point at
   commit A, so all three read as divergent and the release stops with `TagIntegrityError`.

The second failure is the tag-integrity work behaving correctly: **no tag is created, pushed, moved
or force-pushed**. The historical core tags stay authoritative. What is missing is not a safety
property — it is the planner's ability to know the two cohorts were released separately.

The target model, not decided here:

```json
{ "name": "@kinetixui/tokens",  "releaseGroup": "core" },
{ "name": "@kinetixui/ui",      "releaseGroup": "core" },
{ "name": "@kinetixui/cli",     "releaseGroup": "core" },
{ "name": "@kinetixui/angular", "releaseGroup": "angular" }
```

The invariant matters more than the schema:

> **Within** a cohort, version equality and release-commit identity may be enforced.
> **Between** cohorts, versions may differ and historical release commits may differ.

The core cohort's guarantee is not being weakened. `tokens`, `ui` and `cli` keep sharing one version
and one release commit, and `check:releases` and `/docs/changelog` keep saying so. The change is to
scope that enforcement to a cohort instead of applying it to the whole allowlist.

One encouraging result from the same test file: once the plan contains only the cohort being
released, today's tag reconciler already does the right thing — it owes exactly
`@kinetixui/angular@0.24.0`, pushes exactly that, and treats the core tags as none of its business.
So cohort support may be mostly about **scoping the plan**, not rewriting the tag engine.

#### The activation checklist

1. Remove Angular from the Changesets `fixed` core group.
2. Add a minor Angular changeset: `@kinetixui/angular` 0.23.0 → 0.24.0.
3. Remove Angular's `"private": true` publication lock.
4. Add `publishConfig.access = "public"` and `publishConfig.provenance = true`.
5. Add Angular to `release/publish-packages.json`.
6. Add artifact-directory support — workspace identity `packages/ui-angular`, pack source
   `packages/ui-angular/dist`.
7. Add release-cohort support — `core` = tokens/ui/cli, `angular` = angular.
8. Preserve same-version enforcement **inside** core.
9. Make registry planning work across cohorts on different versions.
10. Make tag reconciliation cohort-aware.
11. Prove an Angular-only release does not republish tokens/ui/cli.
12. Prove an Angular-only release does not reinterpret, recreate or move historical core tags.
13. Update the Angular npm/install documentation **only** when publication actually happens — the
    guards in `apps/web/src/lib/marketing-claims.test.ts`, `angular-docs.test.ts`,
    `verification-guardrails.test.ts` and the `/docs/angular` callout move in that same change.
14. Run the full release preflight.
15. Audit before merge.

### Which Changesets strategy, when Angular goes public

Simulated against the installed Changesets 3.0.3 with a single Angular-only changeset, then
reverted. None of this is in effect.

| | what happens | cost |
| --- | --- | --- |
| **A — keep Angular in `fixed`** | all four go 0.23.0 → 0.24.0 | `tokens`, `ui` and `cli` are republished with no changes; their changelog entry is just `- @kinetixui/tokens@0.24.0`. Angular is Preview and will iterate, so every Angular change drags three stable packages through a release |
| **B — remove Angular from `fixed`** | only Angular moves, 0.23.0 → 0.24.0; the other three stay at 0.23.0 and are untouched | Angular's version diverges from the React set's — which is what "its own lifecycle is separate from the React set's" already says in the 0.23.0 notes |
| **C — `linked` instead** | Changesets refuses a package in both `fixed` and `linked`, so this means moving all four to `linked`. A `ui`-only changeset then bumps **only** `ui` to 0.23.1 while `cli` and `tokens` stay at 0.23.0 | breaks "the three npm packages always share a version", which `/docs/changelog` states and `check:releases` enforces — the simulation fails that gate |

**Recommendation: B.** It is the only option that leaves the three published packages' guarantee
intact while letting a Preview package iterate at its own pace.

**First public version.** Not `1.0.0` — Angular is Preview and that must stay true. Two candidates:

- **0.24.0**, via a minor changeset under B. Preferred: the first publication gets its own release
  commit and its own tag, and the npm contents match the commit they were built from.
- **0.23.0**, by activating with no changeset at all — the plan would see `@kinetixui/angular@0.23.0`
  as unpublished and publish it. Simpler, but it puts contents on npm as "0.23.0" that differ from
  what the repository's 0.23.0 era contained, and its tag would point at a different commit from the
  other three packages' `@0.23.0` tags.

---

## Running the release tooling on Windows

The release runs on Linux, where `pnpm` is an ordinary executable. On Windows, `pnpm` is a `.cmd`
shim and Node refuses to spawn one without a shell (CVE-2024-27980) — which the tooling will not do,
because the arguments include package names and tarball paths. It finds pnpm's own JavaScript entry
point instead. If it cannot, set `KINETIXUI_PNPM` to a pnpm executable or its `.cjs`/`.mjs` entry:

```bash
KINETIXUI_PNPM=/path/to/pnpm/bin/pnpm.mjs pnpm release:preflight
```
