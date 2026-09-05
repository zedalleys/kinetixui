//
// Fab.swift — KinetixFab.
//
// Mirrors packages/ui/src/components/fab.tsx (`fabVariants`): a floating
// action button, circular by default or an extended pill. `size-14` /
// `size-11` (56 / 44) are off the shared spacing scale. `shadow-lg` has
// no elevation token — a larger literal than KinetixCard's stand-in.
// Hover/active colour shifts aren't ported (no hover on touch) — same
// gap as KinetixButton.
//

import SwiftUI

public enum KinetixFabVariant {
    case primary, secondary
}

public enum KinetixFabSize {
    case `default`, sm
}

public struct KinetixFab<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    private let variant: KinetixFabVariant
    private let size: KinetixFabSize
    private let extended: Bool
    private let action: () -> Void
    private let content: Content

    public init(
        variant: KinetixFabVariant = .primary,
        size: KinetixFabSize = .default,
        extended: Bool = false,
        action: @escaping () -> Void,
        @ViewBuilder content: () -> Content
    ) {
        self.variant = variant
        self.size = size
        self.extended = extended
        self.action = action
        self.content = content()
    }

    private var diameter: CGFloat { size == .default ? 56 : 44 }

    private var background: Color {
        variant == .primary ? colors.primary : colors.secondary
    }

    private var foreground: Color {
        variant == .primary ? colors.primaryForeground : colors.secondaryForeground
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 8) { content }
                .font(.system(size: size == .default ? 24 : 20, weight: .medium))
                .foregroundStyle(foreground)
                .frame(width: extended ? nil : diameter, height: diameter)
                .frame(minWidth: extended ? diameter : nil)
                .padding(.horizontal, extended ? 20 : 0) // px-5
                .background(background, in: Capsule())
                .shadow(color: .black.opacity(0.2), radius: 8, y: 4) // shadow-lg approx
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.5)
    }
}
