# Mounted Sheet VoiceOver restoration

Run the MotionHost scheme’s UI tests on a dedicated iOS 27 simulator with the installed Xcode toolchain. The caller uses one SwiftUI accessibility focus state for the modal and a separate state for the background. The Sheet’s dismissal callback resolves the opener or the currently mounted fallback. The tests require a new utterance with the exact target label after the Sheet leaves the tree, before any VoiceOver navigation.

The test covers normal opener and fallback, reduced motion, and an RTL reopen 90 ms into dismissal. That case requires zero restoration requests while reopened and precisely one at final closure.

## Timing origin

Every figure is seconds from one origin: the instant the dismissal gesture is synthesised. `ProcessInfo.processInfo.systemUptime` is seconds since boot, so the host app and the test runner read the same clock and the host’s own assignment can be compared with the runner’s observations without correction.

Four numbers are reported per trial, and they are not interchangeable:

- `teardown` — gesture until the dismissed heading leaves the tree.
- `appAssigned` — gesture until the host recorded its focus assignment. This is the app’s share.
- `speechMatched` — gesture until VoiceOver first spoke the exact target label.
- `focusMatched` — gesture until the service first reported the target as focused.

Speech and focus are sampled as two independent observations, each stamped immediately after its own read. Sampling them together charges the second read’s cost to the first and cannot say which of the two was late.

The four-second budget is asserted separately from identity, with its own message. A late-but-correct arrival must never be reported as a wrong target, and the budget is never widened to make a case pass.

## Committed negative controls

Both are committed tests and both are **expected to fail**. Their failure is the evidence that the acceptance assertions are live. Run them by name and read the failure reason; the exit code alone tells you nothing.

- `testControlSuppressedRestorationFailsAcceptance` (`--suppress-restore`) — the request is recorded and the assignment is never made, so restoration cannot happen. Proves the restoration assertions are live.
- `testControlWrongTargetFailsIdentityNotTimeliness` (`--restore-to-timeline`) — focus is assigned promptly to a control that is mounted but wrong. Timeliness is satisfied while identity is not, which proves the two assertions are independent rather than one assertion wearing two messages.

A control that reddens for the same reason as the case under test proves nothing, so the two signatures are deliberately distinct.

## Repeated trials

The defect is load-dependent, so a single trial decides nothing about consistency. `testRepeatedOpenerRestorationStaysWithinBudget` and `testRepeatedFallbackRestorationStaysWithinBudget` run five trials each, relaunch the app per trial, print every trial, and fail if **any** trial breaches the budget. Do not replace that with an average: an average hides a breach.

## Separated focus witnesses

`focus-witness` prefers the modal’s focus state, so a sheet-side value masks an already-assigned background target. It is left exactly as it was, and three witnesses separate what it merged: `reader-focus-witness` (modal side), `background-focus-witness` (page side), `assigned-target-witness` (what the host assigned), with `assignment-uptime-witness` carrying the moment it assigned.
