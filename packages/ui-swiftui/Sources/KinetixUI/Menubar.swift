//
// Menubar.swift — KinetixMenubar / KinetixMenubarMenu.
//
// Mirrors packages/ui/src/components/menubar.tsx: a bordered bar of
// top-level menus. Each KinetixMenubarMenu wraps a native `Menu`; fill
// its content with the shared `KinetixMenuItem` / `KinetixMenuSeparator`
// / `KinetixMenuLabel` parts from DropdownMenu.swift.
//

import SwiftUI

public struct KinetixMenubar<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 4) { content }
            .padding(4)
            .background(colors.background, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .strokeBorder(colors.border, lineWidth: 1)
            }
    }
}

public struct KinetixMenubarMenu<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let title: String
    private let menuContent: Content

    public init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.menuContent = content()
    }

    public var body: some View {
        Menu {
            menuContent
        } label: {
            Text(title)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(colors.foreground)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .contentShape(Rectangle())
        }
    }
}
