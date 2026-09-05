//
// Dialog.swift — KinetixDialog family.
//
// Mirrors packages/ui/src/components/dialog.tsx. Rather than SwiftUI's
// `.sheet` (a bottom card on iOS), this is a centred modal: place it in
// an `.overlay { }` or a top-level `ZStack` and drive it with an
// `isPresented` binding (Radix's controlled `open` shape, no `Trigger` /
// `Portal` graph to reassemble — same call as the Compose port wrapping
// `androidx…Dialog`). `max-w-lg` (448) is off the shared spacing scale.
// The backdrop blur has no cheap SwiftUI equivalent and isn't
// approximated — the dim scrim alone reads as modal.
//
// `dismissible: false` (used by KinetixAlertDialog) drops the close
// affordance and scrim-tap dismissal — "must choose an explicit action".
//

import SwiftUI

public struct KinetixDialog<Content: View>: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var isPresented: Bool
    private let dismissible: Bool
    private let content: Content

    public init(
        isPresented: Binding<Bool>,
        dismissible: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        self._isPresented = isPresented
        self.dismissible = dismissible
        self.content = content()
    }

    public var body: some View {
        if isPresented {
            ZStack {
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture { if dismissible { isPresented = false } }

                VStack(alignment: .leading, spacing: 16) { content }
                    .padding(24) // p-6
                    .frame(maxWidth: 448) // max-w-lg
                    .background(colors.background, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(alignment: .topTrailing) {
                        if dismissible {
                            Button { isPresented = false } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(colors.mutedForeground)
                            }
                            .buttonStyle(.plain)
                            .padding(16)
                            .accessibilityLabel("Close")
                        }
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .strokeBorder(colors.border, lineWidth: 1)
                    }
                    .shadow(color: .black.opacity(0.2), radius: 16, y: 8)
                    .padding(24)
            }
            .transition(.opacity)
        }
    }
}

public struct KinetixDialogHeader<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) { content }
    }
}

public struct KinetixDialogFooter<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 8) {
            Spacer(minLength: 0)
            content
        }
    }
}

public struct KinetixDialogTitle: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.system(size: 18, weight: .semibold))
            .tracking(-0.4) // tracking-tight
            .foregroundStyle(colors.foreground)
    }
}

public struct KinetixDialogDescription: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundStyle(colors.mutedForeground)
            .fixedSize(horizontal: false, vertical: true)
    }
}
