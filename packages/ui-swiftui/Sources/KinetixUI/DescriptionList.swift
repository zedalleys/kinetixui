//
// DescriptionList.swift — KinetixDescriptionList / KinetixDescriptionListItem.
//
// Mirrors packages/ui/src/components/description-list.tsx: term/detail
// rows with the site's own spec-sheet skin (mono, uppercase, tracked
// term labels; a divided rounded shell). Gap-fill addition (not in the
// original Figma source). Same divider call as KinetixList: each row
// draws its own bottom divider (showDivider) rather than a shared
// divide-y — SwiftUI has no single-modifier equivalent for "border
// between children, not around them."
//

import SwiftUI

public struct KinetixDescriptionList<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: 12, style: .continuous) // radius/lg
        VStack(spacing: 0) { content }
            .background(colors.muted.opacity(0.2))
            .clipShape(shape)
            .overlay { shape.strokeBorder(colors.border, lineWidth: 1) }
    }
}

public enum KinetixDescriptionListLayout {
    case row, stacked
}

public struct KinetixDescriptionListItem<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let term: String
    private let layout: KinetixDescriptionListLayout
    private let showDivider: Bool
    private let content: Content

    public init(
        term: String,
        layout: KinetixDescriptionListLayout = .row,
        showDivider: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        self.term = term
        self.layout = layout
        self.showDivider = showDivider
        self.content = content()
    }

    private var termLabel: some View {
        Text(term.uppercased())
            .font(.system(size: 10, design: .monospaced)) // off the named type scale, same call as the React source
            .tracking(1.4) // tracking-[0.14em] at 10pt
            .foregroundStyle(colors.mutedForeground)
            .lineLimit(1)
    }

    public var body: some View {
        VStack(spacing: 0) {
            Group {
                if layout == .row {
                    HStack(alignment: .firstTextBaseline, spacing: 12) { // spacing/3
                        termLabel.frame(width: 96, alignment: .leading) // w-24, off-scale — same call as KinetixBadge
                        content
                    }
                } else {
                    VStack(alignment: .leading, spacing: 4) {
                        termLabel
                        content
                    }
                }
            }
            .padding(.horizontal, 12) // spacing/3
            .padding(.vertical, 10) // py-2.5, off-scale — same call as KinetixBadge

            if showDivider {
                colors.border.frame(height: 1)
            }
        }
    }
}
