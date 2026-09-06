//
// List.swift — KinetixList / KinetixListItem.
//
// Mirrors packages/ui/src/components/list.tsx: a single-column list of
// rows (leading slot, title, optional description, trailing slot),
// distinct from a table. Each row draws its own bottom divider (SwiftUI
// has no `divide-y` equivalent). `onSelect` (interactive row) is a
// nullable callback, same convention as KinetixCheckbox. The hover/focus
// highlight ring isn't ported — no hover on touch.
//

import SwiftUI

public struct KinetixList<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 0) { content }
    }
}

public struct KinetixListItem<Leading: View, Trailing: View>: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    private let title: String
    private let description: String?
    private let onSelect: (() -> Void)?
    private let leading: Leading
    private let trailing: Trailing

    public init(
        title: String,
        description: String? = nil,
        onSelect: (() -> Void)? = nil,
        @ViewBuilder leading: () -> Leading,
        @ViewBuilder trailing: () -> Trailing
    ) {
        self.title = title
        self.description = description
        self.onSelect = onSelect
        self.leading = leading()
        self.trailing = trailing()
    }

    private var row: some View {
        HStack(spacing: 12) {
            leading
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.kinetixBody)
                    .foregroundStyle(colors.foreground)
                    .lineLimit(1)
                if let description {
                    Text(description)
                        .font(.system(size: 13))
                        .foregroundStyle(colors.mutedForeground)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            trailing
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            Rectangle().fill(colors.border).frame(height: 1)
        }
    }

    public var body: some View {
        if let onSelect {
            Button(action: onSelect) { row }
                .buttonStyle(.plain)
                .opacity(isEnabled ? 1 : 0.5)
        } else {
            row
        }
    }
}

public extension KinetixListItem where Trailing == EmptyView {
    /// Leading slot, no trailing slot.
    init(
        title: String,
        description: String? = nil,
        onSelect: (() -> Void)? = nil,
        @ViewBuilder leading: () -> Leading
    ) {
        self.init(title: title, description: description, onSelect: onSelect, leading: leading) { EmptyView() }
    }
}

public extension KinetixListItem where Leading == EmptyView, Trailing == EmptyView {
    /// Title / description only.
    init(
        title: String,
        description: String? = nil,
        onSelect: (() -> Void)? = nil
    ) {
        self.init(title: title, description: description, onSelect: onSelect) { EmptyView() } trailing: { EmptyView() }
    }
}
