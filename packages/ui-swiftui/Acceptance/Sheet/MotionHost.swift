import KinetixUI
import SwiftUI
import UIKit

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
    @State private var closeCount = 0
    @State private var restorationReceipt = "No request"
    @State private var restorationCount = 0
    @State private var openerMounted = true
    @State private var receipts: [String] = []
    // M5.36: the app's own restoration act, recorded separately from whatever the
    // accessibility service later reports. `systemUptime` is seconds since boot, so the
    // host and the test runner read the same clock and one origin covers both processes.
    @State private var assignedTarget = "none"
    @State private var assignmentUptime = "none"

    private var arguments: [String] { ProcessInfo.processInfo.arguments }

    var body: some View { page }

    private func restoreFocus() {
        guard !showSheet, arguments.contains("--host-restores") else { return }
        let target: ReaderFocus = openerMounted ? .opener : .fallback
        restorationCount += 1
        restorationReceipt = "Request \(target.rawValue) #\(restorationCount)"
        // Negative control A: request recorded, assignment never made.
        guard !arguments.contains("--suppress-restore") else { return }
        // Negative control B: assign a control that IS mounted but is the wrong one, so
        // focus moves promptly to the wrong target. This fails the identity assertion while
        // leaving timeliness satisfied, which is what proves the two are independent.
        let assigned: ReaderFocus = arguments.contains("--restore-to-timeline") ? .timeline : target
        backgroundFocus = assigned
        assignedTarget = assigned.rawValue
        assignmentUptime = String(format: "%.6f", ProcessInfo.processInfo.systemUptime)
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
                Button("Open library sheet") {
                    withAnimation(.linear(duration: 0.35)) {
                        showSheet = true
                    }
                }
                .accessibilityFocused($backgroundFocus, equals: .opener)
            } else {
                Button("Back to library") {}
                    .accessibilityFocused($backgroundFocus, equals: .fallback)
            }
            // Unchanged, so #637's existing expectations still read what they always read.
            Text("Focus: \((readerFocus ?? backgroundFocus)?.rawValue ?? "none")")
                .accessibilityIdentifier("focus-witness")
            // The coalesced witness above prefers `readerFocus`, so a sheet-side value MASKS an
            // already-assigned background target. These three separate the three facts it merged.
            Text(readerFocus?.rawValue ?? "none")
                .accessibilityIdentifier("reader-focus-witness")
            Text(backgroundFocus?.rawValue ?? "none")
                .accessibilityIdentifier("background-focus-witness")
            Text(assignedTarget).accessibilityIdentifier("assigned-target-witness")
            Text(assignmentUptime).accessibilityIdentifier("assignment-uptime-witness")
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
                    .accessibilityFocused($readerFocus, equals: .dismiss)
            }
        }
        .overlay { KinetixToaster(toast: $toast, duration: 5).allowsHitTesting(false) }
        .environment(\.layoutDirection, arguments.contains("--rtl") ? .rightToLeft : .leftToRight)
        .onReceive(NotificationCenter.default.publisher(for: UIAccessibility.announcementDidFinishNotification)) { notification in
            guard let text = notification.userInfo?[UIAccessibility.announcementStringValueUserInfoKey] as? String,
                  let success = notification.userInfo?[UIAccessibility.announcementWasSuccessfulUserInfoKey] as? NSNumber
            else { return }
            receipts.append("\(success.boolValue ? "OK" : "INTERRUPTED") \(text)")
        }
    }

    private func closeSheet() {
        closeCount += 1
        withAnimation(.linear(duration: 0.35)) { showSheet = false }
        if arguments.contains("--reopen-once"), closeCount == 1 {
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(90))
                withAnimation(.linear(duration: 0.35)) { showSheet = true }
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
