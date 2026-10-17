---
id: GH-001
channel: github
format: GitHub Discussion (Announcements)
status: drafted — not approved. Blocked on the repository having Discussions enabled
campaign: kx_neutral_g_project_status
destination: /docs/platforms
---

# GH-001 — project status update

**Where:** a GitHub Discussion in an *Announcements* category, as planned in `../../distribution/github.md`
§1 item 4 and §3. As of 2026-10-17 the repository has Discussions **disabled** (`has_discussions: false`,
read from the GitHub API), so this cannot go out until the owner enables them. Fallback if they stay
disabled: none. A status update pinned as an issue reads as a bug report, so do not use one.

**Audience:** neutral. Someone who arrived at the repository from a post and wants to know, in one screen,
what is real on each platform.

**Hook:** the question every evaluator asks first, "what actually works on my platform?", answered with the
repository's own numbers instead of a feature list.

**Key message:** each platform has a different answer to four questions (implemented, verified, installable,
maturity), and the project publishes all four rather than one tick.

**CTA:** the platform coverage page, tracked:
`https://kinetixui.com/docs/platforms?utm_source=github&utm_medium=referral&utm_campaign=kx_neutral_g_project_status&utm_content=gh_discussion`

**Approval status:** drafted. Numbers below were re-derived 2026-10-17 from `pnpm marketing:stats`; re-run it
and replace every figure on the day this is posted.

---

## Copy

**Title:** Project status: what is implemented, verified and installable on each platform

> This is a short, factual status note for anyone landing here from a post. Every number comes from the
> repository's generated data (`pnpm marketing:stats`), and the same numbers are on the site.
>
> **Installable today.** React and Angular, from npm. Angular is published **and in preview**: a deliberate
> subset of the catalogue, with what is planned listed on the Angular page. Design tokens are on npm too.
>
> **Source you build.** SwiftUI, Jetpack Compose and Flutter are real implementations, compiled in CI. They
> are not on a package registry yet, so there is no install command for them; you build from source.
>
> **How much of the catalogue each platform implements** (109 catalogue entries, one of which is a documented
> recipe rather than a component): React 109, SwiftUI 90, Jetpack Compose 90, Flutter 90, Angular 80 in
> preview. 90 entries are on all four platforms meant to carry the whole catalogue; the rest are documented
> exceptions, each with its reason.
>
> **How much evidence stands behind each**, as fractions rather than ticks: every implementation builds in CI.
> Beyond that the evidence is uneven, and we publish it that way. For example, direction-aware (RTL) behaviour
> is tested on 58 of Flutter's 90 implementations, 47 of Angular's 80, 36 of React's 109, one of Compose's
> and none of SwiftUI's. Visual-regression evidence is 0 on every platform today.
>
> **What this is not.** No platform here is a claim of parity with another, and nothing is described as
> production ready. If a number on the site disagrees with the repository, that is a bug; please open an
> issue.
>
> Coverage and evidence by platform:
> https://kinetixui.com/docs/platforms?utm_source=github&utm_medium=referral&utm_campaign=kx_neutral_g_project_status&utm_content=gh_discussion

## Owner steps

1. Enable Discussions and create the categories in `../../distribution/github.md` §3.
2. Re-run `pnpm marketing:stats`; replace the numbers above.
3. Post by hand; record the Discussion URL as the row's `liveUrl` in `../../distribution/register.json`.
