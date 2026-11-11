# Motion roles and focused native roadmap

Prepared 11 November 2026 for owner and Claude integration review. **Proposal only: no token, contract, ledger, or consumer-register expansion is implemented.** Source observations below are pinned to PR #558 head `8fb6cf9fe873835d30d89c3a452124580364e6c4`; its Angular repair does not change these native sources.

## Proposed semantic roles

| Candidate | Responsibility | Normal behavior to review | Reduced behavior to review |
|---|---|---|---|
| `progress-feedback` | Communicate a determinate amount changing, in bars and rings | Retarget from the current visual amount, with a bounded token duration and a curve selected through rendered comparison | Show the new target immediately, including preference changes mid-flight; accessible amount always reflects the target |
| `focus-feedback` | Make keyboard/input focus visible | Show focus immediately; any optional cosmetic settling must never delay the visible ring | Immediate final focus appearance, with no transition and no change to focus ownership |

These names describe intent. They do not establish new token values. Candidate progress timing can compare existing `base`/`linear` with `fast`/`standard`; choose neither by assertion. Focus may need no animation even in normal mode. Keep error/validation feedback separate from focus unless reviewer evidence supports shared behavior. Indeterminate loading remains governed by `loop`; do not implicitly replace its documented Angular deviations.

Evidence for a progress role: [SwiftUI Progress](https://github.com/zedalleys/kinetixui/blob/8fb6cf9fe873835d30d89c3a452124580364e6c4/packages/ui-swiftui/Sources/KinetixUI/Progress.swift) uses `.animation(.default, value: value)`; [SwiftUI CircularProgress](https://github.com/zedalleys/kinetixui/blob/8fb6cf9fe873835d30d89c3a452124580364e6c4/packages/ui-swiftui/Sources/KinetixUI/CircularProgress.swift) uses a literal 0.3-second ease-out. [Compose Progress](https://github.com/zedalleys/kinetixui/blob/8fb6cf9fe873835d30d89c3a452124580364e6c4/packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui/Progress.kt) and [CircularProgress](https://github.com/zedalleys/kinetixui/blob/8fb6cf9fe873835d30d89c3a452124580364e6c4/packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui/CircularProgress.kt) use `animateFloatAsState` with framework defaults. None reads the repository's motion-preference helper. Numeric continuity has related value tracking, but treating it as a contract consumer requires an explicit decision, not a renamed family.

Evidence for a focus role: [SwiftUI Input](https://github.com/zedalleys/kinetixui/blob/8fb6cf9fe873835d30d89c3a452124580364e6c4/packages/ui-swiftui/Sources/KinetixUI/Input.swift) and [Textarea](https://github.com/zedalleys/kinetixui/blob/8fb6cf9fe873835d30d89c3a452124580364e6c4/packages/ui-swiftui/Sources/KinetixUI/Textarea.swift) animate focus with literal 0.12-second ease-in/out and do not read Reduce Motion. Input also animates error state, which is a distinct responsibility. Current evidence establishes SwiftUI consumers; a second platform must be verified before claiming cross-platform proof.

Before adoption: Claude and the owner review scope and reduced forms; a focused implementation PR adds real consumers and tests, links each native family through `contractRole`, updates the consumer register atomically, and proves clause 6 plus mutation controls still detect removed/mistyped identities, missing role links, and invalid deviations. Keep proposed/observed/proven status honest. Mounted behavior, live preference changes, and assistive-technology evidence remain separate from static source checks.

## Priority order after #558

1. **Compose Sheet/Drawer spatial behavior.** [Sheet](https://github.com/zedalleys/kinetixui/blob/8fb6cf9fe873835d30d89c3a452124580364e6c4/packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui/Sheet.kt) delegates to Material3 `ModalBottomSheet`; Drawer delegates to Sheet. The library has no explicit shared spatial helper or preference routing here. Measure the installed Material3 implementation first: framework motion may already exist, so adding a second animation would be incorrect. Verify entry/exit, retained exit lifetime, scrim, dismissal, drag interruption, focus, semantics, and live animator-scale changes. Use existing `spatial` semantics or record a reviewed deviation. Do not turn bottom-only coverage into an all-edge parity claim.
2. **Flutter Sheet/Drawer spatial behavior.** [Sheet](https://github.com/zedalleys/kinetixui/blob/8fb6cf9fe873835d30d89c3a452124580364e6c4/packages/ui-flutter/lib/src/sheet.dart) immediately returns an empty widget when hidden and otherwise displays a Stack; Drawer delegates. Introduce tested enter/exit lifetime and preference routing in one focused PR. Preserve focus return, dismissal semantics, final geometry, and no motion after disposal. Both directions and live preference changes need widget-clock tests. Preserve the accepted SwiftUI cross-fade deviation.
3. **Four determinate progress gaps:** SwiftUI Progress/CircularProgress and Compose Progress/CircularProgress. Review `progress-feedback` first; then use platform-focused PRs. Test increasing/decreasing values, retargeting, clamping/nonfinite policy, target semantics, and normal-to-reduced/reduced-to-normal changes.
4. **Two SwiftUI focus gaps:** Input/Textarea. Review `focus-feedback`, then verify immediate focus visibility, focus retention, blur, disabled/error combinations, and mid-transition preference changes. Do not silently expand the role to validation feedback.
5. **Compose Carousel preference gap.** Previous/next call `animateScrollToPage` directly. Route reduced motion to immediate page changes and test both directions, boundaries, cancellation, retained focus, and rapid repeated actions.
6. **Flutter JsonViewer preference gap.** The disclosure chevron uses `AnimatedRotation` with a literal 100 ms. Evaluate reuse of the existing disclosure role in a narrow data-viewer PR, with expanded-state semantics and both directions tested. Do not invent a new role just for this chevron.
7. **SwiftUI Dialog ledger disposition.** The ninth entry is an opacity-only transition already accepted as the reduced form. There is no demonstrated positional defect. Review its classification and rendered behavior; do not invent movement or claim an animation fix merely to empty the ledger.

## Counting and acceptance limits

The existing native ledger has nine entries: five SwiftUI, three Compose, one Flutter. Eight warrant preference-routing verification and repair; Dialog is an explicitly recorded exception awaiting disposition. Sheet/Drawer work is additional to these nine and must not be counted as closing them. The native motion checker reports 36 wired components and nine declared gaps; it proves bookkeeping, not complete native animation parity.

Preserve #552's clause 6, `ledgerPlatforms` test seam, original family `contractRole` keys, consumer identities, and SwiftUI slide deviation. The additive numeric family is checked by `native-motion-additions.mjs`, while clause 6 reads the base ledger. This is a declared review boundary: passing the numeric guard does not make numeric motion a proven semantic contract role. No unilateral contract change is part of the CI repair.

No merges, releases, tags, package publication, or deployments are authorized.

## Proposed parameter and platform matrix — pending approval

These are concrete review defaults, not adopted contract values. Existing roles were checked: `press-feedback` covers pressing, `selection-state` covers selection colour/glyphs, `selection-indicator` covers selection travel, `disclosure` covers content expansion, and `loop` covers indeterminate repetition. None establishes determinate progress or focus acquisition semantics.

| Dimension | progress-feedback | focus-feedback |
|---|---|---|
| Purpose and applicability | Determinate Progress/CircularProgress only initially; loading spinners remain loop | Input/Textarea focus state initially; validation/error state needs a separate scope decision |
| Proposed normal duration | Existing `base` (300 ms), to compare with `fast` in a rendered prototype | Focus ring appears immediately; optional colour/edge settling may use existing `instant` (100 ms) |
| Proposed easing | Existing `linear`, so a reported amount tracks without spring overshoot | Existing `standard` only for optional cosmetic settling |
| Allowed properties | Bounded fill fraction, width/scale or ring trim/sweep; never the accessible target value | Outline/ring colour, border colour or shadow strength; no position, size, blur that hides the ring, or delayed focus |
| Reduced form | Exact target immediately, with lifecycle completion preserved | Exact focus appearance immediately; semantic focus and keyboard ownership unchanged |
| Interruption | Retarget from displayed value; no queue; a live Reduce Motion change settles immediately | Rapid focus/blur goes to the latest state; do not steal focus or defer input |
| Accessibility | AT reads target rather than intermediate frames; no frame-by-frame live region; business-event announcements belong to callers | Visible ring and accessibility focus remain synchronous; validation announcements remain independent |
| React | Existing media-query subscription; cancel RAF/listeners on teardown | CSS media query and immediate :focus-visible ring |
| Angular | Injected host document realm, live preference subscription, exact target semantics | Existing stylesheet focus states, immediate ring in both modes |
| SwiftUI | Environment Reduce Motion; resolved token animation or nil/disabled transaction; mounted tests still needed | Immediate focus state, suppress optional animation under Reduce Motion |
| Compose | Existing observed Android animator-scale preference; token tween or snap; target semantics | Existing observed preference; immediate focus indication, no delayed focus requester |
| Flutter | MediaQuery.disableAnimationsOf; token controller/tween or immediate endpoint; dispose safely | FocusNode state remains immediate; disable optional visual interpolation only |
| Negative controls | Ignore live preference; lose target semantics; freeze under frame-spaced updates; use non-token duration; drop/mistype consumer identity; remove contractRole | Hide/delay initial ring; animate despite reduced preference; change focus target; retain callbacks after disposal; remove identity/role mapping |

No role is promoted to proven by this proposal. First implement and measure actual consumers in a focused PR, retain the per-platform evidence limits, and update contract, consumer register, native family mapping and mutation controls together after role review.

## Explicit numeric-family review boundary

#558 is an opt-in numeric utility outside the curated component catalogue. Its additive numeric ledger currently has no base-contract role mapping. This proposal does not disguise all arbitrary numeric values as determinate progress, and does not silently add a role to #558. Claude/owner review must either explicitly accept that utility's documented exclusion/deviation, or approve a separate semantic role and an atomic mapping follow-up. A clean implementation review is not represented here as owner approval of semantic expansion. Until this boundary is resolved, numeric semantic-contract acceptance remains open even when CI is green.
