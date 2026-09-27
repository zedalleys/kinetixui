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

### Activation — complete

`@kinetixui/angular@0.24.0` is published, tagged and installable. The two-stage flow below is what
produced it: the activation merged with a changeset pending, which routed it to a Version Packages
pull request, and merging *that* published the version the bump produced.

The cohorts did what they exist for. Angular moved `0.23.0 → 0.24.0` while `@kinetixui/tokens`,
`@kinetixui/ui` and `@kinetixui/cli` stayed at `0.23.0` — Angular's changelog has a `0.24.0` entry
and none of the core three does.

| step | state |
| --- | --- |
| Remove Angular from the Changesets `fixed` core group | done |
| Angular-only minor changeset, 0.23.0 → 0.24.0 | consumed by the Version Packages PR |
| Remove `"private": true` | done |
| `publishConfig.access` + `provenance` | done |
| Angular in `release/publish-packages.json` | done, in the `angular` cohort |
| Artifact-directory support | done |
| Release-cohort support | done |
| Same-version enforcement inside `core` | preserved, now cohort-scoped |
| Registry planning across cohort versions | done |
| Cohort-aware tag reconciliation | done — `@kinetixui/angular@0.24.0` tagged, core untouched |
| npm/install documentation | done — the install command is real |

One thing to know when reading `scripts/release/test/repository.test.mjs`: two assertions written
during this activation described the *state* at the release boundary rather than a rule, and both
became wrong the moment the release succeeded. `.changeset` being empty is not an invariant — it is
empty between releases and full during them — and "Angular has no tag" stopped being true when
Angular was published. They now assert the rules underneath: a pending changeset must name a
package `changeset version` will actually act on, and no *unpublishable* package may carry a tag.
The tag assertion had been passing only because CI checks out without tags, which is worth
remembering before trusting a green tag test.

#### Why the two stages cannot collapse

Merging the activation cannot publish `0.23.0`. `changesets/action`'s dispatch is a `switch (true)`
whose only publish branch is `!hasChangesets && hasPublishScript`; with the Angular changeset
pending, `hasChangesets` is true and it runs the version step instead, opening the Version Packages
PR. `scripts/release-publish.mjs` enforces the same rule itself, so it holds however `pnpm release`
is invoked:

```
Refusing to publish: 1 changeset(s) are pending.
A pending changeset means the versions in this tree are the ones about to be superseded.
No package was published.
```

#### Release cohorts

`release/publish-packages.json` names an explicit group per package:

```json
"releaseGroups": { "core": { "sameVersion": true }, "angular": { "sameVersion": true } }
```

**Within** a `sameVersion` group, every package must be on one version — that is `core`'s existing
lockstep rule, unchanged, only scoped. **Between** groups, versions and historical release commits
may differ, which is what lets a Preview package iterate without dragging three stable packages
through a release.

The planner produces a per-cohort view, and every stage downstream keeps the boundary — most
importantly tag reconciliation, which is handed one cohort's plan at a time. Handing it all of them
would make it derive a single release commit and read the other cohort's historical tags as
divergent.

```
ANGULAR
  version: 0.24.0
  registry:
    ✓ @kinetixui/angular       unpublished
  publish:
    @kinetixui/angular@0.24.0  ← packages/ui-angular/dist

CORE
  version: 0.23.0
  registry:
    ○ @kinetixui/cli           already published
    ○ @kinetixui/tokens        already published
    ○ @kinetixui/ui            already published
  publish:
    none
```

#### Artifact directories

`@kinetixui/angular` is built by ng-packagr, which generates the Angular Package Format manifest
into `dist/`. `directory` stays the workspace identity the allowlist is matched against;
`artifactDirectory` is where `pnpm pack` runs. The artifact path is treated as untrusted config:
relative, no traversal, not absolute, and underneath the package that declares it.

A package packing from a generated artifact is held to `requireFiles` rather than `files` — there is
no source directory in its tarball for `files` to constrain, and the allowlist has to say what the
generator must have produced.

#### Angular is a one-package cohort

That matters for recovery. If Angular publishes and then the tag push fails, a later retry has no
sibling tag from the same release to prove where it happened — and HEAD is not evidence once other
work has landed. There is deliberately no fallback: the release fails closed with manual recovery
instructions rather than tagging the wrong commit. Borrowing a `core` tag would be worse than
failing, because it would be confidently wrong.

npm provenance was considered as a source of the missing commit and rejected for now: it would mean
parsing a registry-specific attestation to decide where to put a tag, and a speculative parser in
that position trades a loud failure for a quiet mistake. Fail-closed stands until there is a reason
to revisit it.

### The Version Packages handoff

Merging the activation opens a Version Packages PR that should contain **only**:

- `packages/ui-angular/package.json` → `0.24.0`
- `packages/ui-angular/CHANGELOG.md` → the new entry
- the consumed changeset, deleted

Simulated and reverted: `tokens`, `ui` and `cli` stay at 0.23.0 with no changelog entries and no
package.json changes. If that PR touches a core package, something is wrong — audit before merging.

Merging *that* PR is what publishes. The release plan at that point is exactly:

```
publish: @kinetixui/angular@0.24.0
tags:    @kinetixui/angular@0.24.0   (created at that release commit, then pushed)
```

with `core` reconciled against its own historical release commit — derived from its existing tags,
never from HEAD — and nothing created or pushed for it.

#### Documentation that moves at that boundary, and not before

While Angular is unpublished the website must keep saying so. These are the files that change when
npm actually has the package, in the same pull request that publishes it:

- `apps/web/src/app/docs/angular/page.mdx` — the "Not published yet" callout becomes the install
  command
- `apps/web/src/lib/marketing-claims.test.ts` — move `@kinetixui/angular` from `unpublished` to
  `published`
- `apps/web/src/lib/angular-docs.test.ts` — the assertion that no install command appears
- `apps/web/src/lib/verification-guardrails.test.ts` — `distribution.published: false` → `true`
- `apps/web/src/lib/releases.ts` — the release entry announcing availability

Angular stays **Preview** through all of it. Publication is distribution, not maturity, and the
catalogue is still 31 of 98 components.

---

## Running the release tooling on Windows

The release runs on Linux, where `pnpm` is an ordinary executable. On Windows, `pnpm` is a `.cmd`
shim and Node refuses to spawn one without a shell (CVE-2024-27980) — which the tooling will not do,
because the arguments include package names and tarball paths. It finds pnpm's own JavaScript entry
point instead. If it cannot, set `KINETIXUI_PNPM` to a pnpm executable or its `.cjs`/`.mjs` entry:

```bash
KINETIXUI_PNPM=/path/to/pnpm/bin/pnpm.mjs pnpm release:preflight
```
