import SwiftUI
import XCTest
import KinetixUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// The "Receipt" block — see SignInBlockTests.swift for how block fixtures work.
///
/// One business-neutral receipt. A payment, booking, transfer, order or refund receipt is this block with
/// different words. Amounts arrive formatted — the block computes nothing — and Download, Print and Share are
/// callbacks: generating a PDF, printing and sharing are the product's, not the block's.
///
/// The status is a word ("Paid"), not a colour. The amount is spoken as "162.75 Saudi riyals" rather than
/// letter by letter. The receipt number is selectable text with a copy button that names what it copies,
/// and says "Copied" beside itself once the code is on the pasteboard.
///
/// Each breakdown row is combined into one element, so "VAT, 15%, SAR 19.29" is announced together rather
/// than as unrelated pieces of text at opposite ends of a row. The discount's minus sign is in the text.
///
// kx-block:start
struct ReceiptBlock: View {
    private struct Line: Identifiable {
        var id: String { label }
        let label: String
        let note: String?
        let amount: String
    }

    private static let lines = [
        Line(label: "Single-origin beans", note: "2 × SAR 62.00", amount: "SAR 124.00"),
        Line(label: "Pour-over filters", note: nil, amount: "SAR 18.00"),
        Line(label: "Member discount", note: "10% on beans", amount: "−SAR 12.40"),
        Line(label: "VAT", note: "15%", amount: "SAR 19.29"),
        Line(label: "Rounding", note: nil, amount: "+SAR 0.01"),
    ]

    private static let receiptNumber = "RCP-2026-004817"

    @State private var copied = false

    var onDownload: () -> Void = {}
    var onPrint: () -> Void = {}
    var onShare: () -> Void = {}

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        KinetixCardTitle("Harbour Coffee Roasters")
                        KinetixCardDescription("Payment receipt")
                    }
                    Spacer(minLength: 0)
                    // The status is a word, not a colour.
                    KinetixTag("Paid")
                }
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Amount paid")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        Text("SAR 162.75")
                            .font(.title.weight(.semibold))
                            .monospacedDigit()
                            .accessibilityLabel("162.75 Saudi riyals")
                    }
                    .accessibilityElement(children: .combine)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Receipt number")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        HStack(spacing: 12) {
                            Text(Self.receiptNumber)
                                .font(.system(.body, design: .monospaced).weight(.semibold))
                                .textSelection(.enabled)
                            KinetixButton(variant: .outline, size: .sm, action: copy) {
                                Text("Copy")
                            }
                            .accessibilityLabel("Copy receipt number")
                        }
                        if copied {
                            Text("Copied")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .accessibilityElement(children: .contain)

                    KinetixDescriptionList {
                        KinetixDescriptionListItem(term: "Date") { Text("14 Mar 2026, 09:42") }
                        KinetixDescriptionListItem(term: "Paid with") { Text("Visa ending 4242") }
                        KinetixDescriptionListItem(term: "Paid to", showDivider: false) {
                            Text("Harbour Coffee Roasters, Riyadh")
                        }
                    }

                    KinetixSeparator()

                    VStack(spacing: 8) {
                        ForEach(Self.lines) { line in
                            breakdownRow(line.label, note: line.note, amount: line.amount, emphasised: false)
                        }
                        KinetixSeparator()
                        breakdownRow("Total paid", note: nil, amount: "SAR 162.75", emphasised: true)
                    }
                }
            }
            KinetixCardFooter {
                KinetixButton(variant: .outline, action: onDownload) { Text("Download") }
                KinetixButton(variant: .outline, action: onPrint) { Text("Print") }
                KinetixButton(variant: .ghost, action: onShare) { Text("Share") }
            }
        }
    }

    private func breakdownRow(_ label: String, note: String?, amount: String, emphasised: Bool) -> some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .foregroundStyle(emphasised ? AnyShapeStyle(.primary) : AnyShapeStyle(.secondary))
                if let note {
                    Text(note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            // Trailing is the inline end, so the amount follows the reading direction.
            Text(amount).monospacedDigit()
        }
        .font(emphasised ? .subheadline.weight(.semibold) : .subheadline)
        // One element: "Member discount, 10% on beans, −SAR 12.40".
        .accessibilityElement(children: .combine)
    }

    private func copy() {
        #if canImport(UIKit)
        UIPasteboard.general.string = Self.receiptNumber
        #elseif canImport(AppKit)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(Self.receiptNumber, forType: .string)
        #endif
        copied = true
    }
}
// kx-block:end

final class ReceiptBlockTests: XCTestCase {
    func testReceiptBlockCompiles() {
        XCTAssertNotNil(ReceiptBlock().body)
    }
}
