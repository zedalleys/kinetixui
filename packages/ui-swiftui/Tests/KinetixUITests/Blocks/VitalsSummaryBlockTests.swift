import SwiftUI
import XCTest
import KinetixUI

/// The "Observations summary" block — see SignInBlockTests.swift for how block fixtures work.
///
/// The same contract as the web versions, composed from what SwiftUI has. There is no `<dl>` here, and the
/// pairing that a description list gives the web is done the way this platform does it: each reading is one
/// accessibility element whose label is the measurement's name and whose value is the reading, its unit and
/// its status. VoiceOver then says "Blood pressure, 148 over 92 millimetres of mercury, High" as one item
/// instead of six loose strings, which is the contract — a label bound to its value — rather than the
/// markup.
///
/// Two platform-specific obligations, written out rather than skipped:
///
///   spoken units   "mmHg" and "°C" are read as letters by VoiceOver. `accessibilityValue` spells them
///                  ("millimetres of mercury", "degrees Celsius") while the visible text keeps the symbol,
///                  because a nurse reading the screen wants the symbol and a nurse listening wants the
///                  word. The web versions get this from the reader's own pronunciation dictionary.
///   not a table    this is a reading panel, not a data table, so it is a grid of elements rather than
///                  `KinetixTable`. A table would promise column and row navigation that means nothing
///                  here, where every row has the same two columns.
///
/// The block never decides what is abnormal. Ranges and the status word arrive as data, because "normal" is
/// the care team's, agronomist's or engineer's judgement.
///
/// Larger Text falls to fewer, wider columns through adaptive columns rather than truncating a measurement:
/// a clipped reading is a wrong reading.
///
/// Every reading, person, device and facility below is invented. No real patient record and no clinical
/// advice; the block fetches nothing.
///
// kx-block:start
struct VitalsSummaryBlock: View {
    private struct Reading: Identifiable {
        var id: String { label }
        let label: String
        let value: String
        /// The symbol, as it is shown.
        let unit: String
        /// The same unit in words, for VoiceOver.
        let spokenUnit: String
        let range: String
        /// Empty when the reading is inside its range and needs no tag.
        let status: String
    }

    private static let readings = [
        Reading(label: "Blood pressure", value: "148/92", unit: "mmHg", spokenUnit: "millimetres of mercury",
                range: "90/60 to 120/80", status: "High"),
        Reading(label: "Heart rate", value: "76", unit: "bpm", spokenUnit: "beats per minute",
                range: "60 to 100", status: ""),
        Reading(label: "Temperature", value: "37.1", unit: "°C", spokenUnit: "degrees Celsius",
                range: "36.1 to 37.2", status: ""),
        Reading(label: "Oxygen saturation", value: "94", unit: "%", spokenUnit: "percent",
                range: "95 to 100", status: "Low"),
        Reading(label: "Respiratory rate", value: "18", unit: "breaths/min", spokenUnit: "breaths per minute",
                range: "12 to 20", status: ""),
        Reading(label: "Weight", value: "81.4", unit: "kg", spokenUnit: "kilograms",
                range: "Recorded, not ranged", status: ""),
    ]

    private static var outside: Int {
        readings.filter { !$0.status.isEmpty }.count
    }

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        KinetixCardTitle("Observations")
                        // Freshness and source before the values, because a panel of stale numbers looks
                        // exactly like a live one.
                        KinetixCardDescription("Recorded 7 Apr 2026, 08:12 · Ward round, bedside monitor")
                    }
                    Spacer(minLength: 0)
                    KinetixTag("Nurse-recorded", variant: .secondary)
                }
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 16) {
                    LazyVGrid(
                        columns: [GridItem(.adaptive(minimum: 220), alignment: .leading)],
                        alignment: .leading,
                        spacing: 16
                    ) {
                        ForEach(Self.readings) { reading in
                            row(reading)
                        }
                    }
                    Text("\(Self.outside) of \(Self.readings.count) outside their reference range. Ranges are set by the care team.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func row(_ reading: Reading) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(reading.label)
                .font(.footnote)
                .foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("\(reading.value) \(reading.unit)")
                    .font(.title3.weight(.medium))
                    .monospacedDigit()
                // A word first. The tag's tone is the second channel, never the only one.
                if !reading.status.isEmpty {
                    KinetixTag(reading.status, variant: .warning)
                }
            }
            // Printed in full, so the judgement can be checked rather than trusted.
            Text("Reference: \(reading.range)")
                .font(.footnote)
                .foregroundStyle(.secondary)
            KinetixSeparator()
        }
        // `.ignore`: the visible text uses symbols and the spoken value uses words, so the two cannot be
        // the same strings and combining the children would read the symbols aloud.
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(reading.label)
        .accessibilityValue(spokenValue(reading))
    }

    /// The reading as it should be heard: spelled unit, the status word, then the range.
    private func spokenValue(_ reading: Reading) -> String {
        var parts = ["\(reading.value) \(reading.spokenUnit)"]
        if !reading.status.isEmpty { parts.append(reading.status) }
        parts.append("reference \(reading.range)")
        return parts.joined(separator: ", ")
    }
}
// kx-block:end

final class VitalsSummaryBlockTests: XCTestCase {
    func testVitalsSummaryBlockCompiles() {
        XCTAssertNotNil(VitalsSummaryBlock().body)
    }
}
