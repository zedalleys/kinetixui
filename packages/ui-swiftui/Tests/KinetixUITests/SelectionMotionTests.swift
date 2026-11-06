import XCTest
import SwiftUI
@testable import KinetixUI

/// The selection-STATE family's contract on SwiftUI: `KinetixToggle`, `KinetixCheckbox` and
/// `KinetixRadioButton`.
///
/// ── What this can and cannot prove ────────────────────────────────────────
///
/// The same limit `SwitchMotionTests` states, for the same reason: this target is dependency-free
/// XCTest with no ViewInspector and no XCUITest host, so **nothing here renders**. No test in this
/// package can watch a checkbox's fill settle, and none claims to. Evidence on the ladder for these
/// three components stays at Build verified on SwiftUI; this suite is the resolver's contract, and
/// the wiring from `@Environment(\.accessibilityReduceMotion)` into it is checked structurally by
/// `scripts/check-native-motion.mjs`.
///
/// Compose's Robolectric suite composes these controls for real, and Flutter's widget tests measure
/// an interpolated colour mid-transition. The three platforms are deliberately not claimed to hold
/// equal evidence.
///
/// ── Why there is no `kx-verify` marker ────────────────────────────────────
///
/// Two reasons, and the second is a finding in its own right.
///
/// 1. A resolver returning 0.2 is not evidence that anything settled over 200ms. `SwitchMotionTests`
///    claims `reducedMotion` on the same footing, which is a weaker claim than it reads as; this
///    slice declines to add a second one rather than quietly widening the precedent.
/// 2. The subject extractor (`scripts/covered-slugs.mjs`) matches a component stem by PREFIX, so the
///    symbol `KinetixSelectionMotion` resolves to the `Select` component — a marker here would have
///    credited Select with reduced-motion evidence it has nothing to do with, which is the same
///    naming-coincidence failure that module's own header records for `KinetixDirectionProvider`.
///    Left as an out-of-scope finding: tightening the match (require the stem to be followed by an
///    uppercase letter or nothing) touches the Angular browser gates too, so it belongs in its own
///    slice rather than inside an accessibility fix.
final class SelectionMotionTests: XCTestCase {
    // MARK: normal motion

    func testSelectionSettlesOverTheFastToken() {
        XCTAssertNotNil(KinetixSelectionMotion.animation(reduceMotion: false),
                        "with Reduce Motion off the colour must settle rather than cut")
        XCTAssertEqual(KinetixSelectionMotion.durationSeconds, 0.2, accuracy: 0.0001,
                       "selection-state is fast (200ms), not the switch's instant")
    }

    func testDurationComesFromTheCanonicalToken() {
        let c = KinetixDuration.fast.components
        let fromToken = Double(c.seconds) + Double(c.attoseconds) / 1e18
        XCTAssertEqual(KinetixSelectionMotion.durationSeconds, fromToken, accuracy: 0.0001,
                       "retuning the fast token must move these three controls with it")
    }

    /// The owner decision of 2026-10-17, as an assertion rather than a comment: the two selection
    /// roles are not to be normalised. A refactor that collapsed them into one helper would make
    /// this fail, which is the only way that decision survives contact with future convenience.
    func testSelectionStateIsNotTheSwitchsInstantRole() {
        XCTAssertNotEqual(KinetixSelectionMotion.durationSeconds, KinetixSwitchMotion.durationSeconds,
                          "a colour settling (fast) and a thumb landing (instant) are different roles")
        XCTAssertEqual(KinetixSwitchMotion.durationSeconds, 0.1, accuracy: 0.0001,
                       "and the switch is unchanged by this slice")
    }

    /// Symmetric, so `standard` rather than the disclosure family's directional pair. Asserted by
    /// showing it is NOT the enter curve: the two families express different things and must not
    /// quietly converge.
    func testSelectionUsesTheStandardCurveNotADirectionalPair() {
        let standard = Animation.timingCurve(
            KinetixEasing.standard.0, KinetixEasing.standard.1,
            KinetixEasing.standard.2, KinetixEasing.standard.3,
            duration: KinetixSelectionMotion.durationSeconds
        )
        XCTAssertEqual(KinetixSelectionMotion.animation(reduceMotion: false), standard)

        let enter = Animation.timingCurve(
            KinetixEasing.enter.0, KinetixEasing.enter.1,
            KinetixEasing.enter.2, KinetixEasing.enter.3,
            duration: KinetixSelectionMotion.durationSeconds
        )
        XCTAssertNotEqual(KinetixSelectionMotion.animation(reduceMotion: false), enter)
    }

    // MARK: reduced motion — both directions

    /// `animation(reduceMotion:)` takes no direction because selecting and unselecting are the same
    /// change reversed. The two names below assert the same call on purpose: "symmetric" is a claim
    /// about the design, and these names are what the CI guard reads to confirm both directions were
    /// considered.
    func testUncheckedToCheckedIsSuppressedUnderReducedMotion() {
        XCTAssertNil(KinetixSelectionMotion.animation(reduceMotion: true),
                     "a nil Animation is SwiftUI's own 'apply the value without interpolating'")
    }

    func testCheckedToUncheckedIsSuppressedUnderReducedMotion() {
        XCTAssertNil(KinetixSelectionMotion.animation(reduceMotion: true),
                     "unselecting is suppressed too — one symmetric spec, both directions")
    }

    // MARK: the state survives

    /// Reduced motion removes the interpolation, never the state. For this family the state is the
    /// colour's end value and the accessibility value, neither of which takes a motion parameter at
    /// all — there is no code path on which the setting could change what is shown or announced.
    func testTheAnnouncedStateTakesNoMotionParameter() {
        for reduce in [false, true] {
            _ = KinetixSelectionMotion.animation(reduceMotion: reduce)
            XCTAssertEqual(KinetixTriState.resolve(isOn: true, indeterminate: false).accessibilityValue, "Checked")
            XCTAssertEqual(KinetixTriState.resolve(isOn: false, indeterminate: false).accessibilityValue, "Unchecked")
        }
    }
}
