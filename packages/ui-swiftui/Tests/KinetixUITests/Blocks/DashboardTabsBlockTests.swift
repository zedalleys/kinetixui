import SwiftUI
import XCTest
import KinetixUI

/// The "Dashboard tabs" block — see SignInBlockTests.swift for how block fixtures work.
///
/// The chart's box is reserved with `KinetixAspectRatio` before the chart exists. Without it the panel is
/// short, then grows when the data lands, and everything under it jumps — including whatever the reader was
/// about to tap. That is a layout-stability bug, not a styling preference, and it is worse on a phone where
/// the jump is most of the screen.
///
/// Accessibility: the tab strip is one container, each tab carries `.isSelected`, and the trend on each
/// metric is stated in words by `KinetixMetric` rather than being carried by colour and an arrow alone.
///
// kx-block:start
struct DashboardTabsBlock: View {
    private struct Panel: Identifiable {
        let id: String
        let label: String
        let caption: String
        let metrics: [(label: String, value: String, trend: KinetixMetricTrend, change: String)]
    }

    private static let panels = [
        Panel(
            id: "overview",
            label: "Overview",
            caption: "Sessions, last 30 days",
            metrics: [
                ("Sessions", "48,271", .up, "+12.4%"),
                ("Sign-ups", "1,204", .up, "+3.1%"),
                ("Churn", "1.8%", .down, "−0.4%"),
            ]
        ),
        Panel(
            id: "traffic",
            label: "Traffic",
            caption: "Sources, last 30 days",
            metrics: [
                ("Direct", "21,904", .up, "+8.0%"),
                ("Search", "18,442", .up, "+15.2%"),
                ("Referral", "7,925", .neutral, "0.0%"),
            ]
        ),
    ]

    @State private var tab = "overview"

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            KinetixTabsList {
                ForEach(Self.panels) { panel in
                    KinetixTabsTrigger(panel.label, isSelected: tab == panel.id) { tab = panel.id }
                }
            }

            if let panel = Self.panels.first(where: { $0.id == tab }) {
                KinetixTabsContent {
                    VStack(spacing: 16) {
                        // One column, not three: three metric cards side by side on a phone is three
                        // unreadable columns. The web version's grid is the same information, not the same
                        // geometry.
                        ForEach(panel.metrics, id: \.label) { metric in
                            KinetixMetric(
                                label: metric.label,
                                value: metric.value,
                                trend: metric.trend,
                                change: metric.change
                            )
                        }

                        KinetixAspectRatio(16.0 / 9.0) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4]))
                                    .foregroundStyle(.secondary)
                                Text(panel.caption)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
    }
}
// kx-block:end

final class DashboardTabsBlockTests: XCTestCase {
    func testDashboardTabsBlockCompiles() {
        XCTAssertNotNil(DashboardTabsBlock().body)
    }
}
