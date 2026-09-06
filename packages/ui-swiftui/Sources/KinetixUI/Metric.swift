//
// Metric.swift — KinetixMetric.
//
// Mirrors packages/ui/src/components/metric.tsx: a stat / KPI card
// (label, value, optional trend + change, optional icon slot). Trend
// arrows are the `arrow.up` / `arrow.down` SF Symbols. The `chart` slot
// isn't ported — there's no KinetixChart in this package; compose your
// own below the metric.
//

import SwiftUI

public enum KinetixMetricTrend {
    case up, down, neutral
}

public struct KinetixMetric<Icon: View>: View {
    @Environment(\.kinetixColors) private var colors

    private let label: String
    private let value: String
    private let trend: KinetixMetricTrend?
    private let change: String?
    private let icon: Icon

    public init(
        label: String,
        value: String,
        trend: KinetixMetricTrend? = nil,
        change: String? = nil,
        @ViewBuilder icon: () -> Icon
    ) {
        self.label = label
        self.value = value
        self.trend = trend
        self.change = change
        self.icon = icon()
    }

    private var trendColor: Color {
        switch trend {
        case .up:   return colors.success
        case .down: return colors.destructive
        default:    return colors.mutedForeground
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(label)
                    .font(.system(size: 13))
                    .foregroundStyle(colors.mutedForeground)
                Spacer()
                icon.foregroundStyle(colors.mutedForeground)
            }
            HStack(alignment: .bottom) {
                Text(value)
                    .font(.kinetixTitleLg.weight(.medium))
                    .foregroundStyle(colors.foreground)
                Spacer()
                if let trend {
                    HStack(spacing: 2) {
                        if trend != .neutral {
                            Image(systemName: trend == .up ? "arrow.up" : "arrow.down")
                                .font(.kinetixLabelMd)
                        }
                        if let change {
                            Text(change).font(.kinetixLabelMd)
                        }
                    }
                    .foregroundStyle(trendColor)
                }
            }
        }
        .padding(16) // p-4
        .background(colors.background, in: RoundedRectangle(cornerRadius: 8, style: .continuous)) // radius/md
        .overlay {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(colors.input, lineWidth: 1)
        }
    }
}

public extension KinetixMetric where Icon == EmptyView {
    /// No icon slot.
    init(
        label: String,
        value: String,
        trend: KinetixMetricTrend? = nil,
        change: String? = nil
    ) {
        self.init(label: label, value: value, trend: trend, change: change) { EmptyView() }
    }
}
