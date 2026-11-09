//
// SemanticsTests.swift — what VoiceOver is told about the core SwiftUI controls.
//
// The SwiftUI twin of `packages/ui-flutter/test/semantics_test.dart` and
// `packages/ui-compose/.../SemanticsTest.kt`, over the same five controls, so the three native
// platforms can be compared on the same subjects rather than on whatever each happened to test.
//
// Flutter asserts two layers: the `Semantics` a widget declares, and the merged node a platform
// service sees. SwiftUI offers no way to read a declared modifier back, so only the second layer
// exists here — see the header of `AccessibilityTree.swift`. That is the stronger of the two: these
// assertions are about what AppKit built, not about the modifier we wrote.
//
// What this does NOT prove: VoiceOver's spoken output, iOS's accessibility tree (this runs on
// macOS, which is where `swift test` has no simulator), or anything on a real device. It proves
// that the rendered hierarchy carries the role, value and state the sources declare.
//
// kx-verify: accessibility, interaction
//

#if canImport(AppKit)
import AppKit
import SwiftUI
import XCTest
import KinetixUI

/// A mutable `Binding` backed by a box, so a test can press a control and read the result.
/// `Binding.constant` cannot show that a press did anything.
private final class Box<Value> {
    var value: Value
    init(_ value: Value) { self.value = value }
    var binding: Binding<Value> { Binding(get: { self.value }, set: { self.value = $0 }) }
}

final class SemanticsTests: XCTestCase {

    // MARK: KinetixButton

    func testButtonIsAnnouncedAsAnEnabledButtonCarryingItsLabel() {
        let nodes = AccessibilityTree.elements(of: KinetixButton(action: {}) { Text("Save") })
        guard let button = AccessibilityTree.one(in: nodes, "button") { $0.role == .button } else { return }

        XCTAssertEqual(button.label, "Save", "the button's accessible name is its label text")
        XCTAssertTrue(button.enabled)
    }

    func testButtonIsAnnouncedAsDisabled() {
        let nodes = AccessibilityTree.elements(
            of: KinetixButton(action: {}) { Text("Save") }.disabled(true)
        )
        guard let button = AccessibilityTree.one(in: nodes, "button") { $0.role == .button } else { return }

        XCTAssertFalse(button.enabled, "a disabled button must not be offered as actionable")
    }

    // MARK: KinetixCheckbox
    //
    // The three states are the MX1d defect stated against the rendered tree. `SelectionSemanticsTests`
    // asserts the resolver that produces these strings; this asserts that the strings arrive.

    func testCheckboxAnnouncesCheckedAndUnchecked() {
        for (isOn, expected) in [(true, "Checked"), (false, "Unchecked")] {
            let nodes = AccessibilityTree.elements(of: KinetixCheckbox(isOn: .constant(isOn)))
            guard let box = AccessibilityTree.one(in: nodes, "checkbox") { $0.value != nil } else { return }

            XCTAssertEqual(box.value, expected)
            XCTAssertEqual(box.selected, isOn, "the selected trait follows the fully-checked state")
        }
    }

    func testCheckboxAnnouncesMixedAndIsNotSelected() {
        let nodes = AccessibilityTree.elements(
            of: KinetixCheckbox(isOn: .constant(false), indeterminate: true)
        )
        guard let box = AccessibilityTree.one(in: nodes, "checkbox") { $0.value != nil } else { return }

        XCTAssertEqual(box.value, "Mixed", "mixed must reach the reader, not be silent")
        XCTAssertFalse(box.selected, "a partially-checked box must not be announced as selected")
    }

    func testCheckboxMixedWinsOverTheUnderlyingValue() {
        // `isOn: true` with `indeterminate: true` is mixed, and the rendered tree must agree with the
        // glyph rather than with the bool.
        let nodes = AccessibilityTree.elements(
            of: KinetixCheckbox(isOn: .constant(true), indeterminate: true)
        )
        guard let box = AccessibilityTree.one(in: nodes, "checkbox") { $0.value != nil } else { return }

        XCTAssertEqual(box.value, "Mixed")
        XCTAssertFalse(box.selected)
    }

    // MARK: KinetixSwitch

    func testSwitchAnnouncesOnAndOff() {
        for (isOn, expected) in [(true, "On"), (false, "Off")] {
            let nodes = AccessibilityTree.elements(of: KinetixSwitch(isOn: .constant(isOn)))
            guard let toggle = AccessibilityTree.one(in: nodes, "switch") { $0.value != nil } else { return }

            XCTAssertEqual(toggle.value, expected)
        }
    }

    // MARK: KinetixToggle

    func testTogglePressedStateIsAnnouncedAsSelected() {
        for isOn in [true, false] {
            let nodes = AccessibilityTree.elements(
                of: KinetixToggle(isOn: .constant(isOn)) { Text("B") }
            )
            guard let toggle = AccessibilityTree.one(in: nodes, "toggle") { $0.role == .button } else { return }

            XCTAssertEqual(toggle.selected, isOn)
            XCTAssertEqual(toggle.label, "B")
        }
    }

    // MARK: KinetixTabsTrigger

    func testTabsTriggerAnnouncesWhichTabIsSelected() {
        for isSelected in [true, false] {
            let nodes = AccessibilityTree.elements(
                of: KinetixTabsTrigger("One", isSelected: isSelected, action: {})
            )
            guard let tab = AccessibilityTree.one(in: nodes, "tab") { $0.role == .button } else { return }

            XCTAssertEqual(tab.selected, isSelected)
            XCTAssertEqual(tab.label, "One")
        }
    }

    // MARK: pressing through the accessibility layer
    //
    // `accessibilityPerformPress()` is the action an assistive technology invokes, not a synthetic tap.
    // This is the whole of the `interaction` claim: the control is driven and the result is asserted.

    func testPressingTheCheckboxThroughAccessibilityTogglesIt() {
        let box = Box(false)
        let nodes = AccessibilityTree.elements(of: KinetixCheckbox(isOn: box.binding))
        guard let element = AccessibilityTree.one(in: nodes, "checkbox") { $0.value != nil } else { return }

        XCTAssertTrue(element.element.accessibilityPerformPress(), "the checkbox must offer a press action")
        XCTAssertTrue(box.value, "pressing an unchecked box checks it")
    }

    func testPressingTheSwitchThroughAccessibilityTogglesIt() {
        let box = Box(false)
        let nodes = AccessibilityTree.elements(of: KinetixSwitch(isOn: box.binding))
        guard let element = AccessibilityTree.one(in: nodes, "switch") { $0.value != nil } else { return }

        XCTAssertTrue(element.element.accessibilityPerformPress(), "the switch must offer a press action")
        XCTAssertTrue(box.value)
    }

    func testPressingADisabledButtonDoesNothing() {
        var pressed = false
        let nodes = AccessibilityTree.elements(
            of: KinetixButton(action: { pressed = true }) { Text("Save") }.disabled(true)
        )
        guard let element = AccessibilityTree.one(in: nodes, "button") { $0.role == .button } else { return }

        _ = element.element.accessibilityPerformPress()
        XCTAssertFalse(pressed, "a disabled button must not run its action when pressed")
    }
}
#endif
