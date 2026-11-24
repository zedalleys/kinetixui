# Deployment

> Status: this document describes the deployment contract introduced by the release-isolation
> configuration change. The repository half of that change is in place. **The Vercel dashboard half
> is not**, and until it is, production still deploys from `main`. The migration is an owner
> decision; see [Migration](#migration).

## The contract

| Act | Where it happens | What it does | What it does not do |
| --- | --- | --- | --- |
| Source integration | merge into `main` | changes the code of record; regenerates Version PR #622 | does not deploy, does not publish |
| Version release | merge the Version PR | queues an npm publication | does not itself publish |
| npm publication | the `publish-npm` environment's approval | publishes packages | does not deploy the website |
| Production deployment | advance `release` to an approved commit | deploys kinetixui.com | does not change `main`, does not publish |

Before this change, the first row did all of the first three rows' work at once: a push to `main` was
simultaneously integration, Version PR regeneration and a production deployment of kinetixui.com —
one act, three effects, no separate decision. That is why a four-file scripts-only merge (#605,
`80ab4a27`) deployed the production website. The split exists so that deploying is something someone
chooses, naming the commit.

## Deploying

```sh
git fetch origin
git push origin <full-40-character-sha>:refs/heads/release
```

Rules that make this a provenance record rather than a habit:

- **An exact commit, never a branch name.** `git push origin main:release` deploys whatever `main`
  happens to point at, which is the property this design removes. Push the sha.
- **Fast-forward only**, so `release` is an append-only log of what has been live. A rollback is the
  one deliberate exception (below).
- **The sha must be an ancestor of `main`**, so nothing reaches production that has not been
  integrated and reviewed.

What was deployed, and when, is then readable from git — `git log --first-parent release` — and not
only from the Vercel dashboard. Vercel records the same sha on the deployment as
`meta.githubCommitSha`, so the two can be checked against each other.

## Rollback

```sh
git push --force-with-lease origin <earlier-approved-sha>:refs/heads/release
```

This is the point of the design. It moves the site back to a commit that was already live and
approved, and it **changes nothing on `main`** — so unrelated improvements that were merged after
the bad one stay merged, keep their review evidence, and need no reverts. Under the previous wiring
the only equivalents were Vercel Instant Rollback, whose nearest healthy target was a deployment
from well before several merged fixes, or a chain of revert PRs on `main`, each of which is itself
another deployment.

`--force-with-lease` is deliberate: it fails rather than silently discarding a `release` that moved
under you.

A rollback is still a production deployment. It needs the same authorization as a forward one.

## What keeps `main` from deploying

Two halves, and only one of them is in this repository:

1. **`git.deploymentEnabled.main: false`** in `vercel.json` and `apps/web/vercel.json`. Tracked, so
   removing it shows up in a diff and fails `pnpm check:deploy-isolation` — a gate with ten negative
   controls, five injected causes against each file, that run in CI inside the existing web test
   step (`apps/web/src/lib/deploy-isolation.test.ts`). No workflow change and no added permission
   were needed to get it hosted execution.
2. **Vercel's Production Branch setting**, which must be `release`. This one lives in the dashboard.
   It can be changed back in a place no diff records and no test can read, which is exactly why the
   first half is written down and defended.

Vercel reads `vercel.json` from the project's Root Directory. `apps/web/vercel.json`'s
`"buildCommand": "cd ../.. && …"` only works with a Root Directory of `apps/web`, so that is almost
certainly the authoritative file — but the repository already kept the four `codex/*` exclusions in
both files, so the line is required in both rather than guessed at. The migration confirms the Root
Directory in the dashboard.

## Preventing unintended pushes to `release`

- No workflow in `.github/workflows/` writes to `release`. The branch is advanced only by someone
  pushing an explicit sha.
- The branch does not exist until the migration creates it, so nothing deploys from it before then.
- A GitHub ruleset restricting who may push to `release` would make this enforced rather than
  conventional. That is a protected-settings change and needs its own authorization; it is **not**
  part of the configuration change this document ships with.

## Migration

The order matters, because of one question this repository cannot answer by rehearsal.

1. Merge the configuration change into `main`.
2. In Vercel → Settings → Git, confirm the Root Directory, then set **Production Branch** to
   `release`.
3. Create the branch at the commit that is already live:
   `git push origin <sha-of-the-current-production-deployment>:refs/heads/release`. This deploys the
   commit that is already deployed, so the site does not change.
4. Verify: a subsequent ordinary merge into `main` produces no production deployment.

**The open question is step 1.** Either Vercel reads `git.deploymentEnabled` from the commit being
pushed, in which case the merge is skipped and no deployment occurs at all, or it reads the
configuration already present on the production branch, in which case the merge produces exactly one
more automatic production deployment — the last one. Which of the two happens cannot be settled
without performing the push, so the authorization for step 1 covers both readings.

What makes that bounded: the configuration change touches no file that affects rendered output. If
the deployment does occur, it serves byte-identical site content.

Steps 2 and 3 cannot be reordered. With Production Branch still `main` and `main` excluded, no
branch is a production branch and the site has no deployment source; with `release` set but not yet
created, the same. Doing 2 and 3 together, in that order, is what keeps the gap to minutes.
