import XCTest
import SwiftUI
@testable import KinetixUI

// kx-verify: reducedMotion
/// Sheet, Sidebar and Toaster's entrance and exit on SwiftUI.
///
/// Same limit as `SwitchMotionTests` and `LoopMotionTests`: dependency-free XCTest with no view
/// inspection, so nothing here renders a panel and no test can watch one slide. It proves the resolver all
/// three route through, and `scripts/check-native-motion.mjs` checks the wiring structurally.
final class SlideMotionTests: XCTestCase {
    // MARK: normal motion

    func testPanelsSlideInFromTheirEdgeWithNormalMotion() {
        // `AnyTransition` is not Equatable, so the assertion is on the decision `transition(from:)` is built on.
        XCTAssertTrue(KinetixSlideMotion.slides(reduceMotion: false))
    }

    func testTheLibraryDismissesWithTheDefaultAnimationWithNormalMotion() {
        XCTAssertEqual(KinetixSlideMotion.dismissAnimation(reduceMotion: false), Animation.default)
    }

    // MARK: reduced motion

    func testPanelsFadeInsteadOfSlidingWithReducedMotion() {
        // The presented state is the same; only the movement across the screen goes.
        XCTAssertFalse(KinetixSlideMotion.slides(reduceMotion: true))
    }

    func testTheToasterDismissIsAShortFadeOnTheInstantTokenWithReducedMotion() {
        // Not `nil`: that would drop the fade and make the toast vanish in a single frame.
        XCTAssertEqual(
            KinetixSlideMotion.dismissAnimation(reduceMotion: true),
            Animation.linear(duration: KinetixSwitchMotion.durationSeconds)
        )
    }
}
