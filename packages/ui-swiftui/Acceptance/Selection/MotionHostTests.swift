import XCTest

@available(iOS 27, *)
@MainActor
final class MotionHostTests: XCTestCase {
    func testVoiceOverSelectionForTabsAndSegments() throws {
        let app = XCUIApplication()
        app.launch()
        let reader = XCUIDevice.shared.voiceOverService
        let initiallyEnabled = reader.isEnabled
        defer {
            if !initiallyEnabled && reader.isEnabled {
                do { try reader.disable() } catch { XCTFail("Could not restore VoiceOver: \(error)") }
            }
        }
        if !initiallyEnabled { try reader.enable() }
        XCTAssertTrue(reader.isEnabled)
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 5))
        app.activate()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 5))

        let index = app.staticTexts["selected-index"]
        XCTAssertTrue(index.waitForExistence(timeout: 5))
        XCTAssertEqual(index.label, "Selected: 0")
        try assertSpeech(reader, name: "First tab", includes: "selected")
        try assertSpeech(reader, name: "Middle tab", includes: "dimmed")
        try assertSpeech(reader, name: "Last tab")
        app.buttons["Last tab"].doubleTap()
        waitForIndex(index, 2)
        try assertSpeech(reader, name: "Last tab", includes: "selected")
        try assertSpeech(reader, name: "Middle segment", includes: "dimmed")
        try assertSpeech(reader, name: "Last segment", includes: "selected")
        try assertSpeech(reader, name: "First segment")
        app.buttons["First segment"].doubleTap()
        waitForIndex(index, 0)
        try assertSpeech(reader, name: "First segment", includes: "selected")
    }

    private func waitForIndex(_ index: XCUIElement, _ number: Int) {
        let selected = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label == %@", "Selected: \(number)"),
            object: index
        )
        XCTAssertEqual(XCTWaiter.wait(for: [selected], timeout: 5), .completed)
    }

    private func assertSpeech(_ reader: XCUIVoiceOverService, name: String, includes trait: String? = nil) throws {
        func matches(_ speech: String) -> Bool {
            guard speech.localizedCaseInsensitiveContains(name) else { return false }
            guard let trait else { return true }
            return speech.localizedCaseInsensitiveContains(trait)
                && !speech.localizedCaseInsensitiveContains("unselected")
        }

        var speech = try reader.currentSpeech().utterance
        for _ in 0..<18 where !matches(speech) {
            speech = try reader.moveForward().utterance
        }
        for _ in 0..<18 where !matches(speech) {
            speech = try reader.moveBackward().utterance
        }
        print("M682_SELECTION_VOICEOVER \(name): \(speech)")
        XCTAssertTrue(matches(speech), "Expected \(name) with \(trait ?? "no required trait"); heard \(speech)")
    }
}
