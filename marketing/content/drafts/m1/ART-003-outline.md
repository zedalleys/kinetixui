---
id: ART-003
channel: devto
format: article outline
status: brief — an outline, not a draft. Not approved. Nothing here is scheduled
campaign: kx_p1_a_preview_contract
destination: /docs/angular
---

# ART-003 — outline

**Working title:** *Preview is a measurement, not a modesty label*

**Subtitle:** How we decide when an Angular package that is already on npm gets to be called Stable.

**Audience:** P1, design-system engineers maintaining more than one web framework (React and Angular in
particular), and anyone evaluating a library that publishes a "preview" label.

**One primary message:** *Installable and mature are different claims, and "Stable" should be a gate a
script can fail, measured against your own most-verified implementation, not a feeling.*

**Pillar:** A (verified cross-platform design systems). Pillar F material (Angular idiom) appears only as
supporting detail.

**Why now:** the Angular package is published, and the obvious question a reader asks is "so is it done?".
The repository already answers it with an executable contract (`pnpm check:angular-graduation`, in CI), so
the article explains a mechanism that exists, not a plan.

---

## Hook (first 80 words, draft)

> Our Angular package is on npm. You can install it today. We still call it preview, and a script decides
> when that changes, not me.
>
> Publishing is distribution. It tells you that you *can* install something. It says nothing about whether
> the thing you installed has been checked the way its React sibling has. Those are two different claims,
> and most libraries let the first one quietly stand in for the second.

## Sections

1. **Two questions that look like one.** "Can I install it?" and "Is it mature?". React in this repository is
   a stable package whose catalogue verification is still beta; Angular is published and preview. Show that
   the two questions have different answers on the same product, from `pnpm marketing:stats`.
2. **What Stable means here.** Quote the rule from `ANGULAR-GRADUATION.md`: for every component Angular
   implements, Angular holds every claimable evidence kind React holds for that component, and where React's
   evidence comes from a real browser, Angular's does too. The bar is relative, so it rises when React's
   evidence does, without anyone editing the contract.
3. **The instrument.** `check:angular-graduation` reads the manifest and `verification.json`, prints each
   criterion as met or open with the missing components named, and runs in CI. Show real output.
4. **Where it stands, as fractions.** Re-derive at writing time. Numbers re-derived 2026-10-17 from
   `pnpm marketing:stats` and `pnpm check:angular-graduation`: 80 implemented, 2 native-equivalent and 27
   planned of 109 catalogue entries; build, interaction and accessibility evidence on 80 of 80 implemented;
   RTL 47 of 80; large text 53 of 80; reduced motion 23 of 80; visual 0 of 80. Graduation: 7 of 13 criteria
   met; the open ones name `timeline` (RTL, large text) and `tabs` (reduced motion) as the gaps against React,
   plus the planned catalogue entries.
5. **Real browser, not jsdom.** `check:angular-browser` builds the fixtures AOT and boots them as a live,
   zoneless Angular application in Chromium; every page proves it is Angular (the root carries
   `ng-version`) before it is measured. Explain why: jsdom performs no layout, so a layout claim measured in
   jsdom is not a layout claim.
6. **Proving the gate can fail.** The Angular waves recorded negative controls: deliberately break the
   condition, show the gate fails, restore. One worked example from the Wave A record (for instance the
   rating component without Home/End keys).
7. **What we do not claim.** No Stable date. No parity with React. No visual-regression evidence (0 of 80).
   Preview is the honest label until the script says otherwise, and the article ends on that.

## CTA

The Angular page, with what is implemented and what is planned:
`https://kinetixui.com/docs/angular?utm_source=devto&utm_medium=referral&utm_campaign=kx_p1_a_preview_contract&utm_content=art_primary`

## Evidence the draft must cite (all in the repository)

| Claim | Source |
| --- | --- |
| Angular is published and preview | `components.manifest.json` → `platformDefinitions[]`, `npm view @kinetixui/angular version` |
| The relative Stable rule | `ANGULAR-GRADUATION.md` §What Stable means |
| Criteria met / open | `pnpm check:angular-graduation` output on the day of writing |
| Evidence fractions | `pnpm marketing:stats`, from `verification.json` |
| Real-browser measurement | `scripts/angular-browser.mjs`, `ANGULAR-GRADUATION.md` |
| Negative controls | the Angular wave reports in the project's shared files and the PRs that merged them |

## Claim rules (from `CLAIMS.md`)

- C2: "published on npm" and "preview" always travel together; never a bare count against the catalogue.
- Never "parity", "production ready" or "complete". Never a date for Stable.
- "Angular components" in general; "a directive on a real HTML button" only for the button. Most Angular
  selectors in the package are `kx-*` elements, so "directives on native elements" is not true in general.

## Visual

A single checklist graphic: the 13 graduation criteria as met / open, with the open ones naming their gap.
Must be generated from the script's output, not typed. Production brief: `README.md` in this directory.

## Before drafting

- Re-run both commands above; replace every number.
- If the Angular wave work changes the criteria count before drafting, the article changes, not the gate.
- Owner decision: publish on dev.to only, or also cross-post to Hashnode with `canonical_url`.
