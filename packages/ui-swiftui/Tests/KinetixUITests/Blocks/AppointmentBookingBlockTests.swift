import SwiftUI
import XCTest
import KinetixUI

/// The "Appointment booking" block — see SignInBlockTests.swift for how block fixtures work.
///
/// SwiftUI has no TimeSlotPicker, so the slots are composed from `KinetixRadioGroup` and
/// `KinetixRadioButton`. That is the same contract, not a substitute: choosing one time of several is a
/// single-selection group on every platform, and what differs is the mechanism. The group carries an
/// accessibility label so VoiceOver does not announce it as an unnamed group.
///
/// What this platform has to state for itself, written out rather than skipped:
///
///   one element per slot   `.accessibilityElement(children: .combine)` plus `.isButton`, so a slot is
///                          announced as "09:00, 2 of 7" rather than as a radio and a label that happen to
///                          sit together.
///   selected               `.accessibilityAddTraits(.isSelected)` — the filled tile is the visual channel
///                          and the trait is the spoken one. A tint alone says nothing to VoiceOver.
///   unavailable            the tile is not tappable, is struck through, AND its accessibility value ends
///                          with the word "Unavailable". A dimmed tile with no word is announced only as
///                          "dimmed".
///   period                 Morning and Afternoon are headings inside the one group, so the group stays one
///                          choice rather than becoming two.
///
/// The flow is real state. Confirm is disabled until a time is chosen and the reason sits beside it.
/// Confirming replaces the picker with the outcome, and because SwiftUI has no ResultState the outcome is
/// posted to VoiceOver explicitly with `AccessibilityNotification.Announcement` — a view that merely appears
/// is not announced, which is the same trap the React and Angular versions each handle in their own way.
///
/// Larger Text falls to fewer, wider tiles through adaptive columns rather than truncating a time.
///
/// Everything below is fictional: no real clinician, patient, facility or price. Availability arrives as
/// data; the block holds, fetches and releases nothing.
///
// kx-block:start
struct AppointmentBookingBlock: View {
    private struct Slot: Identifiable {
        var id: String { value }
        let value: String
        let label: String
        let unavailable: Bool
        let note: String?
    }

    private struct Period: Identifiable {
        var id: String { label }
        let label: String
        let slots: [Slot]
    }

    private static let periods = [
        Period(label: "Morning", slots: [
            Slot(value: "2026-04-07T09:00", label: "09:00", unavailable: false, note: nil),
            Slot(value: "2026-04-07T09:30", label: "09:30", unavailable: true, note: nil),
            Slot(value: "2026-04-07T10:15", label: "10:15", unavailable: false, note: nil),
            Slot(value: "2026-04-07T11:00", label: "11:00", unavailable: false, note: "Last morning slot"),
        ]),
        Period(label: "Afternoon", slots: [
            Slot(value: "2026-04-07T13:30", label: "13:30", unavailable: true, note: nil),
            Slot(value: "2026-04-07T14:00", label: "14:00", unavailable: false, note: nil),
            Slot(value: "2026-04-07T15:45", label: "15:45", unavailable: false, note: nil),
        ]),
    ]

    private static let facts: [(term: String, value: String, stacked: Bool)] = [
        (term: "Date", value: "Tuesday 7 April 2026", stacked: false),
        (term: "Length", value: "25 minutes", stacked: false),
        (term: "Joining", value: "Video link, sent after confirmation", stacked: false),
        (
            term: "Changes",
            value: "Free to move or cancel up to 24 hours before. After that a missed-visit fee applies.",
            stacked: true
        ),
    ]

    @State private var selected: String?
    @State private var booked: String?

    private var bookedLabel: String {
        guard let booked else { return "" }
        return Self.periods.flatMap(\.slots).first { $0.value == booked }?.label ?? booked
    }

