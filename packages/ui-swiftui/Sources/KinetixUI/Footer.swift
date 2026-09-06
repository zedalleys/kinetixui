//
// Footer.swift — KinetixFooter family.
//
// Mirrors packages/ui/src/components/footer.tsx: a page-footer shell —
// columns of nav links plus a bottom bar. Compose
// `KinetixFooterColumn` / `KinetixFooterLink` / `KinetixFooterBottom`
// inside it.
//

import SwiftUI

public struct KinetixFooter<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 32) { content }
            .padding(.horizontal, 24) // px-6
            .padding(.vertical, 40)   // py-10
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(colors.background)
            .overlay(alignment: .top) {
                Rectangle().fill(colors.border).frame(height: 1) // border-t
            }
    }
}

public struct KinetixFooterColumn<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let title: String
    private let content: Content

    public init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.kinetixLabelMd)
                .foregroundStyle(colors.foreground)
            VStack(alignment: .leading, spacing: 8) { content }
        }
    }
}

public struct KinetixFooterLink: View {
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
                .font(.system(size: 13))
                .foregroundStyle(colors.mutedForeground)
        }
        .buttonStyle(.plain)
    }
}

public struct KinetixFooterBottom<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack { content }
            .font(.system(size: 13))
            .foregroundStyle(colors.mutedForeground)
            .padding(.top, 24)
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .top) {
                Rectangle().fill(colors.border).frame(height: 1)
            }
    }
}
