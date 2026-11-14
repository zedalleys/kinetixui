import XCTest
@testable import KinetixUI

final class SelectionIndicatorTests: XCTestCase {
    func testForwardAndBackwardTravelRequireStableGeometry() {
        XCTAssertNotNil(KinetixSelectionIndicator.animation(reduceMotion: false, stableGeometry: true))
        XCTAssertNil(KinetixSelectionIndicator.animation(reduceMotion: false, stableGeometry: false))
    }

    func testReducedMotionRemovesTravelEvenWhenLayoutIsStable() {
        XCTAssertNil(KinetixSelectionIndicator.animation(reduceMotion: true, stableGeometry: true))
    }
}
