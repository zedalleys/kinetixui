import XCTest

/// Nonisolated so the trial record can read them without crossing an actor boundary.
private enum Acceptance {
    /// The acceptance budget. Fixed by owner decision 2026-11-22 and never widened here:
    /// correct focus arriving after it is not acceptance.
    static let budget: TimeInterval = 4
    /// Polling continues past the budget by this much so a breach is reported *with* its arrival
    /// time rather than only as "never arrived". The tail never relaxes an assertion.
    static let diagnosticTail: TimeInterval = 3
}

@available(iOS 27, *)
@MainActor
final class MotionHostTests: XCTestCase {

    private var reader: XCUIVoiceOverService { XCUIDevice.shared.voiceOverService }

    /// One trial's measurements. Every figure is seconds from the same origin: the instant the
    /// dismissal gesture was synthesised. `systemUptime` is seconds since boot, so the host app
    /// and this runner read one clock and no cross-process correction is needed.
    private struct Trial {
        let index: Int
        let teardown: TimeInterval
        let appAssigned: TimeInterval?
        let speechMatched: TimeInterval?
        let focusMatched: TimeInterval?
        let receipt: String
        let targetMounted: Bool
        let lastUtterance: String
        let lastBackgroundFocus: String
        let lastReaderFocus: String

        var line: String {
            func f(_ v: TimeInterval?) -> String { v.map { String(format: "%.3f", $0) } ?? "never" }
            return "trial=\(index) teardown=\(String(format: "%.3f", teardown)) "
                + "appAssigned=\(f(appAssigned)) speechMatched=\(f(speechMatched)) "
                + "focusMatched=\(f(focusMatched)) budget=\(String(format: "%.1f", Acceptance.budget)) "
                + "receipt=\(receipt) targetMounted=\(targetMounted) "
                + "readerFocus=\(lastReaderFocus) backgroundFocus=\(lastBackgroundFocus) "
                + "utterance=\(lastUtterance)"
        }
    }

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

    // MARK: - The four cases #637 already claims, names unchanged

    func testAudibleOpenerWithDismissalCallback() throws {
        try verifyAudibleReturn(removeOpener: false)
    }

    func testAudibleFallbackWithDismissalCallback() throws {
        try verifyAudibleReturn(removeOpener: true)
    }

    func testRapidReopenDoesNotRestoreUntilFinalDismissal() throws {
        try verifyAudibleReturn(removeOpener: false, reopen: true)
    }

    func testReducedMotionRestoresDefinedFallback() throws {
        try verifyAudibleReturn(removeOpener: true, reduced: true)
    }

    // MARK: - Repeated trials

    /// The defect is load-dependent, so one trial decides nothing about consistency. These report
    /// every trial and fail if ANY trial breaches the budget — an average would hide a breach.
    func testRepeatedOpenerRestorationStaysWithinBudget() throws {
        try verifyAudibleReturn(removeOpener: false, trials: 5)
    }

    func testRepeatedFallbackRestorationStaysWithinBudget() throws {
        try verifyAudibleReturn(removeOpener: true, trials: 5)
    }

    // MARK: - Committed negative controls

    /// Control A — the request is recorded but the assignment is never made, so restoration cannot
    /// happen. Proves the restoration assertions are live. Expected to FAIL; that failure is the
    /// evidence. Run it with `-only-testing` and read the reason, never the exit code.
    func testControlSuppressedRestorationFailsAcceptance() throws {
        try verifyAudibleReturn(removeOpener: false, control: "--suppress-restore")
    }

    /// Control B — focus is assigned promptly to a control that IS mounted but is the WRONG one.
    /// Timeliness is satisfied while identity is not, which is what proves the two assertions are
    /// independent rather than one assertion wearing two messages. Expected to FAIL.
    func testControlWrongTargetFailsIdentityNotTimeliness() throws {
        try verifyAudibleReturn(removeOpener: false, control: "--restore-to-timeline")
    }

    // MARK: - Measurement

