<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Codex reviews: what counts, and what the replies mean

Codex's code review fires on **PR opened**, **ready for review**, and an
**`@codex review` comment** — never on a push. A PR pushed to since its last
receipt has no current review until someone asks again.

Only two things count as a review:

- a `codex-review-receipt:v1` comment carrying **Reviewed commit:** `<sha>`, and
  only when `<sha>` is the PR's current head;
- a `codex-review-state:v1` block whose `commit_sha` is the current head and
  whose `status` is `completed`.

Three other replies are each **not** a review — neither a pass nor a fail — and
none of them may be reported as one.

## 1. "To use Codex here, create an environment for this repo."

**Intermittent. Re-request it.** Despite naming an environment setting, this is
not a standing configuration fault and not something to fix in this
repository — nothing here configures that binding, and a review requested
minutes later can succeed untouched. It posts no review object and comes back in
seconds rather than the ~1–2 minutes a real review takes, so the head it was
asked about has **no review** until a receipt arrives.

Two readings of it have been measured and **both are wrong**:

- *Not a malformed request.* A backtick-wrapped `` `@codex review` `` does
  render as a code span and does emit no GitHub mention, which makes it a
  plausible-looking culprit — the two failures on #531 (02:21:39Z, 02:54:40Z)
  were both backticked while the request that worked at 02:09:05Z was bare.
  Ruled out by #533, whose failure at 12:33:23Z came from *PR opened* with no
  comment at all. Write mentions bare anyway; it is the form that works.
- *Not a lost environment binding.* Ruled out by #532, reviewed normally at head
  `75e44bf0` with a receipt at 12:36:03Z — three minutes after #533's failure,
  with no setting changed in between.

So: wait, re-request with a bare mention, and report the head as unreviewed
until a receipt names it. Do not open a configuration change for it, and do not
report it as clean.

## 2. "You have reached your Codex usage limits for code reviews."

An account-level quota, not specific to any PR. It has recovered on its own
within hours each time it has appeared, so retry later rather than treating it
as permanent. The summary comment alongside it can read `status: "failed"` while
still carrying `has_any_findings` from the *previous* review — that is stale
data about an older head, not findings on this one.

## 3. A `codex-review-state:v1` block reading `"status": "running"`

A status display, not evidence. It can sit at `running` indefinitely without
ever producing a receipt.
