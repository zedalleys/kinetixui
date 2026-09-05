//
// ContextMenu.swift — KinetixContextMenu.
//
// Mirrors packages/ui/src/components/context-menu.tsx. Wraps SwiftUI's
// native `.contextMenu` (long-press on iOS, right-click on macOS). Put
// `KinetixMenuItem` / `KinetixMenuSeparator` / `KinetixMenuLabel` (from
// DropdownMenu.swift) in the `menu` builder — same shared row parts.
//

import SwiftUI

public struct KinetixContextMenu<Content: View, MenuItems: View>: View {
    private let content: Content
    private let menuItems: MenuItems

    public init(
        @ViewBuilder content: () -> Content,
        @ViewBuilder menu: () -> MenuItems
    ) {
        self.content = content()
        self.menuItems = menu()
    }

    public var body: some View {
        content.contextMenu {
            menuItems
        }
    }
}
