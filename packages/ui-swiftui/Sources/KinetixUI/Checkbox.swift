//
// Checkbox.swift — KinetixCheckbox.
//
// Mirrors packages/ui/src/components/checkbox.tsx. Figma source: node
// 54863:483. 18pt box (Figma-literal, off the shared spacing scale),
// radius/sm, 2pt border. Unchecked border = `--input`; checked /
// indeterminate = `--primary` fill + `--primary-foreground` glyph;
// `isError` paints it `--destructive`.
//
// Radix's tri-state `checked | unchecked | indeterminate` is expressed
// here as a `Bool` binding plus a display-only `indeterminate` flag (the
// common call — same split as the Compose port's boolean convenience
// overload). Glyphs are SF Symbols. The focus ring isn't ported — same
// "no hover/focus" gap as KinetixButton.
//

import SwiftUI

public struct KinetixCheckbox: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    @Binding private var isOn: Bool
    private let indeterminate: Bool
    private let isError: Bool

    public init(isOn: Binding<Bool>, indeterminate: Bool = false, isError: Bool = false) {
        self._isOn = isOn
        self.indeterminate = indeterminate
        self.isError = isError
    }

    private var checkedLike: Bool { isOn || indeterminate }

    private var borderColor: Color {
        if isError { return colors.destructive }
        return checkedLike ? colors.primary : colors.input
    }

    private var fillColor: Color {
        guard checkedLike else { return .clear }
        return isError ? colors.destructive : colors.primary
    }

    public var body: some View {
        Button {
            isOn.toggle()
        } label: {
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(fillColor)
                .overlay {
                    RoundedRectangle(cornerRadius: 4, style: .continuous)
                        .strokeBorder(borderColor, lineWidth: 2)
                }
                .overlay {
                    if checkedLike {
                        Image(systemName: indeterminate ? "minus" : "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(colors.primaryForeground)
                    }
                }
                .frame(width: 18, height: 18)
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.5)
        .accessibilityAddTraits(isOn ? [.isSelected] : [])
    }
}
