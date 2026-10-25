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

And one guarantee about what happens *after* the uploads:

> A release tag is never created on the strength of an exit code. Every version this run uploaded is
> confirmed against the registry first.

### A publish that exits 0 is a claim, not evidence

`pnpm publish` returning 0 means the upload was accepted, not that the registry serves the version.
Until 0.23.1 the release printed `npm: published …` straight from that exit code, which is the same
kind of evidence that let 0.23.0 announce a release it had not finished.

So `publish()` now asks the registry, and the release stops before tagging if any version cannot be
confirmed. The stop is deliberately not phrased as a failed upload, because usually it is not one:

**npm is not read-your-writes.** In the 0.23.1 release the three core packages became visible 3, 4
and 7 minutes after their uploads, and a packument fetched in between came back with a `modified`
timestamp from the *previous day*. That is a stale answer, not a wrong one, and reading it as a
failed publish is an easy and expensive mistake — it invites bumping the version to retry, which
burns a version number over a few minutes of propagation.

The confirmation therefore polls for a window (10 minutes by default) and treats an unreachable or
refused registry the same as "not yet", never as absence. If the window elapses, the release stops
**before creating any tag**, so the state it leaves is the one the recovery path already handles:
npm complete or partly complete, tags missing. Re-run the release — the plan skips whatever is
already published and the tag step creates what is owed. Do not bump the version.

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

