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
    @Environment(\.kinetixRadii) private var radii
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @Binding private var isOn: Bool
    private let indeterminate: Bool
    private let isError: Bool

    public init(isOn: Binding<Bool>, indeterminate: Bool = false, isError: Bool = false) {
        self._isOn = isOn
        self.indeterminate = indeterminate
        self.isError = isError
    }

    /// The box's one true state, resolved once. The glyph, the fill and the accessibility value
    /// are all read off this, so they cannot disagree the way they did before MX1d.
    private var state: KinetixTriState { KinetixTriState.resolve(isOn: isOn, indeterminate: indeterminate) }

    private var checkedLike: Bool { state != .off }

    private var borderColor: Color {
        if isError { return colors.destructive }
        return checkedLike ? colors.action : colors.input
    }

    private var fillColor: Color {
        guard checkedLike else { return .clear }
        return isError ? colors.destructive : colors.action
    }

    public var body: some View {
        Button {
            isOn.toggle()
        } label: {
            RoundedRectangle(cornerRadius: radii.field, style: .continuous)
                .fill(fillColor)
                .overlay {
                    RoundedRectangle(cornerRadius: radii.field, style: .continuous)
                        .strokeBorder(borderColor, lineWidth: 2)
                }
                .overlay {
                    if checkedLike {
                        Image(systemName: state == .mixed ? "minus" : "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(colors.actionForeground)
                    }
                }
                .frame(width: 18, height: 18)
                // selection-state (fast · standard), keyed on the resolved tri-state so a move
                // between ANY two of the three settles, not only on/off. `nil` under Reduce Motion:
                // the fill still changes, it just does not interpolate.
                .animation(KinetixSelectionMotion.animation(reduceMotion: reduceMotion), value: state)
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.5)
        // Mixed was silent before MX1d: the trait below was the only announcement and it was keyed
        // on `isOn`, so a dash-filled box read as unselected and the third state never reached
        // VoiceOver at all. The value carries all three; the trait stays for the fully-checked one.
        .accessibilityValue(state.accessibilityValue)
        .accessibilityAddTraits(state.isFullySelected ? [.isSelected] : [])
        // No `.isToggle` here, deliberately. This is a Button, and Apple defines button + toggle as a
        // SWITCH button, so adding the trait would have VoiceOver call every checkbox — mixed ones
        // included — a switch. The value above is what carries the three states; a checkbox-specific
        // representation is a separate question from this slice's defect.
    }
}
