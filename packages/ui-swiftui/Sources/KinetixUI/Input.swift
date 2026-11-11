//
// Input.swift — KinetixInput.
//
// Mirrors packages/ui/src/components/input.tsx's bare control (label /
// helper text live in a separate field composition on the web too, not
// ported here). Figma source: node 54855:13836. Border `--input`, focus
// `--primary`, error `--destructive`, radius `--radius-sm`, padding
// `--spacing-3`, type = Body Medium (14 / 20, +0.25).
//
// `corners` mirrors the React CVA's Corners property. The focus-ring
// shadow token isn't ported — a separate semantic focus stroke appears
// immediately, independently of optional border-colour settling. `trailing`
// is a single end-aligned slot (the stand-in for the web
// `InputGroup` addon system) — enough for a future password show/hide
// control; `isSecure` switches to `SecureField` for the same reason.
// `keyboardType` is deliberately omitted — it's unavailable on macOS,
// where CI compiles.
//

import SwiftUI

public enum KinetixInputCorners {
    case sharp, `default`, rounded, pill
}

public struct KinetixInput<Trailing: View>: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var focused: Bool

    @Binding private var text: String
    private let placeholder: String
    private let isError: Bool
    private let isSecure: Bool
    private let corners: KinetixInputCorners
    private let trailing: Trailing

    public init(
        text: Binding<String>,
        placeholder: String = "",
        isError: Bool = false,
        isSecure: Bool = false,
        corners: KinetixInputCorners = .default,
        @ViewBuilder trailing: () -> Trailing
    ) {
        self._text = text
        self.placeholder = placeholder
        self.isError = isError
        self.isSecure = isSecure
        self.corners = corners
        self.trailing = trailing()
    }

    private var cornerRadius: CGFloat {
        switch corners {
        case .sharp:   return 0
        case .default: return 4    // radius/sm
        case .rounded: return 8    // radius/md
        case .pill:    return 9999 // radius/full
        }
    }

    private var borderColor: Color {
        if isError { return colors.destructive }
        return focused ? colors.action : colors.input
    }

    @ViewBuilder
    private var field: some View {
        if isSecure {
            SecureField(placeholder, text: $text).focused($focused)
        } else {
            TextField(placeholder, text: $text).focused($focused)
        }
    }

    public var body: some View {
        HStack(spacing: 8) {
            field
                .textFieldStyle(.plain)
                .font(.kinetixBody)
                .tracking(0.25)
                .foregroundStyle(colors.foreground)
            trailing
        }
        .padding(.horizontal, corners == .pill ? 16 : 12) // pill adds px-4
        .padding(.vertical, 12) // spacing/3
        .background(colors.background, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(borderColor, lineWidth: 1)
                .animation(KinetixFocusMotion.animation(reduceMotion: reduceMotion), value: focused)
                .transition(.identity)
                .id(reduceMotion)
        }
        .opacity(isEnabled ? 1 : 0.5)
        .overlay {
            RoundedRectangle(cornerRadius: cornerRadius + 3, style: .continuous)
                .strokeBorder(colors.focus, lineWidth: 2)
                .padding(-3) // outside validation border; keep both cues visible
                .opacity(focused && isEnabled ? 1 : 0)
                .animation(nil, value: focused)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
        .animation(nil, value: isError)
    }
}

public extension KinetixInput where Trailing == EmptyView {
    /// No trailing slot.
    init(
        text: Binding<String>,
        placeholder: String = "",
        isError: Bool = false,
        isSecure: Bool = false,
        corners: KinetixInputCorners = .default
    ) {
        self.init(
            text: text,
            placeholder: placeholder,
            isError: isError,
            isSecure: isSecure,
            corners: corners
        ) { EmptyView() }
    }
}
