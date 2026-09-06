//
// Toggle.swift — KinetixToggle.
//
// Mirrors packages/ui/src/components/toggle.tsx (`toggleVariants`). Sizes
// `h-8/h-9/h-10` (32/36/40) + `px-1.5/px-2/px-2.5` (6/8/10) — hardcoded
// where off the shared spacing scale, same as the Compose port. Pressed =
// `bg-accent` + `text-accent-foreground` + inset `ring`; unpressed =
// transparent + `foreground`. Hover isn't ported (no hover on touch) —
// same gap as KinetixButton.
//

import SwiftUI

public enum KinetixToggleVariant {
    case `default`, outline
}

public enum KinetixToggleSize {
    case sm, `default`, lg
}

public struct KinetixToggle<Label: View>: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    @Binding private var isOn: Bool
    private let variant: KinetixToggleVariant
    private let size: KinetixToggleSize
    private let label: Label

    public init(
        isOn: Binding<Bool>,
        variant: KinetixToggleVariant = .default,
        size: KinetixToggleSize = .default,
        @ViewBuilder label: () -> Label
    ) {
        self._isOn = isOn
        self.variant = variant
        self.size = size
        self.label = label()
    }

    private var dimension: CGFloat {
        switch size {
        case .sm:      return 32
        case .default: return 36
        case .lg:      return 40
        }
    }

    private var horizontalPadding: CGFloat {
        switch size {
        case .sm:      return 6
        case .default: return 8
        case .lg:      return 10
        }
    }

    public var body: some View {
        Button {
            isOn.toggle()
        } label: {
            label
                .font(.kinetixLabelLg)
                .foregroundStyle(isOn ? colors.accentForeground : colors.foreground)
                .padding(.horizontal, horizontalPadding)
                .frame(height: dimension)
                .frame(minWidth: dimension)
                .background(
                    isOn ? colors.accent : .clear,
                    in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                )
                .overlay {
                    if isOn || variant == .outline {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .strokeBorder(isOn ? colors.ring : colors.input, lineWidth: 1)
                    }
                }
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.5)
        .accessibilityAddTraits(isOn ? [.isSelected] : [])
    }
}
