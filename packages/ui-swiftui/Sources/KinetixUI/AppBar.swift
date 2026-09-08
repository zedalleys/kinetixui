//
// AppBar.swift — KinetixAppBar (+ KinetixAppBarLink).
//
// Mirrors packages/ui/src/components/app-bar.tsx: a top application bar —
// a `brand` slot, a row of primary nav links (KinetixAppBarLink, `active`
// marks the current one) and a trailing `actions` slot, in a bordered
// header. The React component's md-breakpoint collapse-to-menu-toggle is
// dropped — a native top bar keeps the nav visible, horizontally
// scrollable if it overflows; same kind of scope-down as KinetixSheet
// (bottom-only). KinetixNavigationBar stays the mobile back-button bar.
//

import SwiftUI

public struct KinetixAppBar<Brand: View, Nav: View, Actions: View>: View {
    @Environment(\.kinetixColors) private var colors

    private let brand: Brand
    private let nav: Nav
    private let actions: Actions

    public init(
        @ViewBuilder brand: () -> Brand,
        @ViewBuilder nav: () -> Nav,
        @ViewBuilder actions: () -> Actions
    ) {
        self.brand = brand()
        self.nav = nav()
        self.actions = actions()
    }

    public var body: some View {
        HStack(spacing: 16) {
            brand
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 4) { nav }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 8) { actions }
        }
        .padding(.horizontal, 16)
        .frame(height: 56) // h-14
        .frame(maxWidth: .infinity)
        .background(colors.background)
        .overlay(alignment: .bottom) {
            Rectangle().fill(colors.border).frame(height: 1) // border-b
        }
    }
}

public extension KinetixAppBar where Actions == EmptyView {
    init(@ViewBuilder brand: () -> Brand, @ViewBuilder nav: () -> Nav) {
        self.init(brand: brand, nav: nav, actions: { EmptyView() })
    }
}

/// A primary nav link inside a `KinetixAppBar`. `active` = the current destination.
public struct KinetixAppBarLink: View {
    @Environment(\.kinetixColors) private var colors

    private let label: String
    private let active: Bool
    private let action: () -> Void

    public init(_ label: String, active: Bool = false, action: @escaping () -> Void) {
        self.label = label
        self.active = active
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(label)
                .font(.kinetixLabelMd)
                .foregroundStyle(active ? colors.foreground : colors.mutedForeground)
                .padding(.horizontal, 12) // px-3
                .padding(.vertical, 6) // py-1.5
                .background(active ? colors.accent : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 6)) // rounded-md
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(active ? .isSelected : [])
    }
}