**Peer compatibility across cohorts**: every `peerDependencies` range one allowlisted package
declares on another is checked against the version this release plans to publish, derived from the
pending changesets. A range that already accepts the planned version is left exactly as it is; one
that does not fails the release with both numbers named. Offline, so it runs on an ordinary pull
request — before the Version Packages PR exists. See [Peer ranges across cohorts](#peer-ranges-across-cohorts).

**Release-note links**: every internal link in `release/notes/<version>.json` and in the activated
`apps/web/src/lib/releases.ts` is resolved against the built site — the path against the prerendered
pages, the files under `public/` and the configured redirects, and any `#fragment` against the ids in
that page's HTML. 0.25.0's notes linked `/docs/motion`, a route that does not exist, and nothing
stopped it: `next build` does not resolve the hrefs it renders, `check:releases` never looked at a
link, and `check:seo` reads links out of built pages — where a curated note does not appear until the
Version PR activates it, and with the fragment stripped before resolving. `pnpm check:release-links`
is that check; it uses the same route inventory as `check:seo`
([`scripts/site-inventory.mjs`](./scripts/site-inventory.mjs)), so there is no second list of routes
to keep in step, and its rules and negative controls are in
[`scripts/release/test/release-links.test.mjs`](./scripts/release/test/release-links.test.mjs). It
needs a site build, so it runs in CI's `build` job — the required check on every pull request,
including the Version PR whose merge publishes — rather than in `release.yml`'s preflight, which
deliberately builds no site. The enforcement point is therefore that required check, not the release
workflow: `ci.yml` runs again on the push to `main`, but `release.yml` reads no signal from it, so a
link is caught before the Version PR can merge rather than at publication time.

What the link gate does **not** check, so that nobody reads more into a green run than it means:

- **Link shapes it does not extract.** It reads a value of an `href` field, in either quote, and a
  CommonMark inline link — including a titled or angle-bracketed destination. A raw `<a href="...">`, a
  reference-style `[text][id]` with its definition elsewhere, and a destination containing balanced
  parentheses are not read. There is one raw `<a href>` in the content today — `<Badge asChild><a
  href="/new">` in a `body` in `releases.ts`, written as a code example — and `/new` is not a route.
  On the changelog page that body renders as plain text, so no reader can click it there; in the GitHub
  Release body, which renders inline HTML, the same sentence is a clickable dead link. It is historical
  content in an already-published release, so this is recorded as the live example of the gap rather
  than edited away: a raw `<a href>` in a future note would not be caught either.
- **Links the generator synthesises.** `scripts/release-notes.mjs` builds
  `/docs/changelog#<version>` and a `/docs/components/<slug>` link for each entry in `newComponents`.
  Neither comes from an `href` field, so neither is audited. The changelog anchor exists by
  construction — `changelog-view.tsx` renders `id={release.version}` for every entry — but only once the
  Version PR has activated the entry, so generating notes for a version that is still only a curated
  file emits an anchor that does not yet resolve. The component link is emitted when the route's
  **source directory** exists, which is not the same question as whether the page was built.
- **A destination in prose that looks like a repo file.** A value of an `href` field is reported
  whatever it looks like, because that position is unambiguously a link. The exemption applies only to a
  Markdown candidate, where `](…)` matches sentences as well as links: there a destination with a slash
  and no file extension is read as a route and reported, and one with a file extension
  (`packages/ui/CHANGELOG.md`) or no slash at all is left alone as a repo-file link or prose. So a
  repo-relative Markdown link to an extensionless file is reported, and a full URL is the answer — on
  `https://github.com/zedalleys/kinetixui/blob/main/...` for a file in this repository, not on the site
  origin, where `/packages/tokens` is a 404. The error message names both, because following "write it
  as an absolute URL on the site" for a repo path produces another dead link.
- **A trailing slash.** `/docs/angular/` is reported as unresolved although Next redirects it. That is
  `check:seo`'s own path semantics, shared deliberately rather than forked.
- **A fragment on a target that is not an HTML page.** `/sitemap.xml#urlset` or `/brand/logo.svg#mark`
  resolves as a path and then fails, because ids are read out of built page HTML and those targets have
  none. The message says so rather than claiming the id is missing. No release note links that way, so
  this is left as a false failure the author can see the reason for rather than fixed speculatively.
- **A relative Markdown destination whose last segment looks like a file.** `[x](docs/changelog/0.25.0)`
  reads as the extension `.0` and is left alone as a repo-file link. A value of an `href` field is not
  affected — those are reported whatever they look like — so this is confined to prose, where the
  alternative is failing a release over a sentence.
- **A partial loss of coverage, and a field rename.** The per-source coverage floor fails a file that
  still carries an `href` field but yields **no** destination at all — every value a non-string, every
  spelling unmatched. It does not fire on a partial loss: three of a note's four hrefs turned into
  arrays, or 67 of the 68 keys in `releases.ts` renamed, leaves one destination behind and the gate
  passes, auditing fewer links than the file carries. So the floor is a floor, not the protection. What
  makes a silent partial loss unlikely is that both readers are structural — a curated note is parsed,
  and `releases.ts` is scanned with string interiors masked — so there is no quote style or prose shape
  left to flip. It counts destinations read, not links audited, so a note whose only `href` is external
  or a bare `#anchor` is not failed for having nothing to resolve. Renaming or removing the field
  entirely is indistinguishable from a release that links nowhere, so `LINK_KEYS` is pinned by a test.
- A curated `release/notes/*.json` is read by **parsing** it, not by scanning its text, so no valid JSON
  spelling of the field — `"\u0068ref"` — can hide a link from the gate while `JSON.parse` activates it
  into the site. `releases.ts` is TypeScript and keeps the text scan, with string interiors masked and
  comment text blanked, so that the prose `version-release-meta.mjs` copies verbatim out of a note reads
  the same in both files: without that, an `href` key quoted inside release prose — `items={[{ label:
  'Docs', href: '/docs/intro' }]}`, how a component library documents a prop — passed on the authoring
  pull request and failed on the Version PR whose merge publishes.
- **A field after an unbalanced quote on the same line is masked**, and this is the one place the scan
  can lose a real link rather than report a false one. What holds: a masked span always begins at least
  one character into a line, so a field at the **start** of its line can never be masked — and every
  `href` the generator writes is at the start of one, because `version-release-meta.mjs` serialises with
  `JSON.stringify(entry, null, 2)`. What does not hold: a hand-written line that puts a field after other
  content *and* an unbalanced quote outside both a string and a comment, such as a lone `"` inside a
  regexp literal, loses that field. A test pins both halves so neither is a surprise.
- **A link on this site's own host is resolved whatever scheme it is written with.** `http://` and
  `https://`, and the default port written out, all resolve to the same path and are audited; a
  different host or a non-default port is an external link and is left alone.

**Registry state**: whether each allowlisted version already exists, read from the packument rather
than parsed out of CLI output. An unreachable registry, an authentication failure or a malformed
response is **not** read as "unpublished" — it stops the release, because publishing against
unknown state is exactly the situation to avoid.

### The release notes must be dated the day the release runs

Before a core version's **first** upload, `scripts/release/dates.mjs` requires the `date` on that
version's entry in `apps/web/src/lib/releases.ts` to equal the current UTC date. The notes carry a
publication date, so a date that is not the publication day is simply wrong, and the gate refuses
the release rather than publish a release note that misdates itself.

That date is generated, and `changeset version` is not what writes it. `pnpm version-packages` is
`changeset version && node scripts/version-release-meta.mjs`, and it is the second half that reads
`release/notes/<core-version>.json`, sets `entry.date` to the current UTC day and inserts the entry
into `releases.ts`. Running the Changesets CLI on its own versions the packages and leaves the date
alone, so **a Version PR regenerated that way can still be refused after midnight** — use
`pnpm version-packages`, or correct the one line by hand.

Because the bot rebuilds the Version PR from `main`, where the entry does not exist yet, **every
rebuild inserts it afresh with the rebuild's day**, and the merge window for that build is bounded
by that UTC day. Merge after midnight UTC and the release is refused with the two dates named,
which is what happened to 0.25.0: the Version PR was rebuilt on 2026-10-21 and merged at 00:31 UTC
on the 22nd, so nothing published until the date was corrected and merged on the day it ran.

Two practical consequences:

- The date cannot be prepared in advance. It goes stale at 00:00 UTC, so correcting it is a
  same-day action: set it to the day the release will actually run, and merge it that day.
- `pnpm check:releases` passing says nothing about this, and it is the check most likely to be
  mistaken for saying it. It does validate dates — that each is `YYYY-MM-DD` and that the list is
  non-increasing as versions descend — along with the core cohort being on one version, every
  changelogged version having an entry, `breaking` being present, `newComponents` slugs existing
  and `githubReleaseUrl` naming its version. None of that is publication-day readiness: a note
  dated three days ago is well-formed and correctly ordered. Only `release:preflight` compares the
  date to today, and it runs in the credential-free job — no npm token, no `id-token` permission —
  so a refusal there publishes nothing and consumes no version number.

Two cases fall outside the gate, both deliberately. It reads the `core` entry of `plan.publish`,
so a release that publishes no core package — an Angular-only or IoT-only cohort release — is not
date-checked at all. And it returns early when a core package is already on the registry at this
version (`plan.alreadyPublished`), so it cannot block a recovery for a cohort that has started to
upload.

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

### GitHub Releases are a third state, and they had silently stopped

npm, the git tags, and the **GitHub Releases** page fail independently, and the third one was failing
without anyone noticing. By 2026-09-28 there were **94 tags and 2 Releases**, the newest Release being
`v0.5.0` from 2026-09-06 while npm was serving `0.23.3`. Anyone who found the repository read it as
abandoned.

The cause was structural, not neglect. `changesets/action` creates GitHub Releases by parsing the
Changesets CLI's `New tag: <pkg>@<version>` lines out of its publish command's stdout. This repository
publishes with `pnpm release` — its own preflight-and-publish pipeline, which prints its own report — so
the action never had anything to parse, and created nothing. It would never have self-corrected.

The fix keeps the parsing out of it entirely:

1. `pnpm release` writes a summary of what it published and tagged to the path in
   `KINETIXUI_RELEASE_SUMMARY`, if that variable is set. Nothing is written otherwise, so a local
   `pnpm release` leaves no artifact behind.
2. `scripts/release/github-releases.mjs` reads it and creates one Release per tag **that this run pushed
   for a package this run published**.
3. `createGithubReleases: false` is now explicit on the action, so the disabled path is a decision rather
   than an accident of output format.

Four rules matter, and are covered by `scripts/release/test/github-releases.test.mjs`:

- **Never fatal.** By the time this step runs, npm and the tags are correct and irreversible. A Release is
  a *view* of a release. The step is `continue-on-error` and the script exits 0 on a `gh` failure, saying
  what is missing.
- **Idempotent.** An existing Release is never edited, replaced or deleted. Re-running creates only what
  is absent, and a `gh release view` that fails for any reason other than absence is read as "it exists",
  because a duplicate Release is worse than a missing one.
- **No backfill.** Only tags from the current run. `reconcileReleaseTags` also pushes tags owed by an
  *earlier* failed release, by design — those must not become Releases dated today.
- **No invented prose.** Notes link the changelog and the exact npm version. The per-package
  `CHANGELOG.md` is generated by Changesets from the changesets themselves and is the release's own
  account of itself.

#### The 92 historical tags — deliberately not backfilled

This is a **manual decision, not an oversight**, and nothing in the pipeline will do it:

- Creating 92 Releases today for versions that shipped across five months fabricates a history, and the
  dates would be wrong on every one.
- Every watcher of the repository would receive 92 notifications at once.
- The changelog already covers those versions, curated, at `/docs/changelog`, and the site links each
  version's **tag** where no Release exists (`githubReleaseUrl` in `apps/web/src/lib/releases.ts`), so
  nothing is unreachable today.

If the Releases page should look less empty before a campaign, the proportionate action is to create a
**small number by hand** — the current version of each cohort, so the sidebar shows something true and
recent — using `pnpm release:notes <version>` for the body, and then set `githubReleaseUrl` on those
entries in `releases.ts`. Three Releases, not ninety-two.

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

Status: Preview, and published. Versioned here, built and tested in CI, and on npm in its own
release cohort.

It is listed in `release/publish-packages.json` in the `angular` cohort, which is what grants it
publication, and it carries `publishConfig.access` and `provenance`. Because ng-packagr generates
the Angular Package Format manifest into `dist/`, the allowlist entry names that directory as the
`artifactDirectory` while `directory` stays the workspace identity the allowlist is matched
against.

As a Preview implementation, Angular has not yet met the project's full graduation criteria. Its
compatibility guarantees should be understood in the context of that status, independently of its
npm availability. `ANGULAR-GRADUATION.md` is the policy and `pnpm check:angular-graduation` is the
measurement; as that document puts it, publication is distribution, not maturity.

The cohort is what keeps the two independent: Angular moves on its own version line rather than
with the `core` three, so an Angular minor never drags the React set with it.

### Publication readiness — how the artifact is validated

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

This gate ran before Angular was ever published and still runs on every pull request, so the
artifact is validated the same way whether or not a release is in flight.

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
The reverse holds too, and needs no manual correction any more: a Version Packages PR for a core
release must not touch `packages/ui-angular/package.json` at all. See
[Peer ranges across cohorts](#peer-ranges-across-cohorts).

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
catalogue is incomplete — `pnpm check:platform-completeness` prints the current count rather than
restating it here, because the last number written into this sentence went stale the moment a wave
landed.

---

## Peer ranges across cohorts

`@kinetixui/angular` is versioned independently of the `core` cohort and declares its token
compatibility as a range:

```json
"peerDependencies": {
  "@kinetixui/tokens": "^0.23.0"
}
```

That range is a **claim**, not a resolved edge. Nothing in this repository picks the token version a
consumer installs — the consumer does — so the only question worth asking about the range is:

> does the range this package already declares accept the version the release is about to publish?

The invariant that follows, and the two things it rules out:

| situation | what happens |
| --- | --- |
| the declared range already accepts the planned version | nothing changes — not the range, not the version |
| the planned version falls outside the declared range | the release fails, naming both, until someone decides |

**In range, nothing moves.** A core patch takes `@kinetixui/tokens` from `0.23.3` to `0.23.4`;
`^0.23.0` already accepts that, and `packages/ui-angular/package.json` is not touched by
`changeset version` at all. It used to be — see *What this replaced* below.

**Out of range, someone decides.** `pnpm release:check` fails before generation with the actual
numbers:

```
@kinetixui/angular@0.24.0 declares @kinetixui/tokens "^0.23.0",
but the planned @kinetixui/tokens version is 0.24.0.

@kinetixui/angular is not in this release. @kinetixui/angular@0.24.0 is already published
declaring "^0.23.0", and cannot be changed.

Left alone, `changeset version` widens the range to cover 0.24.0 and gives
@kinetixui/angular a patch bump to carry it — a compatibility claim nobody made.

Decide it deliberately: widen @kinetixui/tokens in packages/ui-angular/package.json
to a range that accepts 0.24.0, and add a changeset for @kinetixui/angular so the new
claim reaches npm. Or keep @kinetixui/tokens inside the range @kinetixui/angular
already supports.
```

Two ways forward, and the point is that both are decisions:

- **Widen the range and release Angular.** Verify the components against the new token contract,
  edit the peer range by hand (`"^0.23.0 || ^0.24.0"`, or whatever is true), and add an Angular
  changeset saying so. Angular then gets its own version and its own changelog entry describing the
  compatibility change, and the hand-written range is kept verbatim.
- **Keep tokens inside the supported range.** Ship the token change as a patch, or wait for the
  release that does the Angular work.

There is deliberately no third option, and no flag to silence it. "Preserve the old range" is not
one of the two: a range that has stopped being true is not something to protect.

### How it is enforced

Three mechanisms, each doing one thing:

1. **`.changeset/config.json`** sets
   `___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH.onlyUpdatePeerDependentsWhenOutOfRange`.
   Inside `shouldUpdateDependencyBasedOnConfig` that turns the peer branch back into a semver
   question instead of an unconditional rewrite — see *The mechanism* below. It is what makes the
   in-range case a no-op.
2. **`scripts/release/peers.mjs`** computes what the release will publish from the pending
   changesets and checks every peer claim in the workspace against it. It runs inside `buildPlan`,
   so `release:check`, `release:plan`, `release:preflight` and `pnpm release` all gate on it, with no
   network and no registry. It only ever reports; it rewrites nothing.
3. **`scripts/release/test/version-generation.test.mjs`** builds throwaway workspaces from *this*
   repository's Changesets options and runs the real `changeset version` in them. The option in (1)
   is labelled unsafe and its name promises it can change in a patch release; an option that might
   change meaning is only dangerous while the change would be silent, and these fixtures are what
   make it loud. They assert the in-range case is left alone **and** that the out-of-range case is
   still rewritten, so the configuration cannot degenerate into freezing ranges.

`scripts/release/test/peers.test.mjs` holds the rule itself, on synthetic workspaces at several
version lines so that a release cannot turn it into a `0.23.x` museum piece.

### The mechanism

Worth knowing, because the default is surprising. `applyReleasePlan` iterates every entry in the
release plan, and a package that merely *depends* on a released package is in that plan with
`type: "none"` — Angular appears as `0.24.0 -> 0.24.0`. Its `version` key is skipped (guarded by
`newVersion != null`) and its changelog is skipped (`getChangelogEntry` returns `null` for `none`),
but its dependency ranges are rewritten regardless, because of the last two lines of
`shouldUpdateDependencyBasedOnConfig`:

```js
if (!semverSatisfies(release.newVersion, depVersionRange)) return true;  // genuinely out of range
const minLevel = getBumpLevel(minReleaseType);
let shouldUpdate = getBumpLevel(release.type) >= minLevel;
if (depType === "peerDependencies") shouldUpdate = !onlyUpdatePeerDependentsWhenOutOfRange;
```

For a peer dependency that last assignment **replaces** the decision rather than refining it, so the
in-range check above is discarded and `updateInternalDependencies` has no say at all — raising it to
`"minor"` does nothing. Setting `onlyUpdatePeerDependentsWhenOutOfRange` makes the assignment agree
with the check instead of overriding it: out of range still returns early and rewrites, in range no
longer does.

Separately, `determineDependents` in `@changesets/assemble-release-plan` gives an out-of-range peer
dependent a **patch** bump — a token major would move Angular by one patch — which is the other half
of why the out-of-range case is a decision rather than a computation.

### What this replaced

Until this was fixed, every Version Packages PR that patched `@kinetixui/tokens` arrived with a
rewrite that had to be reverted by hand:

```diff
 packages/ui-angular/package.json
-    "@kinetixui/tokens": "^0.23.0"
+    "@kinetixui/tokens": "^0.23.1"
```

`@kinetixui/angular` was not being versioned in those PRs. It stayed at the version already on npm,
whose published artifact declares the old range, so the rewritten range could not reach any consumer
— the only thing it changed was that this repository stopped describing what was actually published.
It also narrowed the claim for nothing, dropping `0.23.0`–`0.23.2` while they remained compatible.
That revert is no longer a step in any release. **A Version Packages PR that touches
`packages/ui-angular/package.json` while Angular is not being released is a bug, not a chore.**

`scripts/release/test/repository.test.mjs` → *"a published package still describes what was
published"* remains as the backstop, and is what caught the drift each time it happened. For every
publishable package with no pending changeset whose current version already has a release tag, it
compares the publish-facing fields of `package.json` against the same file at that tag. On a feature
branch the same assertion means a consumer-facing manifest change needs a changeset — which is
correct, because without one it would never reach npm. It is also what makes "widen the range" a
decision that cannot be made quietly: the edit fails this test until a changeset accompanies it.

That test, and the other tag assertions beside it, only run where the checkout has tags. CI used to
use the default shallow checkout, so **they skipped silently and reported green for years**;
`.github/workflows/ci.yml` now checks out with `fetch-depth: 0`.

---

## Running the release tooling on Windows

The release runs on Linux, where `pnpm` is an ordinary executable. On Windows, `pnpm` is a `.cmd`
shim and Node refuses to spawn one without a shell (CVE-2024-27980) — which the tooling will not do,
because the arguments include package names and tarball paths. It finds pnpm's own JavaScript entry
point instead. If it cannot, set `KINETIXUI_PNPM` to a pnpm executable or its `.cjs`/`.mjs` entry:

```bash
KINETIXUI_PNPM=/path/to/pnpm/bin/pnpm.mjs pnpm release:preflight
```
