//
// PasswordInput.swift — KinetixPasswordInput.
//
// Mirrors packages/ui/src/components/password-input.tsx: a KinetixInput
// with a show / hide toggle in the trailing slot. Toggle glyph is the
// `eye` / `eye.slash` SF Symbol (the React source's lucide `Eye` /
// `EyeOff`). Flipping visibility swaps SecureField ↔ TextField, which
// drops keyboard focus — an accepted quirk of this pattern.
//

import SwiftUI

public struct KinetixPasswordInput: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var text: String
    @State private var visible = false
    private let placeholder: String
    private let isError: Bool

    public init(text: Binding<String>, placeholder: String = "", isError: Bool = false) {
        self._text = text
        self.placeholder = placeholder
        self.isError = isError
    }

    public var body: some View {
        KinetixInput(text: $text, placeholder: placeholder, isError: isError, isSecure: !visible) {
            Button {
                visible.toggle()
            } label: {
                Image(systemName: visible ? "eye.slash" : "eye")
                    .font(.kinetixBody)
                    .foregroundStyle(colors.mutedForeground)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(visible ? "Hide password" : "Show password")
        }
    }
}