    var body: some View {
        KinetixCard {
            KinetixCardHeader {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        KinetixCardTitle("Book an appointment")
                        KinetixCardDescription("Dr Lina Okafor · Cardiology review")
                    }
                    Spacer(minLength: 0)
                    // A word, not a colour.
                    KinetixTag("Telehealth", variant: .secondary)
                }
            }
            KinetixCardContent {
                VStack(alignment: .leading, spacing: 20) {
                    KinetixDescriptionList {
                        ForEach(Self.facts, id: \.term) { fact in
                            KinetixDescriptionListItem(term: fact.term, layout: fact.stacked ? .stacked : .row) {
                                Text(fact.value)
                            }
                        }
                    }

                    if booked != nil {
                        outcome
                    } else {
                        picker
                        confirmRow
                    }
                }
            }
        }
    }

    private var picker: some View {
        VStack(alignment: .leading, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Available times").font(.subheadline.weight(.medium))
                // Shown, never converted: a time in the wrong zone is worse than one with no zone.
                Text("Times in Riyadh (GMT+3)").font(.footnote).foregroundStyle(.secondary)
            }
            KinetixRadioGroup(accessibilityLabel: "Available times, times in Riyadh GMT+3") {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(Self.periods) { period in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(period.label)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .accessibilityAddTraits(.isHeader)
                            LazyVGrid(
                                columns: [GridItem(.adaptive(minimum: 104), alignment: .leading)],
                                alignment: .leading,
                                spacing: 8
                            ) {
                                ForEach(period.slots) { slot in
                                    tile(slot)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func tile(_ slot: Slot) -> some View {
        let isSelected = selected == slot.value
        return HStack(alignment: .firstTextBaseline, spacing: 8) {
            KinetixRadioButton(isSelected: isSelected) {
                selected = slot.value
            }
            .disabled(slot.unavailable)
            VStack(alignment: .leading, spacing: 2) {
                Text(slot.label)
                    .font(.body.weight(.medium))
                    .monospacedDigit()
                    .strikethrough(slot.unavailable)
                    .foregroundStyle(slot.unavailable ? .secondary : .primary)
                if let note = slot.note {
                    Text(note).font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            guard !slot.unavailable else { return }
            selected = slot.value
        }
        // `.ignore`, not `.combine`. The row holds a real control, and combining it would leave the merged
        // element with two activation paths — the radio's and the row's — and no way to say which wins.
        // Ignoring the children and declaring the label, value, traits and action here makes the tile
        // exactly one element with exactly one activation.
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(slot.label)
        // The WORD, not only the strike-through: a dimmed tile with no word is announced as "dimmed".
        .accessibilityValue(slot.unavailable ? "Unavailable" : (slot.note ?? ""))
        .accessibilityAddTraits(isSelected && !slot.unavailable ? [.isButton, .isSelected] : [.isButton])
        .accessibilityAction {
            guard !slot.unavailable else { return }
            selected = slot.value
        }
    }

    private var confirmRow: some View {
        HStack(spacing: 12) {
            KinetixButton(variant: .primary, action: { booked = selected }) {
                Text("Confirm appointment")
            }
            .disabled(selected == nil)
            if selected == nil {
                // The reason is written next to the disabled control rather than left to be guessed.
                Text("Choose a time to continue.").font(.footnote).foregroundStyle(.secondary)
            }
        }
    }

    private var outcome: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Appointment confirmed").font(.headline)
            Text("Tuesday 7 April 2026 at \(bookedLabel), with Dr Lina Okafor. The video link is on its way.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("Booking reference KX-4C19B")
                .font(.system(.footnote, design: .monospaced))
                .textSelection(.enabled)
            KinetixButton(variant: .outline, action: {
                booked = nil
                selected = nil
            }) {
                Text("Choose another time")
            }
        }
        .accessibilityElement(children: .contain)
        .onAppear {
            // A view that merely appears is not announced. Post it, once, when the outcome arrives.
            #if canImport(UIKit)
            AccessibilityNotification.Announcement(
                "Appointment confirmed for Tuesday 7 April 2026 at \(bookedLabel), with Dr Lina Okafor."
            ).post()
            #endif
        }
    }
}
// kx-block:end

final class AppointmentBookingBlockTests: XCTestCase {
    func testAppointmentBookingBlockCompiles() {
        XCTAssertNotNil(AppointmentBookingBlock().body)
    }
}
