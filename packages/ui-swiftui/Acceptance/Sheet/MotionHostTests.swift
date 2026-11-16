import XCTest

@available(iOS 27, *)
@MainActor
final class MotionHostTests: XCTestCase {
    private var reader: XCUIVoiceOverService { XCUIDevice.shared.voiceOverService }

    private func withReader(_ block: () throws -> Void) throws {
        let initiallyEnabled = reader.isEnabled
        defer {
            if !initiallyEnabled && reader.isEnabled {
                do { try reader.disable() }
                catch { XCTFail("Could not restore VoiceOver: \(error)") }
            }
        }
        if !initiallyEnabled { try reader.enable() }
        XCTAssertTrue(reader.isEnabled)
        try block()
    }

    private func speech(_ step: String) throws -> String {
        let current = try reader.currentSpeech().utterance
        print("M65_READER \(step): \(current)")
        return current
    }

    @discardableResult
    private func seek(_ name: String, moves: Int = 12) throws -> String {
        var line = try speech("search")
        for _ in 0..<moves where !line.localizedCaseInsensitiveContains(name) {
            line = try reader.moveForward().utterance
            print("M65_READER forward: \(line)")
        }
        XCTAssertTrue(line.localizedCaseInsensitiveContains(name), "could not navigate to \(name): \(line)")
        return line
    }

    private func activate(_ app: XCUIApplication, _ button: String) {
        app.buttons[button].doubleTap()
    }

    func testAudibleOpenerWithDismissalCallback() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false)
    }

    func testAudibleFallbackWithDismissalCallback() throws {
        try verifyAudibleReturn(removeOpener: true, suppressRestore: false)
    }

    func testRapidReopenDoesNotRestoreUntilFinalDismissal() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true)
    }

    func testReducedMotionRestoresDefinedFallback() throws {
        try verifyAudibleReturn(removeOpener: true, suppressRestore: false, reduced: true)
    }

    private func verifyAudibleReturn(
        removeOpener: Bool, suppressRestore: Bool, reopen: Bool = false, reduced: Bool = false
    ) throws {
        let app = XCUIApplication()
        app.launchArguments = ["--host-restores"] +
            (removeOpener ? ["--remove-opener"] : []) +
            (suppressRestore ? ["--suppress-restore"] : []) +
            (reopen ? ["--reopen-once", "--rtl"] : []) +
            (reduced ? ["--reduce"] : [])
        app.launch()
        try withReader {
            XCTAssertEqual(app.staticTexts["reduce-state"].label, reduced ? "Reduce Motion on" : "Reduce Motion off")
            try seek("Open library sheet")
            activate(app, "Open library sheet")
            XCTAssertTrue(app.staticTexts["Library sheet heading"].waitForExistence(timeout: 5))
            if removeOpener {
                try seek("Remove opening control")
                activate(app, "Remove opening control")
                XCTAssertFalse(app.buttons["Open library sheet"].exists)
            }
            if reopen {
                try seek("Dismiss library sheet")
                activate(app, "Dismiss library sheet")
                Thread.sleep(forTimeInterval: 0.8)
                XCTAssertTrue(app.staticTexts["Library sheet heading"].exists)
                XCTAssertEqual(app.staticTexts["restore-request-witness"].label, "No request")
                let spokenInside = try reader.currentSpeech().utterance
                XCTAssertTrue(spokenInside.localizedCaseInsensitiveContains("library sheet")
                              && !spokenInside.contains("Open library sheet"), spokenInside)
            }
            let dismissedControl = try seek("Dismiss library sheet")
            XCTAssertTrue(dismissedControl.contains("Dismiss library sheet"))
            activate(app, "Dismiss library sheet")
            XCTAssertTrue(app.staticTexts["Library sheet heading"].waitForNonExistence(timeout: 6))
            XCTAssertFalse(app.buttons["Dismiss library sheet"].exists)
            let label = removeOpener ? "Back to library" : "Open library sheet"
            let deadline = Date().addingTimeInterval(4)
            var last = try reader.currentSpeech().utterance
            while !last.contains(label), Date() < deadline {
                Thread.sleep(forTimeInterval: 0.2)
                last = try reader.currentSpeech().utterance
            }
            print("M682_CALLBACK control=\(label) suppress=\(suppressRestore) actual=\(last)")
            let receipt = app.staticTexts["restore-request-witness"].label
            print("M682_CALLBACK receipt \(receipt)")
            XCTAssertEqual(receipt, "Request \(removeOpener ? "fallback" : "opener") #1")
            XCTAssertTrue(last.contains(label), "Exact target must be spoken without a navigation move: \(last)")
        }
    }

}
