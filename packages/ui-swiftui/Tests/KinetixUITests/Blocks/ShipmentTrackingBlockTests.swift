import SwiftUI
import XCTest
import KinetixUI

/// The "Shipment tracking" block — see SignInBlockTests.swift for how block fixtures work.
///
/// The same contract as the web versions: the consignment's facts, the tracking number the reader will
/// quote, the ask stated once, and a history whose exception is visible as an exception.
///
/// TWO REAL DIVERGENCES, written down rather than papered over. Both are limits of this platform's
/// Timeline, not of the block, and both are recorded in M5.26's five-platform matrix:
///
///   no status      `KinetixTimelineItem` takes `title`, `time` and `content` and nothing else. There is no
///                  status rung at all here, where React's Timeline has six. So each event's state is
///                  carried by WORDS inside its own content ("Needs attention"), which is what WCAG 1.4.1
///                  asks for anyway and what the web versions also do on top of their markers.
///   no per-event   `KinetixTimeline` takes an array of value types, not views, so nothing can be embedded
///   action         in one event. React puts "Choose a new date" on the attempt that needs it; here the
///                  action sits immediately under the Inform that states the ask, which keeps the action
///                  with the reason even though it cannot sit inside the event.
///
/// Neither is fixed here: widening a published component's API is a change of its own and belongs in its
/// own slice, not inside a block fixture.
///
/// Each event is one accessibility element, so VoiceOver says "5 Apr, 18:40, Delivery attempted, nobody
/// available to sign…" as one item rather than as three loose strings.
///
/// Every time is shown exactly as supplied with its zone named. Nothing here converts a time zone: a parcel
/// scanned at 18:40 local is a different fact from 18:40 in the reader's zone.
///
/// No real carrier, consignment, address or person. Events arrive as data; the block tracks nothing.
///
// kx-block:start
struct ShipmentTrackingBlock: View {
    private struct Fact: Identifiable {
        var id: String { term }
        let term: String
        let value: String
    }

    private static let facts = [
        Fact(term: "To", value: "Rahma Suleiman, Al Olaya, Riyadh"),
        Fact(term: "Service", value: "Next day, signature required"),
        Fact(term: "Times", value: "Shown in Riyadh time (GMT+3)"),
    ]

    /// The history. "Needs attention" is part of the attempt's own content because this platform's timeline
    /// has no status — see the note above.
    private static let events = [
        KinetixTimelineItem(
            title: "Collected",
            time: "2 Apr, 09:04",
            content: "Kinetix Freight depot, Jeddah"
        ),
        KinetixTimelineItem(
            title: "In transit",
            time: "3 Apr, 21:17",
            content: "Departed sorting hub, Riyadh"
        ),
        KinetixTimelineItem(
            title: "Out for delivery",
            time: "5 Apr, 07:52",
            content: "On vehicle KX-418"
        ),
        KinetixTimelineItem(
            title: "Delivery attempted",
            time: "5 Apr, 18:40",
            content: "Needs attention. Nobody available to sign. The parcel is back at the Riyadh depot."
        ),
        KinetixTimelineItem(
            title: "Delivery",
            time: "Awaiting a date",
            content: "Signature required on arrival."
        ),
    ]

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        KinetixCardTitle("Track consignment")
                        KinetixCardDescription("Kinetix Freight · 2 parcels, 4.6 kg")
                    }
                    Spacer(minLength: 0)
                    // A word. The tone is the second channel.
                    KinetixTag("Delayed", variant: .warning)
                }
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 20) {
                    KinetixDescriptionList {
                        ForEach(Self.facts) { fact in
                            KinetixDescriptionListItem(term: fact.term) {
                                Text(fact.value)
                            }
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Tracking number")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        // The one thing a person reads out to support, so it is selectable rather than
                        // something to copy by hand off the screen.
                        Text("KXF-7731-2048")
                            .font(.system(.body, design: .monospaced).weight(.semibold))
                            .textSelection(.enabled)
                    }
                    .accessibilityElement(children: .combine)

                    VStack(alignment: .leading, spacing: 8) {
                        // The ask, once. Not a restatement of the status tag: that says what the
                        // consignment is, this says what the reader has to do.
                        KinetixInform(
                            "Delivery needs a new date. The depot holds the parcels for 5 working days.",
                            variant: .warning
                        )
                        // Kept with its reason, because it cannot be embedded in the event itself.
                        KinetixButton(variant: .primary, size: .sm, action: {}) {
                            Text("Choose a new date")
                        }
                    }

                    KinetixTimeline(items: Self.events)
                        .accessibilityLabel("Consignment history")
                }
            }
        }
    }
}
// kx-block:end

final class ShipmentTrackingBlockTests: XCTestCase {
    func testShipmentTrackingBlockCompiles() {
        XCTAssertNotNil(ShipmentTrackingBlock().body)
    }
}
