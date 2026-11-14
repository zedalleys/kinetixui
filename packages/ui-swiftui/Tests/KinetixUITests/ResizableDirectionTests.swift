import SwiftUI
import XCTest
@testable import KinetixUI

final class ResizableDirectionTests: XCTestCase {
    func testRightwardDragGrowsTheLeadingPanelInLTRAndShrinksItInRTL() {
        XCTAssertEqual(fraction(after: 20, in: .leftToRight), 0.7, accuracy: 0.0001)
        XCTAssertEqual(fraction(after: 20, in: .rightToLeft), 0.3, accuracy: 0.0001)
    }

    func testLeftwardDragGrowsTheLeadingPanelInRTLAndShrinksItInLTR() {
        XCTAssertEqual(fraction(after: -20, in: .rightToLeft), 0.7, accuracy: 0.0001)
        XCTAssertEqual(fraction(after: -20, in: .leftToRight), 0.3, accuracy: 0.0001)
    }

    func testBothPhysicalDirectionsClampToLogicalPanelBounds() {
        XCTAssertEqual(fraction(after: 100, in: .leftToRight), 0.85)
        XCTAssertEqual(fraction(after: -100, in: .rightToLeft), 0.85)
        XCTAssertEqual(fraction(after: -100, in: .leftToRight), 0.15)
        XCTAssertEqual(fraction(after: 100, in: .rightToLeft), 0.15)
    }

    private func fraction(after translation: CGFloat, in direction: LayoutDirection) -> CGFloat {
        KinetixResizablePanels<EmptyView, EmptyView>.resizedFraction(
            start: 0.5,
            physicalTranslation: translation,
            available: 100,
            layoutDirection: direction,
            minFraction: 0.15,
            maxFraction: 0.85
        )
    }
}
