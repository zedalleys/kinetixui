import SwiftUI
import XCTest
import KinetixUI

/// The "Pricing tier" block — see SignInBlockTests.swift for how block fixtures work.
///
/// The feature list uses a checkmark from SF Symbols, which is the platform's own icon set rather than a
/// bundled one. It is `accessibilityHidden` because "included" is what the list already means; announcing
/// "checkmark" before every row would add four words and no information.
///
/// The web card is capped at `max-w-xs` so several tiers sit side by side. Here the card fills its container:
/// on a phone, tiers are a page or a paged scroll, not a row, and a fixed narrow card in the middle of a
/// screen looks like a mistake rather than a layout.
///
// kx-block:start
struct PricingTierBlock: View {
    private let features = ["Unlimited projects", "Priority support", "Custom domains", "Analytics"]

    var onUpgrade: () -> Void = {}

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                HStack {
                    KinetixBadge("Most popular", variant: .subtle)
                    Spacer()
                }
                KinetixCardTitle("Pro")
                KinetixCardDescription("For growing teams.")
                HStack(alignment: .firstTextBaseline, spacing: 0) {
                    Text("$29").font(.largeTitle).fontWeight(.semibold)
                    Text("/mo").font(.body).foregroundStyle(.secondary)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("29 dollars per month")
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(features, id: \.self) { feature in
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark")
                                .font(.footnote)
                                .accessibilityHidden(true)
                            Text(feature).font(.subheadline)
                        }
                    }
                }
            }
            KinetixCardFooter {
                KinetixButton(action: onUpgrade) {
                    Text("Upgrade to Pro").frame(maxWidth: .infinity)
                }
            }
        }
    }
}
// kx-block:end

final class PricingTierBlockTests: XCTestCase {
    func testPricingTierBlockCompiles() {
        XCTAssertNotNil(PricingTierBlock().body)
    }
}
