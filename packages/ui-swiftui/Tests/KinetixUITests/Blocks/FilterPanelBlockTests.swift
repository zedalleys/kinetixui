import SwiftUI
import XCTest
import KinetixUI

/// The "Filter panel" block — see SignInBlockTests.swift for how block fixtures work.
///
/// The active filters appear as tags AND as ticked rows: the same fact, shown twice, on purpose. The tags are
/// the fast way to undo one thing; the rows are the full set. Both drive one piece of state, because two
/// lists that can disagree is the classic bug in this pattern.
///
/// `KinetixTag` names its dismiss control after the tag, so a row of tags announces "Remove In stock" rather
/// than three identical "Remove" buttons.
///
/// The price is visible beside the slider rather than in a bubble on the thumb: a value that only appears
/// while dragging cannot be read by anyone who is not dragging, including VoiceOver.
///
// kx-block:start
struct FilterPanelBlock: View {
    private struct Option: Identifiable {
        let id: String
        let label: String
    }

    private static let options = [
        Option(id: "stock", label: "In stock"),
        Option(id: "sale", label: "On sale"),
        Option(id: "shipping", label: "Free shipping"),
    ]

    @State private var price: Double = 250
    @State private var active: Set<String> = ["stock"]

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                HStack {
                    KinetixCardTitle("Filters")
                    Spacer()
                    KinetixButton(variant: .ghost, size: .sm, action: { active = [] }) {
                        Text("Clear all")
                    }
                    .disabled(active.isEmpty)
                }
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 20) {
                    if !active.isEmpty {
                        HStack(spacing: 8) {
                            ForEach(Self.options.filter { active.contains($0.id) }) { option in
                                KinetixTag(option.label, variant: .secondary) {
                                    active.remove(option.id)
                                }
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        HStack(alignment: .firstTextBaseline) {
                            KinetixLabel("Maximum price")
                            Spacer()
                            Text("$\(Int(price))")
                                .font(.subheadline)
                                .monospacedDigit()
                                .foregroundStyle(.secondary)
                        }
                        KinetixSlider(value: $price, in: 0...500, step: 10)
                            .accessibilityLabel("Maximum price")
                            .accessibilityValue("$\(Int(price))")
                    }

                    KinetixSeparator()

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Availability")
                            .font(.subheadline.weight(.medium))
                        ForEach(Self.options) { option in
                            HStack(spacing: 12) {
                                KinetixCheckbox(isOn: binding(for: option.id))
                                Text(option.label)
                            }
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
            }
        }
    }

    private func binding(for id: String) -> Binding<Bool> {
        Binding(
            get: { active.contains(id) },
            set: { isOn in
                if isOn { active.insert(id) } else { active.remove(id) }
            }
        )
    }
}
// kx-block:end

final class FilterPanelBlockTests: XCTestCase {
    func testFilterPanelBlockCompiles() {
        XCTAssertNotNil(FilterPanelBlock().body)
    }
}
