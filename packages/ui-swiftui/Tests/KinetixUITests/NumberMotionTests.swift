import XCTest
import SwiftUI
@testable import KinetixUI

/// Resolver/compile tests only: these do not render SwiftUI or claim VoiceOver behavior.
final class NumberMotionTests: XCTestCase {
    func testIncreasesAndDecreasesUseTheBaseToken() {
        let c = KinetixDuration.base.components
        XCTAssertEqual(KinetixNumberMotion.durationSeconds, Double(c.seconds) + Double(c.attoseconds) / 1e18)
        XCTAssertNotNil(KinetixNumberMotion.animation(reduceMotion: false))
        _ = KinetixAnimatedNumber(value: 100, format: { String($0) })
        _ = KinetixAnimatedNumber(value: -20, format: { String($0) })
    }
    func testReducedMotionRemovesInterpolationForIncreasesAndDecreases() {
        XCTAssertNil(KinetixNumberMotion.animation(reduceMotion: true))
    }
}
