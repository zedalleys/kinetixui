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
5. Packages are published one at a time, then `changeset git-tag` creates the tags and only the
   tags that run created are pushed.

Between releases every allowlisted version is already on the registry, so the plan is empty and
`pnpm release` is a clean no-op. That is not a failure.

### Tags

`changeset git-tag` (Changesets 3.0.3) skips packages that are `private` — which is why
`@kinetixui/angular@0.23.0` has a version and a changelog entry but no git tag — and skips tags that
already exist locally or on the remote, so re-running it after a recovered partial release adds only
what is missing. It creates tags; it does not push them.

The release pushes only the tags it just created, by name. The old pipeline ran `git push --tags`,
which pushes every local tag the runner happens to have.

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
8. **Verify the tags.** `changeset git-tag` is idempotent, so the tags for packages published in
   the first, partial run are created by the recovery run.

**Do not unpublish.** npm unpublishing is not a normal recovery step: it breaks anyone who already
installed the version, and the version number can never be reused.

---

## `@kinetixui/angular`

Status: a repository Preview implementation. Versioned here, built and tested in CI, **not on npm**.

It carries `private: true`, which is the mechanism that keeps it out of the publish set, and it is
not in the allowlist — two independent reasons it cannot be published by accident.
`ng-packagr` also copies the flag into `dist/package.json`, so a publish from the build output is
refused too.

Making it publishable is its own piece of work — `publishConfig`, a `files` list, a resolvable root
entry point, building it in the release pipeline, an install test from a real tarball, and the
question of whether it should stay in the Changesets `fixed` group. The documentation guards that
currently assert it is unpublished (`apps/web/src/lib/marketing-claims.test.ts`,
`angular-docs.test.ts`, `verification-guardrails.test.ts`, the `/docs/angular` callout) must move in
that same change, and not before.

---

## Running the release tooling on Windows

The release runs on Linux, where `pnpm` is an ordinary executable. On Windows, `pnpm` is a `.cmd`
shim and Node refuses to spawn one without a shell (CVE-2024-27980) — which the tooling will not do,
because the arguments include package names and tarball paths. It finds pnpm's own JavaScript entry
point instead. If it cannot, set `KINETIXUI_PNPM` to a pnpm executable or its `.cjs`/`.mjs` entry:

```bash
KINETIXUI_PNPM=/path/to/pnpm/bin/pnpm.mjs pnpm release:preflight
```
