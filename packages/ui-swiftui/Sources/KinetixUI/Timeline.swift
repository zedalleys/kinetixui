//
// Timeline.swift — KinetixTimeline.
//
// Mirrors packages/ui/src/components/timeline.tsx: ordered events down a
// rail (dot, connector, time, content). `alternating` lays content
// left/right of a centered rail; the default is a single left-aligned
// rail. Same fixed-min-height connector call as KinetixStepper's
// vertical orientation — SwiftUI's Rectangle has no cheap "stretch to
// fill the row" without a custom layout either.
//

import SwiftUI

public struct KinetixTimelineItem {
    public let title: String
    public let time: String?
    public let content: String?

    public init(title: String, time: String? = nil, content: String? = nil) {
        self.title = title
        self.time = time
        self.content = content
    }
}

public struct KinetixTimeline: View {
    @Environment(\.kinetixColors) private var colors

    private let items: [KinetixTimelineItem]
    private let alternating: Bool

    public init(items: [KinetixTimelineItem], alternating: Bool = false) {
        self.items = items
        self.alternating = alternating
    }

    public var body: some View {
        let indexed = Array(items.enumerated())
        VStack(alignment: .leading, spacing: 0) {
            ForEach(indexed, id: \.offset) { idx, item in
                if alternating {
                    alternatingRow(idx: idx, item: item, isLast: idx == items.count - 1)
                } else {
                    row(idx: idx, item: item, isLast: idx == items.count - 1)
                }
            }
        }
    }

    @ViewBuilder
    private func rail(isLast: Bool) -> some View {
        VStack(spacing: 4) {
            Circle().fill(colors.action).frame(width: 10, height: 10)
            if !isLast {
                Rectangle()
                    .fill(colors.border)
                    .frame(width: 1)
                    .frame(minHeight: 24) // fixed floor, not a dynamic stretch — see file doc
            }
        }
    }

    @ViewBuilder
    private func body(_ item: KinetixTimelineItem, alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 2) {
            if let time = item.time {
                Text(time).font(.kinetixLabelSm).foregroundStyle(colors.mutedForeground)
            }
            Text(item.title).font(.kinetixLabelMd.weight(.medium)).foregroundStyle(colors.foreground)
            if let content = item.content {
                Text(content).font(.kinetixBodySm).foregroundStyle(colors.mutedForeground)
            }
        }
    }

    @ViewBuilder
    private func row(idx: Int, item: KinetixTimelineItem, isLast: Bool) -> some View {
        HStack(alignment: .top, spacing: 12) {
            rail(isLast: isLast)
            body(item, alignment: .leading)
                .padding(.bottom, isLast ? 0 : 24)
        }
    }

    @ViewBuilder
    private func alternatingRow(idx: Int, item: KinetixTimelineItem, isLast: Bool) -> some View {
        let onRight = idx % 2 == 0
        HStack(alignment: .top, spacing: 16) {
            if onRight {
                Color.clear.frame(maxWidth: .infinity)
            } else {
                body(item, alignment: .trailing).frame(maxWidth: .infinity, alignment: .trailing)
            }
            rail(isLast: isLast)
            if onRight {
                body(item, alignment: .leading).frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Color.clear.frame(maxWidth: .infinity)
            }
        }
    }
}
