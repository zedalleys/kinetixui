import KinetixUI
import SwiftUI
import UIKit
import OSLog

@main
struct VoiceOverLab: App {
    var body: some Scene {
        WindowGroup {
            VoiceOverHost().environment(
                \._accessibilityReduceMotion,
                ProcessInfo.processInfo.arguments.contains("--reduce")
            )
        }
    }
}

struct VoiceOverHost: View {
    private enum ReaderFocus: String, Hashable {
        case timeline, opener, heading, dismiss, fallback
    }

    @AccessibilityFocusState(for: .voiceOver) private var readerFocus: ReaderFocus?
    @AccessibilityFocusState(for: .voiceOver) private var backgroundFocus: ReaderFocus?
    @Environment(\.accessibilityReduceMotion) private var reducedMotion
    @State private var selected = "North"
    @State private var toast: KinetixToast?
    @State private var progress = 37.0
    @State private var showSheet = false
    @State private var generation = 0
    @State private var openerLabel = "Open library sheet"
    @State private var closeCount = 0
    @State private var restorationReceipt = "No request"
    @State private var restorationCount = 0
    @State private var openerMounted = true
    @State private var receipts: [String] = []
    @State private var observedVoiceOverTarget = "No VoiceOver focus"

    private var arguments: [String] { ProcessInfo.processInfo.arguments }

    var body: some View { page }

    private func focusSnapshot() -> String {
        let focused = UIAccessibility.focusedElement(using: .notificationVoiceOver) as? NSObject
        let identifier = (focused as? UIAccessibilityIdentification)?.accessibilityIdentifier ?? "nil"
        let elementType = focused.map { String(describing: type(of: $0)) } ?? "nil"
        let parentType = (focused as? UIAccessibilityElement)?.accessibilityContainer
            .map { String(describing: type(of: $0)) } ?? "unavailable"
        return "id=\(identifier) marker=\(focused?.accessibilityValue ?? "nil") label=\(focused?.accessibilityLabel ?? "nil") elementType=\(elementType) parentType=\(parentType)"
    }

    private func trace(_ event: String, snapshot: String? = nil) {
        let message = "epoch=\(Date().timeIntervalSince1970) uptime=\(ProcessInfo.processInfo.systemUptime) \(event) pid=\(ProcessInfo.processInfo.processIdentifier) presentation=\(generation) dismissal=\(closeCount) shown=\(showSheet) opener=\(openerMounted) voiceOver=\(UIAccessibility.isVoiceOverRunning) \(snapshot ?? focusSnapshot())"
        Logger(subsystem: "kinetix.m6811", category: "focus").notice("\(message, privacy: .public)")
    }

    private func sampleFocus(dismissal: Int) async {
        var previous: String?
        for sample in 0...80 {
            guard closeCount == dismissal else { return }
            let snapshot = focusSnapshot()
            if snapshot != previous || sample.isMultiple(of: 10) {
                trace("app-sample interval=\(sample)", snapshot: snapshot)
                previous = snapshot
            }
            try? await Task.sleep(for: .milliseconds(100))
        }
    }

    private func present() {
        generation += 1
        trace("presentation-request")
        withAnimation(.linear(duration: 0.35)) { showSheet = true }
    }

    private func restoreFocus() {
        trace("dismissal-callback")
        guard !showSheet || arguments.contains("--stale-completion"), arguments.contains("--host-restores") else { return }
        let target: ReaderFocus = openerMounted || arguments.contains("--suppress-fallback") ? .opener : .fallback
        restorationCount += 1
        restorationReceipt = "Request \(target.rawValue) #\(restorationCount)"
        guard !arguments.contains("--suppress-restore") else { return }
        trace("caller-focus-request target=\(target.rawValue)")
        if arguments.contains("--dismissed-target") {
            readerFocus = .dismiss
            return
        }
        if arguments.contains("--wrong-label") { openerLabel = "Return to dashboard" }
        if arguments.contains("--delay-focus-assignment") {
            let presentation = generation
            Task { @MainActor in
                try? await Task.sleep(for: .seconds(6))
                guard presentation == generation, !showSheet else { return }
                trace("caller-focus-assignment delayed-fixture target=sheet-\(target.rawValue)")
                backgroundFocus = target
            }
        } else {
            trace("caller-focus-assignment target=sheet-\(target.rawValue)")
            backgroundFocus = target
        }
    }

