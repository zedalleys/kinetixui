import SwiftUI
import XCTest
import KinetixUI

/// The "Stat cards" block — see SignInBlockTests.swift for how block fixtures work.
///
/// The web version is a responsive grid that goes three-up on a wide screen. A `LazyVGrid` with an adaptive
/// column does the same job here and reflows on rotation and on iPad without a breakpoint anywhere: the
/// shared intent is a row of comparable metrics, not a column count.
///
/// No icons. The web cards carry a small decorative glyph; SF Symbols would be the idiomatic equivalent, but
/// the label already names the metric, so the glyph would be announced redundantly or hidden entirely. Left
/// out rather than added for visual parity.
///
/// Accessibility: each metric is combined into one element, so VoiceOver reads "Revenue, $45,231, up 12.5%"
/// as a unit rather than as three unrelated fragments — and the direction is in the text, not only in the
/// colour of the change.
///
// kx-block:start
struct StatCardsBlock: View {
    private let columns = [GridItem(.adaptive(minimum: 160), spacing: 16)]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            KinetixMetric(label: "Revenue", value: "$45,231", trend: .up, change: "12.5%")
            KinetixMetric(label: "Active users", value: "2,420", trend: .up, change: "8.1%")
            KinetixMetric(label: "Churn", value: "1.2%", trend: .down, change: "0.3%")
        }
    }
}
// kx-block:end

final class StatCardsBlockTests: XCTestCase {
    func testStatCardsBlockCompiles() {
        XCTAssertNotNil(StatCardsBlock().body)
    }
}
