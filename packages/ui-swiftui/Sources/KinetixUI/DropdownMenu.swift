//
// DropdownMenu.swift — KinetixDropdownMenu + shared menu-row parts.
//
// Mirrors packages/ui/src/components/dropdown-menu.tsx. Wraps SwiftUI's
// native `Menu`, which already renders items / separators / submenus and
// handles dismissal — the "reuse the platform machinery" call, same as
// the Compose port building on Material3's `DropdownMenu`. The Radix
// sub-component graph (Portal / Group / Sub / RadioGroup) isn't
// reproduced; place `KinetixMenuItem` / `KinetixMenuSeparator` /
// `KinetixMenuLabel` (and nested `Menu`s / `KinetixMenubarMenu` for
// submenus) directly in the `content` builder.
//
// These row parts are shared by KinetixContextMenu and KinetixMenubarMenu
// too — anywhere a native `Menu`/`.contextMenu` builder is expected.
//

import SwiftUI

public struct KinetixDropdownMenu<Label: View, Content: View>: View {
    private let menuContent: Content
    private let label: Label

    public init(
        @ViewBuilder content: () -> Content,
        @ViewBuilder label: () -> Label
    ) {
        self.menuContent = content()
        self.label = label()
    }

    public var body: some View {
        Menu {
            menuContent
        } label: {
            label
        }
    }
}

public struct KinetixMenuItem: View {
    private let title: String
    private let systemImage: String?
    private let role: ButtonRole?
    private let action: () -> Void

    public init(
        _ title: String,
        systemImage: String? = nil,
        destructive: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.systemImage = systemImage
        self.role = destructive ? .destructive : nil
        self.action = action
    }

    public var body: some View {
        Button(role: role, action: action) {
            if let systemImage {
                Label(title, systemImage: systemImage)
            } else {
                Text(title)
            }
        }
    }
}

public struct KinetixMenuSeparator: View {
    public init() {}

    public var body: some View {
        Divider()
    }
}

public struct KinetixMenuLabel: View {
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
    }
}
