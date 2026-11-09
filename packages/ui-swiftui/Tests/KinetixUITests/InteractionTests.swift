//
// InteractionTests.swift — driving the SwiftUI controls the way an assistive technology does.
//
// The SwiftUI twin of `packages/ui-flutter/test/interaction_test.dart` and
// `packages/ui-compose/.../InteractionTest.kt`, and the sibling of `SemanticsTests.swift`: that file
// asserts what a control *says*, this one asserts what it *does* when the accessibility layer acts on
// it. They are separate files because they are separate claims, and a `kx-verify` marker credits every
// component its file mentions — so a single file claiming both would credit a control that is only
// read, never pressed.
//
// `accessibilityPerformPress()` is the action VoiceOver's "press" invokes. It is not a synthetic tap:
// nothing here moves a mouse or posts an event, so this proves the control exposes a working press
// action to assistive technology, which is the thing a keyboard- or VoiceOver-only reader depends on.
//
// Every control that this file credits is both pressed and checked for its result. Two of them assert
// in the negative as well — a disabled button must not run, a tab must not be pressable into a
// contradiction — but no component rests on a negative assertion alone, because "nothing happened"
// is equally true of a control that was never wired up.
//
// What this does NOT prove: a real gesture, a real device, iOS, or VoiceOver's own behaviour.
//
// kx-verify: interaction
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

final class InteractionTests: XCTestCase {

    // MARK: KinetixButton

    func testPressingAnEnabledButtonRunsItsAction() {
        var pressed = false
        let nodes = AccessibilityTree.elements(of: KinetixButton(action: { pressed = true }) { Text("Save") })
        guard let element = AccessibilityTree.one(in: nodes, "button", where: { $0.role == .button }) else { return }

        XCTAssertTrue(element.element.accessibilityPerformPress(), "the button must offer a press action")
        XCTAssertTrue(pressed, "pressing an enabled button runs its action")
    }

    func testPressingADisabledButtonDoesNothing() {
        var pressed = false
        let nodes = AccessibilityTree.elements(
            of: KinetixButton(action: { pressed = true }) { Text("Save") }.disabled(true)
        )
        guard let element = AccessibilityTree.one(in: nodes, "button", where: { $0.role == .button }) else { return }

        _ = element.element.accessibilityPerformPress()
        XCTAssertFalse(pressed, "a disabled button must not run its action when pressed")
    }

    // MARK: KinetixCheckbox

    func testPressingTheCheckboxTogglesItInBothDirections() {
        for start in [false, true] {
            let box = Box(start)
            let nodes = AccessibilityTree.elements(of: KinetixCheckbox(isOn: box.binding))
            guard let element = AccessibilityTree.one(in: nodes, "checkbox", where: { $0.value != nil }) else { return }

            XCTAssertTrue(element.element.accessibilityPerformPress(), "the checkbox must offer a press action")
            XCTAssertEqual(box.value, !start, "pressing a checkbox inverts it, from either state")
        }
    }

    // MARK: KinetixSwitch

    func testPressingTheSwitchTogglesItInBothDirections() {
        for start in [false, true] {
            let box = Box(start)
            let nodes = AccessibilityTree.elements(of: KinetixSwitch(isOn: box.binding))
            guard let element = AccessibilityTree.one(in: nodes, "switch", where: { $0.value != nil }) else { return }

            XCTAssertTrue(element.element.accessibilityPerformPress(), "the switch must offer a press action")
            XCTAssertEqual(box.value, !start, "pressing a switch inverts it, from either state")
        }
    }

    // MARK: KinetixToggle

    func testPressingTheToggleTogglesItInBothDirections() {
        for start in [false, true] {
            let box = Box(start)
            let nodes = AccessibilityTree.elements(
                of: KinetixToggle(isOn: box.binding) { Text("B") }
            )
            guard let element = AccessibilityTree.one(in: nodes, "toggle", where: { $0.role == .button }) else { return }

            XCTAssertTrue(element.element.accessibilityPerformPress(), "the toggle must offer a press action")
            XCTAssertEqual(box.value, !start, "pressing a toggle inverts its pressed state, from either state")
        }
    }

    // MARK: KinetixTabsTrigger

    func testPressingATabTriggerRunsItsAction() {
        // A tab trigger reports selection but does not own it, so the proof of a working press is that
        // the owner is told. An already-selected trigger must still be pressable: a reader who presses
        // the current tab is not a reader who pressed nothing.
        for isSelected in [false, true] {
            var selected: String?
            let nodes = AccessibilityTree.elements(
                of: KinetixTabsTrigger("One", isSelected: isSelected, action: { selected = "One" })
            )
            guard let element = AccessibilityTree.one(in: nodes, "tab", where: { $0.role == .button }) else { return }

            XCTAssertTrue(element.element.accessibilityPerformPress(), "the tab trigger must offer a press action")
            XCTAssertEqual(selected, "One", "pressing a tab trigger reports the tab it stands for")
        }
    }
}
#endif
