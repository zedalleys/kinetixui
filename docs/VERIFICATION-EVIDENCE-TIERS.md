# Verification evidence tiers (schema version 2)

Status: **implemented in ENG-2b-5.** The owner approved Option B of `docs/VERIFICATION-RUNTIME-DECISION.md`: a
distinct Headless verified tier, with the execution environment recorded and shown.

## The ladder

One ladder for components and blocks, weakest first. It is decided in exactly one place:
`scripts/evidence-levels.mjs` `levelFrom`, called by `gen:verification`.

| Level | Rule |
|---|---|
| Not implemented | The manifest declares no implementation on this platform. |
| Source present | The implementation exists, and no required CI step compiles it. |
| Build verified | A required, unconditional CI step compiles it. Interaction and accessibility are not both tested. |
| Headless verified | Build, plus tests CI executes assert **both** interaction and accessibility, and at least one of the two ran only in a headless environment. |
| Runtime verified | Build, plus interaction and accessibility **both observed** in a runtime environment. |

The web site also has a reader-side rung, "Not verified", for a declared part with no record. The generator never
emits it.

The two lists of environments are in `scripts/evidence-levels.mjs`:

- **Runtime:** `chromium`. A native simulator, emulator or device suite would be added here when one exists. None
  does today.
- **Headless:** `jsdom`, `xctest`, `robolectric` and `flutter_test`.

An environment in neither list fails `gen:verification`, so a new test host cannot fall between the tiers unnoticed.

The verification ladder on component pages and /docs/platforms (Experimental, Beta, Stable, from
`gen-manifest.mjs`) is a separate scale that counts *which kinds* are tested. It never says "runtime", and this
migration does not change it.

## What a test must do to count

A passage earns credit only when all of these hold:

1. **It is marked.** It carries a `kx-verify:` marker for components, or `kx-verify-block:` for blocks.
2. **It names its subject.** Its subject is read from the symbols it uses, never from a list: one component's test
   never verifies another, and component and block evidence never mix.
3. **It is on the right platform.** It lives in that platform's test tree. A React test never verifies Angular.
4. **CI executes it, unconditionally.**
   - The unit suites must be run by an exact CI step:
     - `pnpm --filter @kinetixui/ui test`
     - `pnpm test:angular`
     - `swift test`
     - `./gradlew :ui:testDebugUnitTest`
     - `flutter test`
   - Each package script that command goes through must itself be exactly the next command: `packages/ui`,
     `packages/ui-angular` and `apps/web` `test` are `vitest run`, and the root `test:angular` is
     `pnpm --filter @kinetixui/angular test`. A wrapper repointed at `echo` or `vitest run || true` loses the credit.
   - The browser scripts must be run by a step of their own, directly or through their package script.
   - The step loses its credit if it has an `if:` or `continue-on-error`, or if it is masked:
     - `|| true` or `; true`;
     - a pipe;
     - an `echo`.

   A step that ignores a failure would let a failing test keep its credit, so such a step counts as not running
   the test.
5. **It skips nothing.** A passage containing a skipped test loses its credit. The skip forms recognised are:
   - `it.skip`, `xit`, `describe.skip`, `it.todo` and `skipIf`;
   - `XCTSkip` and the Swift Testing trait `@Test(.disabled(…))` (not the SwiftUI `.disabled(` view modifier);
   - `@Ignore`, `@Disabled` and JUnit assumptions;
   - Dart `skip:`.

A suite or passage that fails rule 4 or 5 still has its markers validated. It records nothing, and it is listed in
`verification.json` `uncredited` with the reason. Today that list is empty.

A test that fails is not credited because CI fails. Evidence is only ever generated from a tree whose required
steps pass, and rule 4 removes credit from any step that could pass while a test failed.

## Generated schema changes (`verification.json`)

These are all additions. No existing key changed meaning, and no evidence reference moved.

| Key | What it holds |
|---|---|
| `schemaVersion` | `2` |
| `evidenceLevels` | The ladder above |
| `headlessEnvironments` | Beside the existing `runtimeEnvironments` |
| `componentLevels[slug][platform]` | `{ level, interaction?: [env], accessibility?: [env] }` for every catalogue component on every platform. This is the only place a component's level is decided. The site reads it; it never recomputes. |
| `componentLevelTotals[platform][level]` | Components per level |
| `uncredited` | `[{ ref, reason }]` for evidence that earns nothing |
| `blocks[slug].platforms[p].level` | May now be `headless` |
| `blockTotals` | Gains `headless` |

These keys are unchanged: `components`, `sources`, `totals`, `kinds`, `claimableKinds` and `blockKinds`. Each
evidence reference keeps its `path:start-end` and its environment.

## Readiness

/use-cases floors are still the **weakest** required part, now over six rungs.

A headless part pulls a runtime floor down to Headless verified, and a build block holds the overall floor at
Build verified. So adding a rung can only lower a floor or leave it where it is.

The tests check every real floor against the minimum of its parts, computed without the implementation.

## Migration result (main 716619f with #401, then this change)

### Components

| Platform | Before: Build | Before: Runtime | After: Build | After: Headless | After: Runtime |
|---|---|---|---|---|---|
| React | 61 | 48 | 61 | 48 | 0 |
| Angular | 0 | 80 | 0 | 20 | 60 |
| SwiftUI | 90 | 0 | 90 | 0 | 0 |
| Compose | 86 | 4 | 86 | 4 | 0 |
| Flutter | 85 | 5 | 85 | 5 | 0 |

Not-implemented cells are unchanged: Angular 29, and SwiftUI, Compose and Flutter 19 each.

Of the 77 candidate cells from the ENG-2b-4 audit:

| Outcome | Cells |
|---|---|
| Moved to Headless verified | **77**: React 48, Angular 20, Compose 4, Flutter 5 |
| Kept Runtime verified, with interaction and accessibility observed in Chromium | 60, all Angular, none of them among the 77 |
| Fell back to Build verified | 0 |
| Unclassified | 0 |

### Blocks

Blocks were already strict about runtime, so the only change is that 7 cells with headless interaction and
accessibility move from Build verified to Headless verified:

| Block | Platforms |
|---|---|
| filter-panel | Angular, Compose, Flutter |
| profile-form | Compose, Flutter |
| editor-toolbar | Compose, Flutter |

Runtime blocks are unchanged: React order-summary and receipt.

### Use Cases

No workflow floor changed:
- React's component floor was and is Build verified.
- Every other platform's floor is Not implemented.

Individual part cells now say Headless verified where they said Runtime verified.

## What cannot be classified yet

No evidence today is unclassified. A part would become unclassifiable if:

- a new suite ran in an environment missing from both lists (`gen:verification` fails until it is classified); or
- a native device or simulator suite appeared (it must be added to `RUNTIME_ENVIRONMENTS` deliberately, with its CI
  step).

## Provenance

- No evidence reference was rewritten, and no historical line range moved.
- `verification.json` at 716619f, or at #401's head, can be compared key for key. The old component level is
  reproducible from its `components` and `sources` with the old rule: build plus interaction plus accessibility
  meant Runtime.
