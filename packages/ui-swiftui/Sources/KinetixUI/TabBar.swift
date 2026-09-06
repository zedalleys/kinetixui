//
// TabBar.swift — KinetixTabBar / KinetixTabBarItem.
//
// Mirrors packages/ui/src/components/tab-bar.tsx: a mobile bottom
// navigation bar — a fixed row of icon + label destinations, active item
// driven by `isActive`, optional `badge`.
//

import SwiftUI

public struct KinetixTabBar<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 0) { content }
            .frame(maxWidth: .infinity)
            .background(colors.background)
            .overlay(alignment: .top) {
                Rectangle().fill(colors.border).frame(height: 1) // border-t
            }
    }
}

public struct KinetixTabBarItem<Icon: View>: View {
    @Environment(\.kinetixColors) private var colors

    private let label: String
    private let isActive: Bool
    private let badge: String?
    private let icon: Icon
    private let action: () -> Void

    public init(
        label: String,
        isActive: Bool = false,
        badge: String? = nil,
        action: @escaping () -> Void,
        @ViewBuilder icon: () -> Icon
    ) {
        self.label = label
        self.isActive = isActive
        self.badge = badge
        self.action = action
        self.icon = icon()
    }

    public var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                icon
                    .font(.system(size: 20))
                    .overlay(alignment: .topTrailing) {
                        if let badge {
                            Text(badge)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(colors.destructiveForeground)
                                .padding(.horizontal, 4)
                                .frame(minWidth: 16, minHeight: 16)
                                .background(colors.destructive, in: Capsule())
                                .offset(x: 8, y: -6)
                        }
                    }
                Text(label)
                    .font(.kinetixLabelSm)
            }
            .foregroundStyle(isActive ? colors.primary : colors.mutedForeground)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? [.isSelected] : [])
    }
}
