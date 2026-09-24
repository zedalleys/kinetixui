---
title: Your cross-platform design system may be lying about parity
published: false
description: We advertised a component on three platforms that had no implementation on any of them. What a platform matrix actually proves, and the three levels of verification that catch the difference.
tags: designsystems, architecture, testing, opensource
series: ""
---

<!--
  DEV front matter notes — read before publishing.

  `published: false` until the moment of posting. Flip it in the DEV editor, not
  here, so a stray commit cannot publish anything.

  `canonical_url` is DELIBERATELY ABSENT. DEV is the original location for this
  piece. There is no article URL on kinetixui.com — no blog exists — and
  pointing canonical at /docs/platforms would be wrong: that page is the
  platform coverage table, not this article. Leaving it blank makes DEV
  canonical, which is correct. Add one only if an owned article URL ever exists.

  Tags: DEV allows four. `designsystems` and `architecture` carry the audience;
  `testing` catches the verification angle; `opensource` is the weakest of the
  four and is the one to swap if a better fit appears.

  The body below is the full article. Keep it in sync with article.md — that
  file is the source of truth, this one is the channel package.
-->

<!-- BODY: paste the current contents of article.md from the H1 down, excluding
     its YAML front matter. Verify the numbers against `pnpm marketing:stats`
     first — see publish-checklist.md step 1. -->
