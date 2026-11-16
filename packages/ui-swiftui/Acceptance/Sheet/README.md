# Mounted Sheet VoiceOver restoration

Run the MotionHost scheme’s UI tests on a dedicated iOS 27 simulator with the installed Xcode toolchain. The caller uses one SwiftUI accessibility focus state for the modal and a separate state for the background. The Sheet’s dismissal callback resolves the opener or the currently mounted fallback. The tests require a new utterance with the exact target label after the Sheet leaves the tree, before any VoiceOver navigation.

The test covers normal opener and fallback, reduced motion, and an RTL reopen 90 ms into dismissal. That case requires zero restoration requests while reopened and precisely one at final closure.

For the negative control, in a disposable copy change the `testAudibleOpenerWithDismissalCallback` call to pass `suppressRestore: true`. The scope and dismissal still execute. The exact-target speech assertion must fail. Restore the parameter and rerun to observe the opener.
