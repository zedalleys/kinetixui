//
// Sidebar.swift — KinetixSidebar / KinetixSidebarItem.
//
// A **scoped** port of packages/ui/src/components/sidebar.tsx (a
// 390-line desktop dashboard shell — provider context, cookie
// persistence, keyboard shortcut, rail/icon-collapse, `SidebarInset`).
// None of that transfers to a phone-first package. What ports is the nav
// drawer itself: a leading-edge slide-in panel, caller-owned `isOpen`,
// scrim-tap to close — the same scope cut the Compose port made wrapping
// Material3's `ModalNavigationDrawer`. Place it in an `.overlay { }` /
// top-level `ZStack`.
//

import SwiftUI

public struct KinetixSidebar<Content: View>: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var isOpen: Bool
    private let width: CGFloat
    private let content: Content

    public init(isOpen: Binding<Bool>, width: CGFloat = 280, @ViewBuilder content: () -> Content) {
        self._isOpen = isOpen
        self.width = width
        self.content = content()
    }

    public var body: some View {
        if isOpen {
            ZStack(alignment: .leading) {
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture { isOpen = false }

                VStack(alignment: .leading, spacing: 4) { content }
                    .padding(16)
                    .frame(width: width, maxHeight: .infinity, alignment: .topLeading)
                    .background(colors.background)
                    .overlay(alignment: .trailing) {
                        Rectangle().fill(colors.border).frame(width: 1)
                    }
                    .ignoresSafeArea(edges: .vertical)
                    .transition(.move(edge: .leading))
            }
        }
    }
}

public struct KinetixSidebarItem: View {
    @Environment(\.kinetixColors) private var colors

    private let title: String
    private let systemImage: String?
    private let isActive: Bool
    private let action: () -> Void

    public init(
        _ title: String,
        systemImage: String? = nil,
        isActive: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.systemImage = systemImage
        self.isActive = isActive
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let systemImage {
                    Image(systemName: systemImage).frame(width: 18)
                }
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                Spacer(minLength: 0)
            }
            .foregroundStyle(isActive ? colors.accentForeground : colors.foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(
                isActive ? colors.accent : .clear,
                in: RoundedRectangle(cornerRadius: 6, style: .continuous)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? [.isSelected] : [])
    }
}
