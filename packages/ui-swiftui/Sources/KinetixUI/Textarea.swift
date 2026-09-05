//
// Textarea.swift — KinetixTextarea.
//
// Mirrors packages/ui/src/components/textarea.tsx — per its own doc
// comment, identical to KinetixInput except multi-line with
// `min-h-[100px]`. Same token choices; 100 is the Figma-literal
// min-height, off the shared spacing scale.
//
// Built on `TextEditor`, which has no native placeholder — one is
// overlaid when empty. `TextEditor`'s internal text inset isn't publicly
// specified, so the placeholder alignment is approximate.
//

import SwiftUI

public struct KinetixTextarea: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled
    @FocusState private var focused: Bool

    @Binding private var text: String
    private let placeholder: String
    private let isError: Bool

    public init(text: Binding<String>, placeholder: String = "", isError: Bool = false) {
        self._text = text
        self.placeholder = placeholder
        self.isError = isError
    }

    private var borderColor: Color {
        if isError { return colors.destructive }
        return focused ? colors.primary : colors.input
    }

    public var body: some View {
        TextEditor(text: $text)
            .focused($focused)
            .font(.system(size: 14))
            .foregroundStyle(colors.foreground)
            .scrollContentBackground(.hidden) // iOS 16 / macOS 13
            .frame(minHeight: 100, alignment: .topLeading)
            .padding(12) // spacing/3
            .background(colors.background, in: RoundedRectangle(cornerRadius: 4, style: .continuous))
            .overlay(alignment: .topLeading) {
                if text.isEmpty {
                    Text(placeholder)
                        .font(.system(size: 14))
                        .foregroundStyle(colors.mutedForeground)
                        .padding(.top, 20)
                        .padding(.leading, 17)
                        .allowsHitTesting(false)
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: 1)
            }
            .opacity(isEnabled ? 1 : 0.5)
            .animation(.easeInOut(duration: 0.12), value: focused)
    }
}
