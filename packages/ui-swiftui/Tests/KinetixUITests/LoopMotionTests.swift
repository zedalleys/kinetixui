import XCTest
import SwiftUI
@testable import KinetixUI

// kx-verify: reducedMotion
/// The continuous-loop family's contract on SwiftUI: Spinner, Skeleton, Marquee, TypingIndicator.
///
/// ── What this can and cannot prove ────────────────────────────────────────
///
/// Like `SwitchMotionTests`, this target is dependency-free XCTest with no view inspection, so
/// **nothing here renders a view** and no test can observe a spinner turning or a ScrollView
/// appearing. That limit is stated rather than worked around. What it proves is the resolver every
/// loop routes through: with Reduce Motion on, `KinetixLoopMotion.loop` returns no animation at all
/// (so nothing repeats), and with it off the animation is the repeating one. The wiring from
/// `@Environment(\.accessibilityReduceMotion)` to the resolver is checked structurally by
/// `scripts/check-native-motion.mjs`. Flutter's widget tests DO sample the rendered values over time
/// (`packages/ui-flutter/test/loop_motion_test.dart`); the platforms are not claimed to have equal
/// evidence.
final class LoopMotionTests: XCTestCase {
    // MARK: normal motion

    func testLoopsRunWithNormalMotion() {
        XCTAssertTrue(KinetixLoopMotion.runs(reduceMotion: false))
        XCTAssertNotNil(KinetixLoopMotion.loop(.linear(duration: 0.8), reduceMotion: false, autoreverses: false))
    }

    func testTheLoopRepeatsForeverWithNormalMotion() {
        let expected = Animation.linear(duration: 0.8).repeatForever(autoreverses: false)
        XCTAssertEqual(KinetixLoopMotion.loop(.linear(duration: 0.8), reduceMotion: false, autoreverses: false), expected)
    }

    func testLoopPeriodsMirrorTheWebKeyframes() {
        XCTAssertEqual(KinetixLoopMotion.spinnerPeriodSeconds, 0.8, accuracy: 0.0001)
        XCTAssertEqual(KinetixLoopMotion.skeletonHalfCycleSeconds, 1, accuracy: 0.0001)
        XCTAssertEqual(KinetixLoopMotion.typingHalfCycleSeconds, 0.6, accuracy: 0.0001)
        XCTAssertEqual(KinetixLoopMotion.typingStaggerSeconds, 0.15, accuracy: 0.0001)
    }

    // MARK: reduced motion

    func testLoopsDoNotRunWithReducedMotion() {
        XCTAssertFalse(KinetixLoopMotion.runs(reduceMotion: true))
    }

    func testSpinnerPulseAndTypingLoopsAreRemovedWithReducedMotion() {
        // `nil` is SwiftUI's "no animation": nothing repeats and no frames are scheduled. A shortened
        // loop would only turn faster, which is the opposite of what the setting asks for.
        XCTAssertNil(KinetixLoopMotion.loop(.linear(duration: 0.8), reduceMotion: true, autoreverses: false))
        XCTAssertNil(KinetixLoopMotion.loop(.easeInOut(duration: 1), reduceMotion: true, autoreverses: true))
        XCTAssertNil(KinetixLoopMotion.loop(.easeInOut(duration: 0.6), reduceMotion: true, autoreverses: true, delay: 0.3))
    }

    // MARK: the information survives

    func testTypingDotsRestAtTheMutedOpacityTokenWithReducedMotion() {
        XCTAssertEqual(KinetixLoopMotion.restingDotOpacity, KinetixOpacity.muted, accuracy: 0.0001)
    }

    func testTheMarqueeAndTheSpinnerKeepTheirViewsWithReducedMotion() {
        // Construction must not depend on the setting: the static form is a rendering choice inside the
        // view, never a different or missing component.
        _ = KinetixSpinner(label: "Loading results")
        _ = KinetixSkeleton()
        _ = KinetixTypingIndicator()
        _ = KinetixMarquee { Text("Alpha") }
    }
}
