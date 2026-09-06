//
// Breadcrumb.swift — KinetixBreadcrumb family.
//
// Mirrors packages/ui/src/components/breadcrumb.tsx. Slot-shaped (same
// convention as KinetixCard / KinetixAlert) rather than an items-list
// API. `gap-1.5` (6) is off the shared spacing scale. `BreadcrumbEllipsis`
// isn't ported (rare); the separator is the `chevron.right` SF Symbol
// (the React source's lucide `ChevronRight`).
//

import SwiftUI

public struct KinetixBreadcrumb<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 6) { content } // gap-1.5
            .accessibilityElement(children: .contain)
    }
}

public struct KinetixBreadcrumbLink: View {
    @Environment(\.kinetixColors) private var colors

    private let text: String
    private let action: () -> Void

    public init(_ text: String, action: @escaping () -> Void) {
        self.text = text
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(text)
                .font(.kinetixBody)
                .foregroundStyle(colors.mutedForeground)
        }
        .buttonStyle(.plain)
    }
}

public struct KinetixBreadcrumbPage: View {
    @Environment(\.kinetixColors) private var colors

    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.kinetixBody)
            .foregroundStyle(colors.foreground)
    }
}

public struct KinetixBreadcrumbSeparator: View {
    @Environment(\.kinetixColors) private var colors

    private let symbol: String

    public init(_ symbol: String = "chevron.right") {
        self.symbol = symbol
    }

    public var body: some View {
        Image(systemName: symbol)
            .font(.kinetixBodySm)
            .foregroundStyle(colors.mutedForeground)
            .accessibilityHidden(true)
    }
}