    private var page: some View {
        VStack(spacing: 16) {
            Text("Motion accessibility").accessibilityAddTraits(.isHeader)
            KinetixSegmentedControl {
                KinetixSegmentedControlItem("North", isSelected: selected == "North") { selected = "North" }
                KinetixSegmentedControlItem("Central", isSelected: false) {}.disabled(true)
                KinetixSegmentedControlItem("South", isSelected: selected == "South") { selected = "South" }
            }
            KinetixProgress(value: progress)
                .frame(height: 8)
                .accessibilityLabel("Upload progress")
            Button("Read announcement timeline") { Task { await runTimeline() } }
                .accessibilityIdentifier("timeline-start")
                .accessibilityFocused($backgroundFocus, equals: .timeline)
            if openerMounted {
                Button("Open library sheet", action: present)
                .accessibilityLabel(openerLabel)
                .accessibilityIdentifier("sheet-opener")
                .accessibilityValue("sheet-opener")
                .accessibilityFocused($backgroundFocus, equals: .opener)
            } else {
                Button("Back to library") {}
                    .accessibilityIdentifier("sheet-fallback")
                    .accessibilityValue("sheet-fallback")
                    .accessibilityFocused($backgroundFocus, equals: .fallback)
            }
            Text(observedVoiceOverTarget)
                .accessibilityIdentifier("focus-witness")
            if arguments.contains("--reopen-twice") {
                Text("Presentation \(generation)").accessibilityIdentifier("presentation-witness")
            }
            Text(restorationReceipt).accessibilityIdentifier("restore-request-witness")
            Text(reducedMotion ? "Reduce Motion on" : "Reduce Motion off")
                .accessibilityIdentifier("reduce-state")
            Text(receipts.isEmpty ? "No announcement completions" : receipts.joined(separator: " / "))
                .accessibilityIdentifier("announcement-receipts")
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .overlay {
            KinetixSheet(isPresented: $showSheet, onDismiss: restoreFocus) {
                Text("Library sheet heading").accessibilityAddTraits(.isHeader)
                    .accessibilityFocused($readerFocus, equals: .heading)
                if arguments.contains("--remove-opener") {
                    Button("Remove opening control") { openerMounted = false }
                }
                Button("Dismiss library sheet") { closeSheet() }
                    .accessibilityIdentifier("sheet-dismiss")
                    .accessibilityValue("sheet-dismiss")
                    .accessibilityFocused($readerFocus, equals: .dismiss)
                    .onAppear { trace("dismiss-element-appeared") }
                    .onDisappear { trace("dismiss-element-disappeared") }
            }
        }
        .overlay { KinetixToaster(toast: $toast, duration: 5).allowsHitTesting(false) }
        .environment(\.layoutDirection, arguments.contains("--rtl") ? .rightToLeft : .leftToRight)
        .onReceive(NotificationCenter.default.publisher(for: UIAccessibility.elementFocusedNotification)) { _ in
            // The AX service reports the current element independently of the focus binding and speech.
            let focused = UIAccessibility.focusedElement(using: .notificationVoiceOver) as? NSObject
            observedVoiceOverTarget = focused?.accessibilityValue ?? "No VoiceOver target marker"
            trace("uikit-focus-notification")
        }
        .onReceive(NotificationCenter.default.publisher(for: UIAccessibility.announcementDidFinishNotification)) { notification in
            guard let text = notification.userInfo?[UIAccessibility.announcementStringValueUserInfoKey] as? String,
                  let success = notification.userInfo?[UIAccessibility.announcementWasSuccessfulUserInfoKey] as? NSNumber
            else { return }
            receipts.append("\(success.boolValue ? "OK" : "INTERRUPTED") \(text)")
        }
    }

    private func closeSheet() {
        closeCount += 1
        trace("dismissal-request-and-animation-transaction")
        withAnimation(.linear(duration: 0.35)) { showSheet = false }
        if arguments.contains("--remove-opener-on-close") {
            openerMounted = false
            trace("fixture-opener-removed-on-close")
        }
        if arguments.contains("--sample-focus") {
            let dismissal = closeCount
            Task { @MainActor in await sampleFocus(dismissal: dismissal) }
        }
        if (arguments.contains("--reopen-once") && closeCount == 1)
            || (arguments.contains("--reopen-twice") && closeCount <= 2) {
            Task { @MainActor in
                if arguments.contains("--reopen-next-turn") {
                    await Task.yield()
                } else {
                    try? await Task.sleep(for: .milliseconds(90))
                }
                present()
                if arguments.contains("--stale-completion") {
                    trace("injected-superseded-completion")
                    restoreFocus()
                }
            }
        }
    }

    @MainActor private func runTimeline() async {
        try? await Task.sleep(for: .seconds(1))
        UIAccessibility.post(notification: .announcement, argument: "Reader calibration")
        try? await Task.sleep(for: .seconds(3))
        toast = KinetixToast("File uploaded")
        try? await Task.sleep(for: .seconds(3))
        toast = KinetixToast("File uploaded")
        try? await Task.sleep(for: .seconds(3))
        toast = KinetixToast("Upload verified")
        try? await Task.sleep(for: .seconds(1))
        progress = 81
    }
}
