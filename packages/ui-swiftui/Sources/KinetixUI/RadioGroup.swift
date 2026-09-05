//
// RadioGroup.swift — KinetixRadioGroup / KinetixRadioButton.
//
// Mirror packages/ui/src/components/radio-group.tsx (`grid gap-3` group,
// 18pt / 2pt-border circle items, 10pt dot). Figma-literal 18 and 10
// aren't on the shared spacing scale — hardcoded, same as the Compose
// port. Selection state is the caller's (`isSelected` + `action`) — the
// group only supplies layout, same division as Radix's own
// Root / Item split.
//

import SwiftUI

public struct KinetixRadioGroup<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) { content } // grid gap-3
    }
}

public struct KinetixRadioButton: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    private let isSelected: Bool
    private let isError: Bool
    private let action: () -> Void

    public init(isSelected: Bool, isError: Bool = false, action: @escaping () -> Void) {
        self.isSelected = isSelected
        self.isError = isError
        self.action = action
    }

    private var borderColor: Color {
        if isError { return colors.destructive }
        return isSelected ? colors.primary : colors.input
    }

    public var body: some View {
        Button(action: action) {
            Circle()
                .strokeBorder(borderColor, lineWidth: 2)
                .frame(width: 18, height: 18)
                .overlay {
                    if isSelected {
                        Circle()
                            .fill(isError ? colors.destructive : colors.primary)
                            .frame(width: 10, height: 10)
                    }
                }
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.5)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}
