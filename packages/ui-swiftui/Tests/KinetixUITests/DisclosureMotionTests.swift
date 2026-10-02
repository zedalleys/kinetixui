import XCTest
import SwiftUI
@testable import KinetixUI

// kx-verify: reducedMotion
/// The disclosure family's reduced-motion contract on SwiftUI.
///
/// ── What this can and cannot prove ────────────────────────────────────────
///
/// This target is dependency-free XCTest: no ViewInspector, no XCUITest host, so **nothing here
/// renders a view**, and no test in this package can observe an intermediate frame. That limit is
/// stated rather than worked around — the alternative was a test that reads the source and calls
/// that verification, which is the exact failure `check:motion` was built to stop on the web.
///
/// What it does prove is the rule every disclosure surface routes through: `KinetixAccordion`,
/// `KinetixAccordionContent` and `KinetixCollapsible` each take their animation and transition from
/// `KinetixDisclosureMotion`, so an assertion about that function is an assertion about all three.
/// The gap that remains is the wiring between `@Environment(\.accessibilityReduceMotion)` and this
/// function, which `scripts/check-native-motion.mjs` checks structurally.
///
/// Flutter's widget tests DO render and assert geometry mid-transition; Compose's Robolectric tests
/// drive the real clock. The three platforms are deliberately not claimed to have equal evidence.
final class DisclosureMotionTests: XCTestCase {
    // MARK: normal motion

    func testExpandingAnimatesForTheTokenDuration() {
        let animation = KinetixDisclosureMotion.animation(.expanding, reduceMotion: false)
        XCTAssertNotNil(animation, "expanding with Reduce Motion off must animate")
        XCTAssertEqual(KinetixDisclosureMotion.durationSeconds, 0.2, accuracy: 0.0001,
                       "disclosure must run for KinetixDuration.fast, not a literal")
    }

    func testCollapsingAnimates() {
        XCTAssertNotNil(KinetixDisclosureMotion.animation(.collapsing, reduceMotion: false),
                        "collapsing with Reduce Motion off must animate")
    }

    /// Opening and closing are different curves, not one animation played backwards. #274 landed the
    /// same pair on the web (`ease-enter` in, `ease-exit` out) and this keeps SwiftUI honest to it.
    func testExpandAndCollapseUseTheDirectionalEasingPair() {
        XCTAssertNotEqual(
            KinetixDisclosureMotion.animation(.expanding, reduceMotion: false),
            KinetixDisclosureMotion.animation(.collapsing, reduceMotion: false),
            "expanding should decelerate (enter) and collapsing accelerate (exit) — they must differ"
        )
    }

    func testDurationComesFromTheCanonicalToken() {
        let c = KinetixDuration.fast.components
        let fromToken = Double(c.seconds) + Double(c.attoseconds) / 1e18
        XCTAssertEqual(KinetixDisclosureMotion.durationSeconds, fromToken, accuracy: 0.0001,
                       "retuning the duration token must move SwiftUI with it")
    }

    func testNormalMotionTransitionIsNotIdentity() {
        XCTAssertNotEqual(
            String(describing: KinetixDisclosureMotion.transition(reduceMotion: false)),
            String(describing: AnyTransition.identity),
            "content should move in when Reduce Motion is off"
        )
    }

    // MARK: reduced motion — both directions

    func testReducedMotionSuppressesExpanding() {
        XCTAssertNil(KinetixDisclosureMotion.animation(.expanding, reduceMotion: true),
                     "a nil Animation is SwiftUI's own 'apply the value without interpolating'")
    }

    /// The reverse direction, which the web gate was blind to until review caught it: proving the
    /// opening path says nothing about the closing one.
    func testReducedMotionSuppressesCollapsing() {
        XCTAssertNil(KinetixDisclosureMotion.animation(.collapsing, reduceMotion: true),
                     "collapsing must be suppressed too — expanding alone is not the contract")
    }

    func testReducedMotionDropsTheMovingTransition() {
        XCTAssertEqual(
            String(describing: KinetixDisclosureMotion.transition(reduceMotion: true)),
            String(describing: AnyTransition.identity),
            "under Reduce Motion the content appears rather than travelling"
        )
    }

    // MARK: the state change survives

    /// Reduced motion removes the movement, never the state. Both end states must still be reachable
    /// and still differ, or the setting would have hidden the thing it was meant to calm.
    func testChevronStillReachesBothEndStatesUnderReducedMotion() {
        XCTAssertEqual(KinetixDisclosureMotion.chevronDegrees(isExpanded: false), 0)
        XCTAssertEqual(KinetixDisclosureMotion.chevronDegrees(isExpanded: true), 180)
    }

    func testEndStatesAreIndependentOfTheMotionSetting() {
        for reduce in [false, true] {
            _ = KinetixDisclosureMotion.animation(.expanding, reduceMotion: reduce)
            XCTAssertNotEqual(
                KinetixDisclosureMotion.chevronDegrees(isExpanded: true),
                KinetixDisclosureMotion.chevronDegrees(isExpanded: false),
                "open and closed must stay distinguishable with Reduce Motion \(reduce ? "on" : "off")"
            )
        }
    }
}
