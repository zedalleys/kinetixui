<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Requesting a Codex review

Codex's code review fires on **PR opened**, **ready for review**, and an
**`@codex review` comment** — never on a push. So a PR pushed to since its last
receipt has no current review until you ask again.

Write the mention as bare text at the start of the comment:

```
@codex review
```

**Do not wrap it in backticks.** A comment whose first line is
`` `@codex review` `` renders as a code span, so GitHub emits no mention and the
connector never matches the review command. It falls back to the generic Codex
task path, which needs a Codex Cloud environment, and answers:

> To use Codex here, create an environment for this repo.

That reply is **not** a review, **not** a negative verdict, and **not** an
environment fault — it is a malformed request. It posts no
`codex-review-state:v1` object and no `codex-review-receipt:v1`, and it comes
back in seconds rather than the ~1–2 minutes a real review takes. Re-send the
request with the mention unquoted; do not go changing environment settings.

Measured on PR #531, 2026-11-07: a bare mention at 02:09:05 produced a receipt
for `08463ab` at 02:10:27 (82s). Backtick-wrapped mentions at 02:21:30 and
02:54:28 produced the environment message at 02:21:39 and 02:54:40 (9s and 12s),
with no review object either time.

Two other replies are distinct from both, and neither is a verdict:

- *"You have reached your Codex usage limits for code reviews"* — an
  account-level quota. It has recovered on its own within hours each time;
  retry later rather than treating it as permanent.
- a `codex-review-state:v1` block reading `"status": "running"` — a status
  display, not evidence. Only a receipt whose **Reviewed commit** equals the
  PR's current head counts as a review.
