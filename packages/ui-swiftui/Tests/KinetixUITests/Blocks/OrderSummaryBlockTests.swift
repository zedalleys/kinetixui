import SwiftUI
import XCTest
import KinetixUI

/// The "Order summary" block — see SignInBlockTests.swift for how block fixtures work.
///
/// Each quantity stepper is named after its own line item. Two steppers that both announce "Quantity" leave a
/// VoiceOver user changing the count of something they cannot identify — the most common defect in a cart.
///
/// "Free" is a word, so shipping says "Free" rather than leaving $0.00 to be inferred.
///
/// The totals rows are combined into one element each, so "Total" and its amount are announced together
/// rather than as two unrelated pieces of text at opposite ends of a row.
///
// kx-block:start
struct OrderSummaryBlock: View {
    private struct Item: Identifiable {
        let id: String
        let name: String
        let unit: Double
    }

    private static let items = [
        Item(id: "tee", name: "Kinetix T-shirt", unit: 28),
        Item(id: "stickers", name: "Sticker pack", unit: 6),
    ]

    @State private var quantities = ["tee": 2, "stickers": 1]
    @State private var promo = ""

    var onPlaceOrder: () -> Void = {}
    var onApplyPromo: () -> Void = {}

    private var subtotal: Double {
        Self.items.reduce(0) { $0 + $1.unit * Double(quantities[$1.id] ?? 0) }
    }
    private var shipping: Double { subtotal > 50 || subtotal == 0 ? 0 : 5 }

    private func money(_ amount: Double) -> String { String(format: "$%.2f", amount) }

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                KinetixCardTitle("Order summary")
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(Self.items) { item in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name)
                                Text("\(money(item.unit)) each")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            KinetixNumberInput(value: binding(for: item.id), in: 0...99)
                                .accessibilityLabel("Quantity, \(item.name)")
                        }
                    }

                    KinetixSeparator()

                    KinetixField {
                        KinetixFieldLabel("Promo code")
                        HStack(spacing: 8) {
                            KinetixInput(text: $promo, placeholder: "KINETIX10")
                            KinetixButton(variant: .outline, action: onApplyPromo) { Text("Apply") }
                        }
                    }

                    KinetixSeparator()

                    VStack(spacing: 8) {
                        totalRow("Subtotal", money(subtotal), emphasised: false)
                        totalRow("Shipping", shipping == 0 ? "Free" : money(shipping), emphasised: false)
                        totalRow("Total", money(subtotal + shipping), emphasised: true)
                    }
                }
            }
            KinetixCardFooter {
                KinetixButton(action: onPlaceOrder) {
                    Text("Place order").frame(maxWidth: .infinity)
                }
                .disabled(subtotal == 0)
            }
        }
    }

    private func totalRow(_ label: String, _ amount: String, emphasised: Bool) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(emphasised ? AnyShapeStyle(.primary) : AnyShapeStyle(.secondary))
            Spacer()
            Text(amount).monospacedDigit()
        }
        .font(emphasised ? .subheadline.weight(.medium) : .subheadline)
        // One element: "Total, $62.00", not two unrelated strings at opposite ends of a row.
        .accessibilityElement(children: .combine)
    }

    private func binding(for id: String) -> Binding<Int> {
        Binding(
            get: { quantities[id] ?? 0 },
            set: { quantities[id] = $0 }
        )
    }
}
// kx-block:end

final class OrderSummaryBlockTests: XCTestCase {
    func testOrderSummaryBlockCompiles() {
        XCTAssertNotNil(OrderSummaryBlock().body)
    }
}
