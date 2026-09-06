//
// Table.swift — KinetixTable family.
//
// Mirrors packages/ui/src/components/table.tsx. SwiftUI has no `<table>`
// cross-row column alignment, so cells take an explicit `width` (nil =
// flexible equal share) — the caller keeps it consistent across rows,
// the same "caller controls column sizing" division the Compose port's
// `weight` uses. Rows draw their own bottom rule; the whole table scrolls
// horizontally for the source's `overflow-auto`. `h-10` (40) is off the
// shared spacing scale.
//

import SwiftUI

public struct KinetixTable<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) { content }
        }
    }
}

/// Groups header rows. Purely structural — same as the web `<thead>`.
public struct KinetixTableHeader<Content: View>: View {
    private let content: Content
    public init(@ViewBuilder content: () -> Content) { self.content = content() }
    public var body: some View { content }
}

/// Groups body rows. Purely structural.
public struct KinetixTableBody<Content: View>: View {
    private let content: Content
    public init(@ViewBuilder content: () -> Content) { self.content = content() }
    public var body: some View { content }
}

public struct KinetixTableRow<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let isHeader: Bool
    private let content: Content

    public init(isHeader: Bool = false, @ViewBuilder content: () -> Content) {
        self.isHeader = isHeader
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 0) { content }
            .frame(minHeight: isHeader ? 40 : 44, alignment: .leading) // h-10 header
            .overlay(alignment: .bottom) {
                Rectangle().fill(colors.border).frame(height: 1) // border-b
            }
    }
}

public struct KinetixTableHead: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String
    private let width: CGFloat?

    public init(_ text: String, width: CGFloat? = nil) {
        self.text = text
        self.width = width
    }

    public var body: some View {
        Text(text)
            .font(.kinetixLabelLg)
            .foregroundStyle(colors.mutedForeground)
            .frame(maxWidth: width == nil ? .infinity : nil, alignment: .leading)
            .frame(width: width, alignment: .leading)
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
    }
}

public struct KinetixTableCell<Content: View>: View {
    private let width: CGFloat?
    private let content: Content

    public init(width: CGFloat? = nil, @ViewBuilder content: () -> Content) {
        self.width = width
        self.content = content()
    }

    public var body: some View {
        content
            .frame(maxWidth: width == nil ? .infinity : nil, alignment: .leading)
            .frame(width: width, alignment: .leading)
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
    }
}

public struct KinetixTableCaption: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.kinetixBody)
            .foregroundStyle(colors.mutedForeground)
            .padding(.top, 16)
    }
}
