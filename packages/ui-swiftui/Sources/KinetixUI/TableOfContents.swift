//
// TableOfContents.swift — KinetixTableOfContents.
//
// Mirrors packages/ui/src/components/table-of-contents.tsx: an
// anchor-link nav list with indent levels and an active-item state (drive
// `active` from your own scroll-spy). The `<a href="#id">` navigation
// becomes an `onSelect(id)` callback.
//

import SwiftUI

public struct KinetixTocItem {
    public let id: String
    public let label: String
    public let level: Int

    public init(id: String, label: String, level: Int = 1) {
        self.id = id
        self.label = label
        self.level = level
    }
}

public struct KinetixTableOfContents: View {
    @Environment(\.kinetixColors) private var colors

    private let items: [KinetixTocItem]
    private let active: String?
    private let onSelect: (String) -> Void

    public init(items: [KinetixTocItem], active: String? = nil, onSelect: @escaping (String) -> Void) {
        self.items = items
        self.active = active
        self.onSelect = onSelect
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(items, id: \.id) { item in
                let isActive = item.id == active
                Button {
                    onSelect(item.id)
                } label: {
                    HStack(spacing: 0) {
                        Rectangle()
                            .fill(isActive ? colors.primary : Color.clear)
                            .frame(width: 1)
                        Text(item.label)
                            .font(.system(size: 13, weight: isActive ? .medium : .regular))
                            .foregroundStyle(isActive ? colors.primary : colors.mutedForeground)
                            .padding(.leading, CGFloat((item.level - 1) * 12 + 12))
                            .padding(.vertical, 6)
                        Spacer(minLength: 0)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
    }
}
