# What "Runtime verified" means: components vs blocks

Status: **decided: Option B, approved by the owner and implemented in ENG-2b-5.** See
`docs/VERIFICATION-EVIDENCE-TIERS.md` for the ladder as built. What follows is the decision record as proposed.

## The problem

There are two runtime rules, and they mean different things.

**Blocks (BD-W3b2b-3, #399).** A block is Runtime verified only when its interaction **and** its
accessibility were *observed*, meaning they ran in a real browser or on a simulator, emulator or device.
`gen:verification` records the environment of every block test. `RUNTIME_ENVIRONMENTS` is `["chromium"]`
today, so headless runs (jsdom, Robolectric, flutter_test, XCTest) never lift a block above Build verified.

**Components (`workflow-readiness.ts` `levelFor`, used on /use-cases).** A component is Runtime verified when
it holds `build`, `interaction` and `accessibility` evidence, wherever those tests ran. A Vitest/jsdom
behaviour test counts the same as a Playwright run in Chromium.

The /docs/platforms ladder (Experimental, Beta, Stable, from `platform-parity.json`) is a third scale. It
never uses the word "runtime", and nothing here changes it.

As a result, one /use-cases table can show a component as "Runtime verified" on the same headless evidence
that keeps a block at "Build verified".

## What ran where (generated data at 716619f plus this PR)

Since this PR, `verification.json` records each component evidence file's environment in
`sources[platform][].environment`. That is additive provenance and changes no level.

| Platform | Component cells "Runtime verified" today | ...with interaction and accessibility both seen in a browser | Would drop under a unified rule |
|---|---|---|---|
| React | 48 | 0 | 48 |
| Angular | 80 | 60 | 20 |
| SwiftUI | 0 | 0 | 0 |
| Compose | 4 | 0 | 4 |
| Flutter | 5 | 0 | 5 |

Why the numbers fall where they do:
- **React:** interaction evidence is all jsdom (`components-behavior.test.tsx` and similar). Accessibility
  is also observed in Chromium (`scripts/a11y-browser.mjs`). No React browser suite drives interaction.
- **Angular:** `scripts/angular-browser.mjs` and the overlay, collection and layout suites drive 60
  components in Chromium. The other 20 rely on jsdom specs alone.
- **Compose and Flutter:** Robolectric and flutter_test only. There is no emulator or device evidence.

**/use-cases impact today: none.** Over the 4 published workflows, every platform's component floor is
unchanged under the unified rule. React's floor is already Build verified, because at least one component in
each workflow lacks interaction evidence. The other platforms' floors are Not implemented, because each
workflow uses a component missing there. The effect would land on individual cells in "Evidence for each
part" and on any future workflow whose components are all runtime.

## Options

### A. One unified observed-runtime rule
Component Runtime requires interaction and accessibility observed in a browser, simulator, emulator or
device, the same rule as blocks.

- **Truthfulness:** highest. "Runtime" would mean one thing everywhere.
- **CI feasibility:** fine for what exists. Each component regains Runtime only by gaining a browser or
  device suite, and native needs emulators or simulators that CI does not run today.
- **Coverage impact:** 77 component cells drop to Build verified: React 48, Angular 20, Compose 4, Flutter 5.
- **Use Cases impact:** no floor changes today; part cells change.
- **Migration:** small in code, because the environment is already recorded. But it is a visible
  reclassification that needs a changelog note.
- **Comprehension:** best.

### B. Platform-specific evidence tiers with explicit environment labels
Keep three levels, but split the top one by where the tests ran. For example, "Runtime verified (browser or
device)" versus "Behaviour verified (headless)", with the environment always shown beside the level.

- **Truthfulness:** high. Nothing headless is called runtime.
- **CI feasibility:** no new CI.
- **Coverage impact:** the same 77 cells move from "Runtime" to the headless tier. Nothing is reported as
  less tested than it is.
- **Use Cases impact:** a new level between Build and Runtime, and the floor logic gains one rung.
- **Migration:** moderate. A new `EvidenceLevel`, labels, tests, and the block model gains the same tier.
- **Comprehension:** good, but it is one more word for readers to learn.

### C. Keep both rules, with separate names
Components keep "interaction and accessibility recorded", renamed to say so (for example "Tested"), and
blocks keep "Runtime verified".

- **Truthfulness:** adequate, but a reader comparing a component and a block in the same table still has to
  learn two vocabularies.
- **CI feasibility, coverage, Use Cases:** no change.
- **Migration:** a label change, plus keeping two models in sync for good.
- **Comprehension:** weakest.

## Recommendation: B, adopted in two steps

1. **This PR, backward compatible:** record each component evidence file's environment, and show it beside
   every component level on /use-cases ("Accessibility observed in a browser; interaction tested headless"),
   using the same note blocks already have. No level changes. A component shown as Runtime verified on
   headless tests now says so beside the label.
2. **Owner decision:** introduce the headless tier (B), or adopt A outright. Either reclassifies the 77
   cells above. B keeps the information that the logic was tested, which A discards. A gives the single,
   strictest meaning.

What would make me recommend A instead: a plan to add browser interaction suites for React, and emulator or
simulator runs for Compose and Flutter. A drops those cells to Build until such evidence exists, so A is only
cheap when that evidence is on the way.

## Provenance

- Historical evidence is untouched: refs and line ranges are unchanged, and `environment` is a new field.
- An `environment` is a fact about the file, set in `gen-verification.mjs` (`TEST_SOURCES`,
  `BLOCK_TEST_SOURCES`). No test can claim it.
- A guardrail (`verification-guardrails.test.ts`, "component evidence records where it ran") fails if a
  source has no environment, if a unit test is labelled as a browser suite, or if a native suite is
  labelled as anything but its headless host.
