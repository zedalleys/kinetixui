//
// Chart.swift — KinetixChart.
//
// Mirrors packages/ui/src/components/chart.tsx (a recharts theming
// shell). Where the Compose port deferred this pending a charting-library
// decision, SwiftUI ships a system one — the `Charts` framework (iOS 16 /
// macOS 13, this package's floor) — so this is a thin themed wrapper over
// it: `[KinetixChartPoint]` (label, value, series) rendered as bar / line
// / area, coloured from the `--chart-1…5` token palette
// (`KinetixColors.chart`).
//

import SwiftUI
import Charts

public enum KinetixChartKind {
    case bar, line, area
}

public struct KinetixChartPoint: Identifiable {
    public let id = UUID()
    public let label: String
    public let value: Double
    public let series: String

    public init(label: String, value: Double, series: String = "Series") {
        self.label = label
        self.value = value
        self.series = series
    }
}

public struct KinetixChart: View {
    @Environment(\.kinetixColors) private var colors

    private let points: [KinetixChartPoint]
    private let kind: KinetixChartKind
    private let showLegend: Bool

    public init(_ points: [KinetixChartPoint], kind: KinetixChartKind = .bar, showLegend: Bool = false) {
        self.points = points
        self.kind = kind
        self.showLegend = showLegend
    }

    private var seriesNames: [String] {
        var seen = Set<String>()
        return points.compactMap { seen.insert($0.series).inserted ? $0.series : nil }
    }

    public var body: some View {
        Chart(points) { point in
            switch kind {
            case .bar:
                BarMark(
                    x: .value("Label", point.label),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(by: .value("Series", point.series))
            case .line:
                LineMark(
                    x: .value("Label", point.label),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(by: .value("Series", point.series))
            case .area:
                AreaMark(
                    x: .value("Label", point.label),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(by: .value("Series", point.series))
            }
        }
        .chartForegroundStyleScale(
            domain: seriesNames,
            range: Array(colors.chart.prefix(max(1, seriesNames.count)))
        )
        .chartLegend(showLegend ? .visible : .hidden)
    }
}
