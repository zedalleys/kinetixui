import XCTest
@testable import KinetixUI

final class SelectionIndicatorTests: XCTestCase {
    private let earlier = CGRect(x: 0, y: 0, width: 80, height: 32)
    private let later = CGRect(x: 160, y: 0, width: 80, height: 32)

    func testEarlierToLaterSelectionIndicatorTravel() {
        XCTAssertNotNil(KinetixSelectionIndicator.animation(
            reduceMotion: false, stableGeometry: true, from: earlier, to: later
        ))
    }

    func testLaterToEarlierSelectionIndicatorTravel() {
        XCTAssertNotNil(KinetixSelectionIndicator.animation(
            reduceMotion: false, stableGeometry: true, from: later, to: earlier
        ))
    }

    func testReducedMotionRemovesTravelEvenWhenLayoutIsStable() {
        XCTAssertNil(KinetixSelectionIndicator.animation(
            reduceMotion: true, stableGeometry: true, from: earlier, to: later
        ))
    }

    func testUnstableAndUnchangedGeometryRemoveTravel() {
        XCTAssertNil(KinetixSelectionIndicator.animation(
            reduceMotion: false, stableGeometry: false, from: earlier, to: later
        ))
        XCTAssertNil(KinetixSelectionIndicator.animation(
            reduceMotion: false, stableGeometry: true, from: earlier, to: earlier
        ))
    }
}
