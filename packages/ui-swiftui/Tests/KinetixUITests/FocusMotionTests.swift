import XCTest
import SwiftUI
@testable import KinetixUI

/// Source/resolver/compile checks; no mounted focus/VoiceOver claim.
final class FocusMotionTests: XCTestCase {
    func testFocusAndBlurUseTheApprovedInstantStandardPair() {
        let c = KinetixDuration.instant.components
        XCTAssertEqual(KinetixFocusMotion.durationSeconds, Double(c.seconds) + Double(c.attoseconds) / 1e18)
        let e = KinetixEasing.standard
        XCTAssertEqual(KinetixFocusMotion.animation(reduceMotion: false),
                       Animation.timingCurve(e.0, e.1, e.2, e.3, duration: KinetixFocusMotion.durationSeconds))
    }
    func testReducedMotionRemovesSettlingOnFocusAndBlur() {
        XCTAssertNil(KinetixFocusMotion.animation(reduceMotion: true))
    }
    func testInputTextareaAndSecureInputCompileWithoutChangingTheirAPI() {
        _ = KinetixInput(text: .constant("value"))
        _ = KinetixInput(text: .constant("secret"), isError: true, isSecure: true)
        _ = KinetixTextarea(text: .constant("notes"))
    }
}
