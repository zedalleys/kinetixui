# Launches

A launch is a sequence, not a day. Each stage has an entry criterion that is a
fact, not a feeling.

## Stage 1 — Technical peers (ready now)

**Goal:** find the holes in the pitch before strangers do.

- **Where:** personal networks, a handful of design-system engineers, one or two
  framework Discords.
- **Ask:** "does the cross-platform claim read as credible, and what would you
  check first?"
- **Entry criteria:** ✅ all met — site is live, three packages published, every
  displayed snippet verified, coverage derived.

## Stage 2 — Design-system and frontend communities

**Goal:** first real inbound from the target ICP.

- **Where:** LinkedIn, X, r/design_system, DEV.
- **Content:** the parity-verification article, the token-pipeline diagram, the
  flagship demo.
- **Entry criteria:**
  - [ ] 2 long-form articles published
  - [ ] `/docs/platforms` reads clearly to someone with no context
  - [ ] a 30-second demo exists
  - [ ] the homepage CTA path works on mobile

## Stage 3 — Broader open-source launch

**Goal:** sustained discovery.

- **Where:** framework subreddits (with genuine contribution first), DEV, X.
- **Entry criteria:**
  - [ ] ≥ 4 weeks of consistent publishing
  - [ ] at least one landing page from `seo.md` shipped and indexed
  - [ ] activation events show a real funnel (not just traffic)
  - [ ] Angular either deeper or clearly framed as preview everywhere

## Stage 4 — Milestone launch (Product Hunt / Hacker News)

**Goal:** one concentrated spike, spent well.

- **Entry criteria — all of:**
  - [ ] a genuine milestone (Angular out of preview, or blocks verified on all
        five platforms, or 1.0)
  - [ ] demo video, not just screenshots
  - [ ] docs answer the top 10 objections
  - [ ] someone other than the maintainer has shipped with it
  - [ ] the maintainer is available for a full day to answer

**Do not launch on Product Hunt before Stage 3 works.** A spike into a funnel
that does not convert wastes the one launch you get.

## Product Hunt preparation (prepared, not submitted)

- **Tagline:** One token architecture, natively implemented on every platform.
- **Short description:** KinetixUI compiles one DTCG token source into every
  platform's token output and ships native component implementations for React,
  SwiftUI, Jetpack Compose and Flutter, with Angular in preview. Platform
  coverage is verified against source in CI, not asserted.
- **Maker story angle:** built because keeping a design language consistent
  across web and native meant maintaining four implementations by hand, and
  every library that claimed to solve it either shipped web views or could not
  prove its own coverage. The interesting engineering turned out to be the
  verification, not the components.
- **First comment:** the three guardrails and what each caught in our own
  repository — including that our platform counts were wrong.
- **Assets needed:** homepage screenshot (light + dark) · flagship demo GIF ·
  token pipeline diagram · platform coverage table · CLI install clip.
- **FAQ:** Is this React Native? (No.) Do I have to use all of it? (No — tokens
  only is a supported path.) Is Angular ready? (Preview, 31 of 98, stated
  everywhere, and not published to npm.) What is the licence? (MIT.) Is there a paid tier? (Not yet.)

**No testimonials.** None exist. Engineering proof only.

## Campaigns

Five, each with a hero insight, an article, posts, a demo, a CTA and a measure.

### 1. "Cross-platform design systems should prove parity" ← **start here**
- **Insight:** every library claims parity; ours fails its own build if the claim
  has no source.
- **Article:** a01 · **Demo:** guardrail catching a false claim
- **CTA:** `/docs/platforms` · **Measure:** platform-doc views, article referrals

### 2. "Tokens without widgets"
- **Insight:** a design system should be adoptable one layer at a time.
- **Article:** p01 · **Demo:** stock Flutter widgets inheriting the theme adapter
- **CTA:** `/docs/flutter` · **Measure:** Flutter doc views, install copies

### 3. "One design language, native implementations"
- **Insight:** sharing a contract is not sharing a codebase.
- **Article:** a03/c03 · **Demo:** one Button, four idioms
- **CTA:** homepage flagship · **Measure:** `platform_selected` spread

### 4. "RTL should not be a per-platform afterthought"
- **Insight:** RTL is an architecture decision made once.
- **Article:** p05 · **Demo:** direction toggle across platforms
- **CTA:** `/docs/rtl` · **Measure:** RTL page entries from search

### 5. "Building KinetixUI in public"
- **Insight:** the bugs are the content.
- **Format:** ongoing (b01–b06) · **CTA:** GitHub
- **Measure:** returning visitors, stars from post referrals

## Newsletter — strategy only, nothing built

**"KinetixUI Build Notes"**, monthly: releases, one architecture lesson, one
community highlight, what is next. No provider, no capture form, no list until
there is a reason for one. Revisit at Stage 3.
