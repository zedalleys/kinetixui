import XCTest
import SwiftUI
@testable import KinetixUI

// kx-verify: reducedMotion
/// `KinetixSwitch`'s motion contract on SwiftUI.
///
/// ── What this can and cannot prove ────────────────────────────────────────
///
/// This target is dependency-free XCTest: no ViewInspector, no XCUITest host, so **nothing here
/// renders a view** and no test in this package can observe the thumb mid-travel. That limit is
/// stated rather than worked around — the alternative was a test that reads the source and calls
/// that verification, which is the exact failure `check:motion` exists to stop on the web.
///
/// What it does prove is the rule `KinetixSwitch` routes through: the view takes its animation and
/// its thumb alignment from `KinetixSwitchMotion`, so an assertion about those functions is an
/// assertion about the control. The wiring from `@Environment(\.accessibilityReduceMotion)` to them
/// is checked structurally by `scripts/check-native-motion.mjs`.
///
/// Flutter's widget tests DO measure the thumb's rendered offset halfway through its travel
/// (`packages/ui-flutter/test/switch_motion_test.dart`). The three platforms are deliberately not
/// claimed to have equal evidence.
final class SwitchMotionTests: XCTestCase {
    // MARK: normal motion

    func testTravelRunsForTheInstantToken() {
        XCTAssertNotNil(KinetixSwitchMotion.animation(reduceMotion: false),
                        "with Reduce Motion off the thumb must animate")
        XCTAssertEqual(KinetixSwitchMotion.durationSeconds, 0.1, accuracy: 0.0001,
                       "a switch runs for KinetixDuration.instant, not a literal 0.15")
    }

    func testDurationComesFromTheCanonicalToken() {
        let c = KinetixDuration.instant.components
        let fromToken = Double(c.seconds) + Double(c.attoseconds) / 1e18
        XCTAssertEqual(KinetixSwitchMotion.durationSeconds, fromToken, accuracy: 0.0001,
                       "retuning the instant token must move the switch with it")
    }

    /// A switch is symmetric, so it takes `standard` rather than the disclosure family's
    /// directional pair. Asserted by showing it is NOT the enter curve: the two families express
    /// different things and should not quietly converge.
    func testTravelUsesTheStandardCurveNotADirectionalPair() {
        let standard = Animation.timingCurve(
            KinetixEasing.standard.0, KinetixEasing.standard.1,
            KinetixEasing.standard.2, KinetixEasing.standard.3,
            duration: KinetixSwitchMotion.durationSeconds
        )
        XCTAssertEqual(KinetixSwitchMotion.animation(reduceMotion: false), standard,
                       "the switch's curve is the standard token")

        let enter = Animation.timingCurve(
            KinetixEasing.enter.0, KinetixEasing.enter.1,
            KinetixEasing.enter.2, KinetixEasing.enter.3,
            duration: KinetixSwitchMotion.durationSeconds
        )
        XCTAssertNotEqual(KinetixSwitchMotion.animation(reduceMotion: false), enter,
                          "and it is deliberately not the disclosure family's enter curve")
    }

    // MARK: reduced motion — both directions

    /// `animation(reduceMotion:)` takes no direction because a switch is symmetric, so the single
    /// suppressed answer covers OFF → ON and ON → OFF alike. The two names below assert the same
    /// call for each direction on purpose: "symmetric" is a claim about the design, and the test
    /// names are what the CI guard reads to confirm both directions were considered.
    func testOffToOnIsSuppressedUnderReducedMotion() {
        XCTAssertNil(KinetixSwitchMotion.animation(reduceMotion: true),
                     "a nil Animation is SwiftUI's own 'apply the value without interpolating'")
    }

    func testOnToOffIsSuppressedUnderReducedMotion() {
        XCTAssertNil(KinetixSwitchMotion.animation(reduceMotion: true),
                     "turning off is suppressed too — one symmetric spec, both directions")
    }

    // MARK: the state survives

    /// Reduced motion removes the travel, never the destination. The thumb's side is a pure function
    /// of `isOn` with no motion parameter at all, which is the strongest form this can take: there is
    /// no code path on which the setting could move it.
    func testThumbSideIsIndependentOfTheMotionSetting() {
        XCTAssertEqual(KinetixSwitchMotion.thumbAlignment(isOn: false), .leading)
        XCTAssertEqual(KinetixSwitchMotion.thumbAlignment(isOn: true), .trailing)
    }

    func testOnAndOffRemainDistinguishable() {
        XCTAssertNotEqual(
            KinetixSwitchMotion.thumbAlignment(isOn: true),
            KinetixSwitchMotion.thumbAlignment(isOn: false),
            "on and off must stay visually distinct whatever the motion setting"
        )
    }

    /// The thumb's sides are `.leading` and `.trailing`, which SwiftUI resolves against the layout
    /// direction — so the thumb travels toward the reader's trailing edge in RTL with no mirrored
    /// second value. `.left` / `.right` would not; the React port had to add an `rtl:` override for
    /// precisely that reason.
    ///
    /// To be exact about what this asserts: it pins which constants are used. That those constants
    /// mirror is the platform's behaviour, not something a non-rendering test can demonstrate, and it
    /// is not claimed to be. Flutter's suite measures the mirrored geometry for real.
    func testThumbUsesDirectionAwareAlignments() {
        XCTAssertEqual(KinetixSwitchMotion.thumbAlignment(isOn: false), .leading)
        XCTAssertEqual(KinetixSwitchMotion.thumbAlignment(isOn: true), .trailing)
    }
}
