//
// Toaster.swift — KinetixToaster / KinetixToast.
//
// Mirrors packages/ui/src/components/sonner.tsx. Place KinetixToaster in
// an `.overlay { }` / top-level `ZStack` and drive it with a
// `KinetixToast?` binding; it shows a bottom card and clears itself after
// `duration` seconds. The Compose port used Material3's `SnackbarHost`
// for the same role.
//

import SwiftUI

public struct KinetixToast {
    public enum Intent {
        case normal, success, error
    }

    public let message: String
    public let intent: Intent

    public init(_ message: String, intent: Intent = .normal) {
        self.message = message
        self.intent = intent
    }
}

public struct KinetixToaster: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var toast: KinetixToast?
    private let duration: Double

    public init(toast: Binding<KinetixToast?>, duration: Double = 3) {
        self._toast = toast
        self.duration = duration
    }

    private func color(for intent: KinetixToast.Intent) -> Color {
        switch intent {
        case .normal:  return colors.popoverForeground
        case .success: return colors.success
        case .error:   return colors.destructive
        }
    }

    public var body: some View {
        VStack {
            Spacer()
            if let toast {
                HStack(spacing: 8) {
                    if toast.intent != .normal {
                        Image(systemName: toast.intent == .success ? "checkmark.circle" : "exclamationmark.circle")
                    }
                    Text(toast.message)
                        .font(.kinetixBody)
                    Spacer(minLength: 0)
                }
                .foregroundStyle(color(for: toast.intent))
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .frame(maxWidth: 400)
                .background(colors.popover, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .strokeBorder(colors.border, lineWidth: 1)
                }
                .shadow(color: .black.opacity(0.15), radius: 12, y: 4)
                .padding(16)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .task(id: toast.message) {
                    try? await Task.sleep(nanoseconds: UInt64(duration * 1_000_000_000))
                    withAnimation { self.toast = nil }
                }
            }
        }
    }
}