    private func verifyAudibleReturn(
        removeOpener: Bool,
        reopen: Bool = false,
        reduced: Bool = false,
        trials: Int = 1,
        control: String? = nil
    ) throws {
        let target = removeOpener ? "fallback" : "opener"
        let label = removeOpener ? "Back to library" : "Open library sheet"
        let button = removeOpener ? "Back to library" : "Open library sheet"
        var results: [Trial] = []

        try withReader {
            for index in 1...trials {
                let app = XCUIApplication()
                app.launchArguments = ["--host-restores"] +
                    (removeOpener ? ["--remove-opener"] : []) +
                    (reopen ? ["--reopen-once", "--rtl"] : []) +
                    (reduced ? ["--reduce"] : []) +
                    (control.map { [$0] } ?? [])
                app.launch()

                XCTAssertEqual(
                    app.staticTexts["reduce-state"].label,
                    reduced ? "Reduce Motion on" : "Reduce Motion off"
                )
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
                    XCTAssertTrue(
                        spokenInside.localizedCaseInsensitiveContains("library sheet")
                            && !spokenInside.contains("Open library sheet"),
                        spokenInside
                    )
                }

                let dismissedControl = try seek("Dismiss library sheet")
                XCTAssertTrue(dismissedControl.contains("Dismiss library sheet"))

                // THE origin. Everything below is measured from here, and nothing re-bases it.
                // #637 took its window after teardown instead, so its four seconds began at a
                // point that moved with however long dismissal took.
                let origin = ProcessInfo.processInfo.systemUptime
                activate(app, "Dismiss library sheet")

                XCTAssertTrue(app.staticTexts["Library sheet heading"].waitForNonExistence(timeout: 6))
                let teardown = ProcessInfo.processInfo.systemUptime - origin
                XCTAssertFalse(app.buttons["Dismiss library sheet"].exists)

                // Speech and focus are sampled as two independent observations, each stamped
                // immediately after its own read. Reading them as one sample charges the second
                // read's cost to the first and cannot say which of the two was late.
                var speechMatched: TimeInterval?
                var focusMatched: TimeInterval?
                var lastUtterance = ""
                var lastBackground = ""
                var lastReader = ""
                let tailEnd = origin + Acceptance.budget + Acceptance.diagnosticTail

                repeat {
                    let utterance = try reader.currentSpeech().utterance
                    let afterSpeech = ProcessInfo.processInfo.systemUptime
                    lastUtterance = utterance
                    if speechMatched == nil, utterance.contains(label) {
                        speechMatched = afterSpeech - origin
                    }

                    let background = app.staticTexts["background-focus-witness"].label
                    let afterFocus = ProcessInfo.processInfo.systemUptime
                    lastBackground = background
                    if focusMatched == nil, background == target {
                        focusMatched = afterFocus - origin
                    }
                    lastReader = app.staticTexts["reader-focus-witness"].label

                    if speechMatched != nil, focusMatched != nil { break }
                    Thread.sleep(forTimeInterval: 0.1)
                } while ProcessInfo.processInfo.systemUptime < tailEnd

                let assignment = Double(app.staticTexts["assignment-uptime-witness"].label)
                let trial = Trial(
                    index: index,
                    teardown: teardown,
                    appAssigned: assignment.map { $0 - origin },
                    speechMatched: speechMatched,
                    focusMatched: focusMatched,
                    receipt: app.staticTexts["restore-request-witness"].label,
                    targetMounted: app.buttons[button].exists,
                    lastUtterance: lastUtterance,
                    lastBackgroundFocus: lastBackground,
                    lastReaderFocus: lastReader
                )
                results.append(trial)
                print("M536_TRIAL target=\(target) control=\(control ?? "none") \(trial.line)")
                app.terminate()
            }
        }

        // Every trial is asserted. Correctness and timeliness are separate assertions with
        // separate messages, so a late-but-correct arrival is never reported as a wrong target.
        for trial in results {
            let where_ = "target=\(target)"

            XCTAssertEqual(trial.receipt, "Request \(target) #1", "restoration was not requested once: \(where_)")
            XCTAssertTrue(trial.targetMounted, "the restore target was not mounted: \(where_)")

            // Speech is the asserted acceptance signal: it is what a VoiceOver user actually
            // receives, and it is the signal #637 already asserted.
            XCTAssertNotNil(
                trial.speechMatched,
                "IDENTITY (speech): the exact target was never spoken: \(where_) \(trial.line)"
            )
            if let spoken = trial.speechMatched {
                XCTAssertLessThanOrEqual(
                    spoken, Acceptance.budget,
                    "TIMELINESS (speech): the exact target was spoken late: \(where_) \(trial.line)"
                )
            }

            // Focus is MEASURED and REPORTED, and deliberately NOT asserted.
            //
            // This started as an assertion and was removed on evidence. Read back through
            // `@AccessibilityFocusState`, focus reported `never` in EVERY trial — including
            // trials whose speech arrived in 1.6 s and passed. An assertion that fails
            // identically in a passing and a failing case carries no information about the
            // thing it names, so leaving it in would have made all four of #637's cases
            // permanently red for a reason unrelated to the defect.
            //
            // The cause is the binding, not the focus: the host can observe its own write
            // (`appAssigned`, stable at ~0.77 s) but the system does not leave a
            // service-confirmed value in it to read. Observing service-confirmed focus needs
            // in-app `UIAccessibility.focusedElement(using: .notificationVoiceOver)` sampling,
            // which this host does not carry. That port is the follow-up, not this repair.
            if trial.focusMatched == nil {
                print("M536_FOCUS_NOT_OBSERVABLE \(where_) "
                    + "binding=\(trial.lastBackgroundFocus) reader=\(trial.lastReaderFocus) "
                    + "appAssigned=\(trial.appAssigned.map { String(format: "%.3f", $0) } ?? "never")")
            }
        }
    }
}
