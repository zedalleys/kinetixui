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
        print("M6811_READER epoch=\(Date().timeIntervalSince1970) initiallyEnabled=\(initiallyEnabled)")
        if !initiallyEnabled { try reader.enable() }
        XCTAssertTrue(reader.isEnabled)
        try block()
    }

    private func speech(_ step: String) throws -> String {
        let start = Date().timeIntervalSince1970
        do {
            let current = try reader.currentSpeech().utterance
            print("M65_READER \(step): \(current)")
            return current
        } catch {
            print("M6812_SPEECH_UNAVAILABLE phase=\(step) start=\(start) end=\(Date().timeIntervalSince1970) error=\(error)")
            throw error
        }
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

    func testRapidLTRReopenRestoresOpener() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true, rtl: false)
    }

    func testRapidRTLReopenRestoresFallback() throws {
        try verifyAudibleReturn(removeOpener: true, suppressRestore: false, reopen: true)
    }

    func testReducedMotionRestoresDefinedFallback() throws {
        try verifyAudibleReturn(removeOpener: true, suppressRestore: false, reduced: true)
    }

    func testMatrixA1ControlSuppressedRestore() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: false, fault: "--suppress-restore")
    }

    func testMatrixA2RestoredSuppressedRestore() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: false)
    }

    func testMatrixB1ControlDismissedTarget() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: false, fault: "--dismissed-target")
    }

    func testMatrixB2RestoredDismissedTarget() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: false)
    }

    func testMatrixC1ControlStaleCompletion() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true, fault: "--stale-completion")
    }

    func testMatrixC2RestoredStaleCompletion() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true)
    }

    func testMatrixD1ControlSuppressedFallback() throws {
        try verifyAudibleReturn(removeOpener: true, suppressRestore: false, reopen: false, fault: "--suppress-fallback")
    }

    func testMatrixD2RestoredSuppressedFallback() throws {
        try verifyAudibleReturn(removeOpener: true, suppressRestore: false, reopen: false)
    }

    func testMatrixE1ControlWrongSpokenLabel() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: false, fault: "--wrong-label")
    }

    func testMatrixE2RestoredWrongSpokenLabel() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: false)
    }

    func testMatrixFSettledReopenSameProcess() throws {
        try verifySameProcessClosures(interruptions: false)
    }

    func testMatrixGInterruptedReopenSameProcess() throws {
        try verifySameProcessClosures(interruptions: true)
    }

    func testMatrixHNextTurnReopen() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true, fault: "--reopen-next-turn")
    }

    private func verifySameProcessClosures(interruptions: Bool) throws {
        let app = XCUIApplication()
        app.launchArguments = ["--host-restores", "--rtl"] + (interruptions ? ["--reopen-twice"] : [])
        app.launch()
        try withReader {
            let heading = app.staticTexts["Library sheet heading"]
            let focus = app.staticTexts["focus-witness"]
            let receipt = app.staticTexts["restore-request-witness"]
            for cycle in 1...3 {
                if !interruptions || cycle == 1 {
                    try seek("Open library sheet")
                    activate(app, "sheet-opener")
                    XCTAssertTrue(heading.waitForExistence(timeout: 5))
                }
                try seek("Dismiss library sheet")
                let gestureStarted = ProcessInfo.processInfo.systemUptime
                activate(app, "sheet-dismiss")
                if interruptions && cycle < 3 {
                    let generation = app.staticTexts["presentation-witness"]
                    let reopened = XCTNSPredicateExpectation(
                        predicate: NSPredicate(format: "exists == true AND label == %@", "Presentation \(cycle + 1)"),
                        object: generation
                    )
                    XCTAssertEqual(XCTWaiter.wait(for: [reopened], timeout: 5), .completed)
                    XCTAssertTrue(heading.waitForExistence(timeout: 5))
                    XCTAssertEqual(receipt.label, "No request")
                    continue
                }
                XCTAssertTrue(heading.waitForNonExistence(timeout: 6))
                XCTAssertFalse(app.buttons["sheet-dismiss"].exists)
                let deadline = gestureStarted + 4
                var actual: String
                var utterance: String
                var completed: TimeInterval
                repeat {
                    utterance = try reader.currentSpeech().utterance
                    actual = focus.label
                    completed = ProcessInfo.processInfo.systemUptime
                    if actual == "sheet-opener" && utterance.contains("Open library sheet") { break }
                    if completed < deadline { Thread.sleep(forTimeInterval: 0.2) }
                } while completed < deadline
                print("M6810_STRESS interrupts=\(interruptions) cycle=\(cycle) actual=\(actual) speech=\(utterance) completedSinceGesture=\(completed - gestureStarted)")
                if actual == "sheet-opener" && utterance.contains("Open library sheet") {
                    XCTAssertLessThanOrEqual(completed, deadline, "Timeliness observer overrun during same-process closure")
                }
                XCTAssertEqual(actual, "sheet-opener")
                XCTAssertTrue(utterance.contains("Open library sheet"))
                XCTAssertEqual(receipt.label, "Request opener #\(interruptions ? 1 : cycle)")
            }
        }
    }

    func testLatencyAActiveRTL() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true)
    }

    func testLatencyBQuietRTL() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true, quiet: true)
    }

    func testLatencyC1DelayedAssignment() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, fault: "--delay-focus-assignment")
    }

    func testLatencyC2RestoredAssignment() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false)
    }

    func testLatencyD1StaleSpeechObserver() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, fault: "--stale-speech-observer")
    }

    func testLatencyD2RestoredSpeechObserver() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false)
    }

    func testLatencyEOpenerChangesOnClose() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, fault: "--remove-opener-on-close")
    }

    func testLatencyFKeepReaderAcrossLaunches() throws {
        try withReader {
            try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true, rtl: false)
            try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true)
        }
    }

    func testModeCalibrationForOwnedSimulator() throws {
        let initiallyEnabled = reader.isEnabled
        if initiallyEnabled { try reader.disable() }
        print("M6812_MODE initial=\(initiallyEnabled) normalized=\(reader.isEnabled)")
        XCTAssertFalse(reader.isEnabled)
    }

    func testLatencyIModalVoiceOverTraversal() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--host-restores"]
        app.launch()
        try withReader {
            try seek("Open library sheet")
            activate(app, "sheet-opener")
            XCTAssertTrue(app.staticTexts["Library sheet heading"].waitForExistence(timeout: 5))
            try seek("Dismiss library sheet")
            for _ in 0..<4 {
                let utterance = try reader.moveForward().utterance
                print("M6812_MODAL utterance=\(utterance)")
                for outside in ["Motion accessibility", "Open library sheet", "Read announcement timeline", "Upload progress"] {
                    XCTAssertFalse(utterance.contains(outside), "VoiceOver traversed background while Sheet was modal: \(utterance)")
                }
            }
            XCTAssertTrue(app.staticTexts["Library sheet heading"].exists)
        }
    }

    func testLatencyGNotificationOnlyRTL() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true, sampleUIKit: false)
    }

    func testLatencyH1CorrectSampleDeliveredLate() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, fault: "--hold-matching-observation")
    }

    func testLatencyH2CorrectSampleDeliveredOnTime() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false)
    }

    func testLatencyJReenableReaderWhileRTLReopened() throws {
        try verifyAudibleReturn(removeOpener: false, suppressRestore: false, reopen: true, reenableReaderOnReopen: true)
    }

    func testLatencyKReenableReaderWhileRTLReopenedWithFallback() throws {
        try verifyAudibleReturn(removeOpener: true, suppressRestore: false, reopen: true, reenableReaderOnReopen: true)
    }

    private func verifyAudibleReturn(
        removeOpener: Bool, suppressRestore: Bool, reopen: Bool = false, rtl: Bool = true, reduced: Bool = false, fault: String? = nil, quiet: Bool = false, sampleUIKit: Bool = true, reenableReaderOnReopen: Bool = false
    ) throws {
        let app = XCUIApplication()
        app.launchArguments = ["--host-restores"] +
            (sampleUIKit ? ["--sample-focus"] : []) +
            (removeOpener ? ["--remove-opener"] : []) +
            (suppressRestore ? ["--suppress-restore"] : []) +
            (reopen ? ["--reopen-once"] : []) +
            (reopen && rtl ? ["--rtl"] : []) +
            (reduced ? ["--reduce"] : [])
        if let fault = fault ?? ProcessInfo.processInfo.environment["M6810_CONTROL"], !fault.isEmpty {
            app.launchArguments.append(fault)
        }
        app.launch()
        try withReader {
            XCTAssertEqual(app.staticTexts["reduce-state"].label, reduced ? "Reduce Motion on" : "Reduce Motion off")
            try seek("Open library sheet")
            activate(app, "sheet-opener")
            XCTAssertTrue(app.staticTexts["Library sheet heading"].waitForExistence(timeout: 5))
            if removeOpener {
                try seek("Remove opening control")
                activate(app, "Remove opening control")
                XCTAssertFalse(app.buttons["sheet-opener"].exists)
            }
            if reopen {
                try seek("Dismiss library sheet")
                activate(app, "sheet-dismiss")
                Thread.sleep(forTimeInterval: 0.8)
                XCTAssertTrue(app.staticTexts["Library sheet heading"].exists)
                XCTAssertEqual(app.staticTexts["restore-request-witness"].label, "No request")
                let spokenInside = try reader.currentSpeech().utterance
                XCTAssertTrue(spokenInside.localizedCaseInsensitiveContains("library sheet")
                              && !spokenInside.contains("Open library sheet"), spokenInside)
                if reenableReaderOnReopen {
                    print("M6813_READER phase=before-disable epoch=\(Date().timeIntervalSince1970) enabled=\(reader.isEnabled)")
                    try reader.disable()
                    XCTAssertFalse(reader.isEnabled)
                    XCTAssertTrue(app.staticTexts["Library sheet heading"].exists)
                    print("M6813_READER phase=before-enable epoch=\(Date().timeIntervalSince1970) enabled=\(reader.isEnabled)")
                    try reader.enable()
                    XCTAssertTrue(reader.isEnabled)
                    XCTAssertTrue(app.staticTexts["Library sheet heading"].exists)
                    XCTAssertEqual(app.staticTexts["restore-request-witness"].label, "No request")
                    print("M6813_READER phase=after-enable epoch=\(Date().timeIntervalSince1970) enabled=\(reader.isEnabled)")
                }
            }
            let dismissedControl = try seek("Dismiss library sheet")
            XCTAssertTrue(dismissedControl.contains("Dismiss library sheet"))
            let gestureStarted = ProcessInfo.processInfo.systemUptime
            print("M6812_GESTURE epoch=\(Date().timeIntervalSince1970) uptime=\(gestureStarted) sampleUIKit=\(sampleUIKit)")
            activate(app, "sheet-dismiss")
            print("M6811_RUNNER epoch=\(Date().timeIntervalSince1970) final-tap-return quiet=\(quiet)")
            if quiet {
                // Controlled comparison: hold XCTest accessibility queries while the app samples UIKit.
                Thread.sleep(forTimeInterval: 4)
            }
            XCTAssertTrue(app.staticTexts["Library sheet heading"].waitForNonExistence(timeout: 6))
            let dismissedExists = app.buttons["sheet-dismiss"].exists
            print("M6812_TREE epoch=\(Date().timeIntervalSince1970) dismissedExists=\(dismissedExists)")
            XCTAssertFalse(dismissedExists)
            let expectsFallback = removeOpener || fault == "--remove-opener-on-close"
            let label = expectsFallback ? "Back to library" : "Open library sheet"
            let id = expectsFallback ? "sheet-fallback" : "sheet-opener"
            let witness = app.staticTexts["focus-witness"]
            // Active acceptance measures the complete round trip from the final dismissal gesture.
            // The quiet experiment deliberately defers XCTest and reports correctness only.
            let deadline = gestureStarted + 4

            @MainActor func observe(_ phase: String) throws -> (focus: String, utterance: String, completed: TimeInterval) {
                let start = Date().timeIntervalSince1970
                let utterance: String
                do { utterance = try reader.currentSpeech().utterance }
                catch {
                    print("M6811_OBSERVER phase=\(phase) start=\(start) end=\(Date().timeIntervalSince1970) error=\(error)")
                    throw error
                }
                let speechEnd = Date().timeIntervalSince1970
                let focus = witness.label
                let focusReadEnd = Date().timeIntervalSince1970
                let captured = ProcessInfo.processInfo.systemUptime
                print("M6811_OBSERVER phase=\(phase) speechStart=\(start) speechEnd=\(speechEnd) focusReadEnd=\(focusReadEnd) serviceEnabled=\(reader.isEnabled) expected=\(id) focus=\(focus) utterance=\(utterance)")
                if phase == "acceptance", fault == "--hold-matching-observation",
                   focus == id, utterance.contains(label), captured < deadline {
                    print("M6812_INJECT captured=\(captured - gestureStarted) budget=4")
                    Thread.sleep(forTimeInterval: max(0, deadline - ProcessInfo.processInfo.systemUptime) + 0.1)
                }
                return (focus, utterance, ProcessInfo.processInfo.systemUptime)
            }

            var sample = try observe("acceptance")
            while !quiet, (sample.focus != id || !sample.utterance.contains(label)),
                  ProcessInfo.processInfo.systemUptime < deadline {
                Thread.sleep(forTimeInterval: 0.2)
                sample = try observe("acceptance")
            }
            let receipt = app.staticTexts["restore-request-witness"].label
            let targetExists = app.buttons[id].exists
            let observedSpeech = fault == "--stale-speech-observer" ? "Dismiss library sheet" : sample.utterance
            print("M6811_FINAL epoch=\(Date().timeIntervalSince1970) expected=\(id) focus=\(sample.focus) speech=\(observedSpeech) serviceSpeech=\(sample.utterance) receipt=\(receipt) targetExists=\(targetExists) dismissedExists=\(dismissedExists)")
            if fault == "--delay-focus-assignment" || (fault == nil && sample.focus != id) {
                // Freeze the acceptance sample. Tail observations can explain failure without extending the gate.
                Thread.sleep(forTimeInterval: 3)
                _ = try observe("diagnostic-tail")
            }

            let matching = sample.focus == id && observedSpeech.contains(label)
            let timely = sample.completed <= deadline
            print("M6812_TIMELINESS quiet=\(quiet) matching=\(matching) timely=\(timely) completedSinceGesture=\(sample.completed - gestureStarted) budget=4")
            if !quiet && matching {
                XCTAssertTrue(timely, "Timeliness observer overrun: matching focus and speech were delivered after the four-second window")
            }
            XCTAssertEqual(receipt, "Request \(expectsFallback ? "fallback" : "opener") #1")
            XCTAssertTrue(targetExists, "The expected restore control must still be mounted")
            XCTAssertEqual(sample.focus, id, "VoiceOver focus must leave the dismissed presentation")
            XCTAssertTrue(observedSpeech.contains(label), "Exact target must be spoken without a navigation move: \(observedSpeech)")
        }
    }

}
