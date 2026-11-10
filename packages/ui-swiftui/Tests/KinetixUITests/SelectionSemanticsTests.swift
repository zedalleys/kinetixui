import XCTest
import SwiftUI
@testable import KinetixUI

/// What `KinetixCheckbox` tells VoiceOver, as a function.
///
/// ── Deliberately unmarked ─────────────────────────────────────────────────
///
/// There is no `kx-verify: accessibility` marker on this file, and that is the point. These are
/// assertions about a pure resolver — the strings and the tri-state logic the view reads — and a
/// resolver passing proves nothing about what assistive technology actually receives. Claiming
/// `accessibility` here would move `checkbox` to Headless verified on SwiftUI on the strength of a
/// string comparison, which is exactly the inflation the ladder exists to prevent. SwiftUI's
/// checkbox stays Build verified until something renders it.
///
/// What this DOES hold is the regression that caused the defect: the three states were being derived
/// twice inside the view and the accessibility derivation was wrong. There is now one derivation,
/// and these tests fail if it drifts.
final class SelectionSemanticsTests: XCTestCase {
    func testMixedWinsOverTheUnderlyingBool() {
        // The glyph already behaved this way — a box showing a dash is mixed whatever `isOn` says.
        // Accessibility now agrees with the glyph, which is the whole fix.
        XCTAssertEqual(KinetixTriState.resolve(isOn: true, indeterminate: true), .mixed)
        XCTAssertEqual(KinetixTriState.resolve(isOn: false, indeterminate: true), .mixed)
    }

    func testTheTwoDefiniteStatesResolveFromTheBool() {
        XCTAssertEqual(KinetixTriState.resolve(isOn: true, indeterminate: false), .on)
        XCTAssertEqual(KinetixTriState.resolve(isOn: false, indeterminate: false), .off)
    }

    func testEachStateHasItsOwnAnnouncement() {
        XCTAssertEqual(KinetixTriState.off.accessibilityValue, "Unchecked")
        XCTAssertEqual(KinetixTriState.mixed.accessibilityValue, "Mixed")
        XCTAssertEqual(KinetixTriState.on.accessibilityValue, "Checked")

        // Three distinct strings. Before MX1d a mixed box and an unchecked box were announced
        // identically, which is the defect stated as an assertion.
        let announced = Set([KinetixTriState.off, .mixed, .on].map(\.accessibilityValue))
        XCTAssertEqual(announced.count, 3, "mixed must not be announced as either of the other two")
    }

    func testMixedIsNotSelected() {
        // `.isSelected` is a binary trait, so mixed must not take it: a reader hearing "selected"
        // for a partially-checked box has been told something false.
        XCTAssertFalse(KinetixTriState.mixed.isFullySelected)
        XCTAssertFalse(KinetixTriState.off.isFullySelected)
        XCTAssertTrue(KinetixTriState.on.isFullySelected)
    }
}
