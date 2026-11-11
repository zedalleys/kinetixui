# SwiftUI compile-smoke warning correction

The block and usage compile-smoke tests directly evaluated View.body before SwiftUI mounted the View.
State-backed bindings emitted uninstalled-State runtime warnings and returned constant initial bindings.
Construct the concrete view instead: its body is still compiler-type-checked, but no unhosted State read occurs.
This is compile coverage only. It makes no claim about runtime behavior, interaction, accessibility or rendering.

Validated 2026-10-29 against main f54476f6:
`swift test --package-path packages/ui-swiftui --scratch-path /Users/ziadfteha/Library/Caches/MacNotch-Issue5/upstream`
79 XCTest cases passed, zero failures, no warning/error lines in the captured output.
Log kept locally: /Users/ziadfteha/Library/Caches/MacNotch-Issue5/upstream-tests.log.
No component code or exported snippets changed. mac-notch vendor pin remains c55adb5 until separate review.
