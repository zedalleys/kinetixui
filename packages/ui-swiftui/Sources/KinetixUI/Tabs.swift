//
// Tabs.swift — KinetixTabsList / KinetixTabsTrigger / KinetixTabsContent.
//
// Mirrors packages/ui/src/components/tabs.tsx. No `KinetixTabs` root —
// there's no SwiftUI context to thread a shared selected value through,
// so KinetixTabsTrigger takes `isSelected` / `action` directly (the
// caller owns the selection, same as the Compose port). `h-9` (36) is off
// the shared spacing scale; the active tab's `shadow` has no elevation
// token — same documented gap as KinetixCard.
//

import SwiftUI

public struct KinetixTabsList<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 0) { content }
            .frame(height: 36) // h-9
            .padding(4)        // p-1
            .background(colors.muted, in: RoundedRectangle(cornerRadius: 12, style: .continuous)) // radius/lg
            .fixedSize() // inline-flex — hug content
    }
}

public struct KinetixTabsTrigger: View {
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
                .font(.kinetixLabelLg)
                .foregroundStyle(isSelected ? colors.foreground : colors.mutedForeground)
                .padding(.horizontal, 12) // px-3
                .padding(.vertical, 4)    // py-1
                .frame(maxHeight: .infinity)
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

public struct KinetixTabsContent<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) { content }
            .padding(.top, 8) // mt-2
    }
}
