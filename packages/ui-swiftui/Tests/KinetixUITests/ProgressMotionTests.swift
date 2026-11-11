import XCTest
import SwiftUI
@testable import KinetixUI

/// Resolver/compile evidence; does not claim mounted SwiftUI interpolation.
final class ProgressMotionTests: XCTestCase {
    func testIncreasesAndDecreasesUseBaseLinearTiming() {
        let c = KinetixDuration.base.components
        XCTAssertEqual(KinetixProgressMotion.durationSeconds, Double(c.seconds) + Double(c.attoseconds) / 1e18)
        let e = KinetixEasing.linear
        XCTAssertEqual(KinetixProgressMotion.animation(reduceMotion: false), Animation.timingCurve(e.0, e.1, e.2, e.3, duration: KinetixProgressMotion.durationSeconds))
    }
    func testReducedMotionRemovesIncreasesAndDecreasesInterpolation() {
        XCTAssertNil(KinetixProgressMotion.animation(reduceMotion: true))
    }
    func testBoundedTargetsIncludeNegativeDecimalAndNonfiniteValues() {
        XCTAssertEqual(KinetixProgressMotion.fraction(-25), 0)
        XCTAssertEqual(KinetixProgressMotion.fraction(25.25), 0.2525, accuracy: 0.00001)
        XCTAssertEqual(KinetixProgressMotion.fraction(125), 1)
        XCTAssertEqual(KinetixProgressMotion.fraction(.nan), 0)
        XCTAssertEqual(KinetixProgressMotion.fraction(.infinity), 1)
        XCTAssertEqual(KinetixProgressMotion.fraction(-.infinity), 0)
    }
    func testBothDeterminateViewsRetainTheirPublicAPIs() {
        _ = KinetixProgress(value: 25.25)
        _ = KinetixCircularProgress(value: 25.25, showValue: true, label: "Upload")
    }
}
