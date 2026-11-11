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
    @Environment(\.kinetixRadii) private var radii
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
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
        return focused ? colors.action : colors.input
    }

    public var body: some View {
        TextEditor(text: $text)
            .focused($focused)
            .font(.kinetixBody)
            .foregroundStyle(colors.foreground)
            .scrollContentBackground(.hidden) // iOS 16 / macOS 13
            .frame(minHeight: 100, alignment: .topLeading)
            .padding(12) // spacing/3
            .background(colors.background, in: RoundedRectangle(cornerRadius: radii.field, style: .continuous))
            .overlay(alignment: .topLeading) {
                if text.isEmpty {
                    Text(placeholder)
                        .font(.kinetixBody)
                        .foregroundStyle(colors.mutedForeground)
                        .padding(.top, 20)
                        .padding(.leading, 17)
                        .allowsHitTesting(false)
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: radii.field, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: 1)
                    .animation(KinetixFocusMotion.animation(reduceMotion: reduceMotion), value: focused)
                    .transition(.identity)
                    .id(reduceMotion)
            }
            .opacity(isEnabled ? 1 : 0.5)
            .overlay {
                RoundedRectangle(cornerRadius: radii.field, style: .continuous)
                    .strokeBorder(colors.focus, lineWidth: 2)
                    .opacity(focused && isEnabled ? 1 : 0)
                    .animation(nil, value: focused)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
    }
}
