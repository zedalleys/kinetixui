//
// SegmentedControl.swift — KinetixSegmentedControl / KinetixSegmentedControlItem.
//
// Mirrors packages/ui/src/components/segmented-control.tsx: an iOS-style
// single-select strip. Same visual treatment as KinetixTabsList /
// KinetixTabsTrigger (filled track, raised selected segment) and the
// same stateless, caller-owns-the-selected-value shape — no SwiftUI
// context to thread a shared value through the way Radix's ToggleGroup
// does, same call as KinetixTabs.
//

import SwiftUI

public struct KinetixSegmentedControl<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 0) { content }
            .padding(4) // p-1
            .background(colors.muted, in: RoundedRectangle(cornerRadius: 12, style: .continuous)) // radius/lg
            .fixedSize(horizontal: false, vertical: true)
    }
}

public struct KinetixSegmentedControlItem: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    private let text: String
    private let isSelected: Bool
    private let action: () -> Void

    public init(_ text: String, isSelected: Bool, action: @escaping () -> Void) {
        self.text = text
        self.isSelected = isSelected
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(text)
                .font(.kinetixLabelMd.weight(.medium))
                .foregroundStyle(isSelected ? colors.foreground : colors.mutedForeground)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 12) // px-3
                .padding(.vertical, 4)    // py-1
                .background(
                    isSelected ? colors.background : .clear,
                    in: RoundedRectangle(cornerRadius: 8, style: .continuous) // radius/md
                )
                .shadow(color: isSelected ? .black.opacity(0.08) : .clear, radius: 1, y: 1)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.5)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}
