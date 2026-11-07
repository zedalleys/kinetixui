import SwiftUI
import XCTest
import KinetixUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// The "Boarding pass" block — see SignInBlockTests.swift for how block fixtures work.
///
/// SwiftUI has no PassCard, so this is the same anatomy composed from the primitives it does have: a card,
/// a fact grid, a dashed tear line, the supplied code and a footer. The shared contract is the anatomy and
/// the semantics, not the component names.
///
/// Every value is supplied: the block looks nothing up, converts no time zone and encodes nothing. The code
/// below is a fixed placeholder pattern drawn on its own light quiet zone — a real pass passes in the image
/// the product or the issuer generated. The figure carries the label "Boarding pass QR code" and the readable
/// confirmation code is printed beneath it, so the pass works when the code will not scan.
///
/// The route is words ("Riyadh (RUH) to Cairo (CAI)"), not an arrow, so it reads correctly in both
/// directions. Gate, seat and group are emphasised because they are what a traveller looks for at a glance,
/// and the grid uses adaptive columns so Larger Text falls to fewer columns instead of truncating a gate.
/// Boarding status is a word in a tag. Each field is one accessibility element, so "Gate, C21" is announced
/// together rather than as two unrelated strings.
///
/// All data here is fictional, Kinetix Air included.
///
// kx-block:start
struct BoardingPassBlock: View {
    private struct Field: Identifiable {
        var id: String { label }
        let label: String
        let value: String
        let emphasised: Bool
    }

    private static let fields = [
        Field(label: "Passenger", value: "Amira Haddad", emphasised: false),
        Field(label: "Flight", value: "KX 1180", emphasised: false),
        Field(label: "Boards", value: "2 Apr, 06:15", emphasised: false),
        Field(label: "Gate", value: "C21", emphasised: true),
        Field(label: "Seat", value: "9A", emphasised: true),
        Field(label: "Group", value: "3", emphasised: true),
    ]

    private static let confirmationCode = "KX7F2Q9"

    /// A stand-in for the code the product supplies: a fixed pattern, not an encoding of anything.
    private static let codePattern = [
        "###.#.###",
        "#.#...#.#",
        "###.#.###",
        "...#.#...",
        "#.##..##.",
        "..#.#.#..",
        "###.##.#.",
        "#.#..#.##",
        "###.#.#..",
    ]

    @State private var copied = false

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        KinetixCardTitle("Boarding pass")
                        KinetixCardDescription("Kinetix Air · Riyadh (RUH) to Cairo (CAI)")
                    }
                    Spacer(minLength: 0)
                    // A word, not a colour.
                    KinetixTag("Boarding", variant: .secondary)
                }
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 16) {
                    // Adaptive columns: Larger Text falls to fewer columns rather than truncating a value.
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 112), alignment: .leading)], alignment: .leading, spacing: 12) {
                        ForEach(Self.fields) { field in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(field.label)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(field.value)
                                    .font(field.emphasised ? .title2.weight(.semibold) : .body.weight(.medium))
                                    .monospacedDigit()
                            }
                            // One element: "Gate, C21".
                            .accessibilityElement(children: .combine)
                        }
                    }

                    // The tear line between the pass and its stub.
                    KinetixSeparator()

                    VStack(spacing: 8) {
                        codeImage
                            .accessibilityElement()
                            .accessibilityLabel("Boarding pass QR code")
                        Text("Confirmation code")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        HStack(spacing: 12) {
                            Text(Self.confirmationCode)
                                .font(.system(.body, design: .monospaced).weight(.semibold))
                                .textSelection(.enabled)
                            KinetixButton(variant: .outline, size: .sm, action: copy) {
                                Text("Copy")
                            }
                            .accessibilityLabel("Copy confirmation code")
                        }
                        if copied {
                            Text("Copied")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .accessibilityElement(children: .contain)
                }
            }
            KinetixCardFooter {
                Text("The gate closes 20 minutes before departure.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    /// Drawn on an opaque white quiet zone, because a scanner needs dark modules on light — the pass never
    /// inverts the code for a dark theme.
    private var codeImage: some View {
        let modules = Self.codePattern.count
        return VStack(spacing: 0) {
            ForEach(Array(Self.codePattern.enumerated()), id: \.offset) { _, row in
                HStack(spacing: 0) {
                    ForEach(Array(row.enumerated()), id: \.offset) { _, cell in
                        Rectangle()
                            .fill(cell == "#" ? Color.black : Color.white)
                    }
                }
            }
        }
        .frame(width: CGFloat(modules) * 12, height: CGFloat(modules) * 12)
        .padding(8)
        .background(Color.white)
    }

    private func copy() {
        #if canImport(UIKit)
        UIPasteboard.general.string = Self.confirmationCode
        #elseif canImport(AppKit)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(Self.confirmationCode, forType: .string)
        #endif
        copied = true
    }
}
// kx-block:end

final class BoardingPassBlockTests: XCTestCase {
    func testBoardingPassBlockCompiles() {
        XCTAssertNotNil(BoardingPassBlock().body)
    }
}
