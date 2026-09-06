//
// Pagination.swift — KinetixPagination family.
//
// Mirrors packages/ui/src/components/pagination.tsx, itself just
// `buttonVariants` recipes (Outline / Ghost, icon size). `size-9` (36) is
// off the shared spacing scale. Chevrons are `chevron.left` /
// `chevron.right` SF Symbols; the ellipsis is `ellipsis`.
//
// The React `PaginationContent` / `PaginationItem` wrappers (unstyled
// `<ul>` / `<li>`) aren't ported — the `KinetixPagination` HStack is the
// only container.
//

import SwiftUI

public struct KinetixPagination<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 4) { content } // gap-1
            .accessibilityElement(children: .contain)
    }
}

public struct KinetixPaginationItem: View {
    @Environment(\.kinetixColors) private var colors

    private let label: String
    private let isActive: Bool
    private let action: () -> Void

    public init(_ label: String, isActive: Bool = false, action: @escaping () -> Void) {
        self.label = label
        self.isActive = isActive
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(label)
                .font(.kinetixLabelLg)
                .foregroundStyle(isActive ? colors.foreground : colors.mutedForeground)
                .frame(width: 36, height: 36) // size-9
                .background(
                    isActive ? colors.accent : .clear,
                    in: RoundedRectangle(cornerRadius: 8, style: .continuous)
                )
                .overlay {
                    if isActive {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .strokeBorder(colors.input, lineWidth: 1)
                    }
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isActive ? [.isSelected] : [])
    }
}

public struct KinetixPaginationPrevious: View {
    @Environment(\.kinetixColors) private var colors
    private let action: () -> Void

    public init(action: @escaping () -> Void) {
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: "chevron.left")
                Text("Previous")
            }
            .font(.kinetixLabelLg)
            .foregroundStyle(colors.foreground)
            .padding(.horizontal, 10)
            .frame(height: 36)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Go to previous page")
    }
}

public struct KinetixPaginationNext: View {
    @Environment(\.kinetixColors) private var colors
    private let action: () -> Void

    public init(action: @escaping () -> Void) {
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text("Next")
                Image(systemName: "chevron.right")
            }
            .font(.kinetixLabelLg)
            .foregroundStyle(colors.foreground)
            .padding(.horizontal, 10)
            .frame(height: 36)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Go to next page")
    }
}

public struct KinetixPaginationEllipsis: View {
    @Environment(\.kinetixColors) private var colors

    public init() {}

    public var body: some View {
        Image(systemName: "ellipsis")
            .font(.kinetixBody)
            .foregroundStyle(colors.mutedForeground)
            .frame(width: 36, height: 36)
            .accessibilityLabel("More pages")
    }
}
