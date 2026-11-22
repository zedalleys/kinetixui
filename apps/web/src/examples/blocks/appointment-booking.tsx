"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DescriptionList,
  DescriptionListItem,
  ReferenceCode,
  ResultState,
  Tag,
  TimeSlotPicker,
} from "@kinetixui/ui";

// kx-block:start
/**
 * Booking one appointment from the times a provider offers.
 *
 * This is the clinic shape of a pattern that is not clinical: a consultation, a service call, a viewing,
 * a test drive, a salon chair and a parent-teacher slot are this block with different words. What makes
 * it an industry block is not vocabulary but the information a person needs before committing to a time —
 * who they are seeing, where, how long it takes, and what the appointment costs them if they are wrong.
 * None of that is in a generic form block, which is why tagging `create-account` into a healthcare filter
 * does not give healthcare a booking block.
 *
 * The slots are a real radio group (TimeSlotPicker), so the keyboard model arrives with it: Tab enters at
 * the selected slot, arrows move across every available time and wrap, Space selects. Unavailable slots are
 * skipped by the arrows and their spoken name ends in "Unavailable", so they are not greyed-out only.
 *
 * The flow is genuinely stateful rather than a picture of one. Confirm is disabled until a time is chosen
 * — not hidden, because a disabled control that explains itself is easier to understand than one that
 * appears from nowhere — and confirming replaces the picker with a ResultState naming the time that was
 * taken. "Choose another time" returns to the picker with the choice cleared, so the block cannot be left
 * showing a confirmation for a slot the reader has since moved away from.
 *
 * The confirmation is announced through one always-mounted `role="status"` region, NOT through
 * ResultState's `announce` — see the note at that region for why a live region that mounts with its own
 * first text usually announces nothing. Status is a word in a Tag ("Telehealth"), never a colour alone.
 *
 * Times are shown exactly as supplied and the block converts nothing — `timeZoneLabel` says which zone
 * they are in, because a booking shown in the wrong zone is worse than one with no zone at all. The
 * duration and the cancellation rule sit beside the times rather than under the button, since both change
 * which time a person picks.
 *
 * Everything here is fictional: no real clinician, patient, facility or price, and the block holds, fetches
 * and releases nothing. Availability is the product's business and arrives as data.
 */

/** Morning and afternoon slots, with one taken and one nearly full — the states a real day has. */
const SLOT_GROUPS = [
  {
    label: "Morning",
    slots: [
      { value: "2026-04-07T09:00", label: "09:00" },
      { value: "2026-04-07T09:30", label: "09:30", unavailable: true },
      { value: "2026-04-07T10:15", label: "10:15" },
      { value: "2026-04-07T11:00", label: "11:00", note: "Last morning slot" },
    ],
  },
  {
    label: "Afternoon",
    slots: [
      { value: "2026-04-07T13:30", label: "13:30", unavailable: true },
      { value: "2026-04-07T14:00", label: "14:00" },
      { value: "2026-04-07T15:45", label: "15:45" },
    ],
  },
];

/** value → the words the confirmation reads back, so it never prints a raw slot id. */
const SLOT_LABEL: Record<string, string> = Object.fromEntries(
  SLOT_GROUPS.flatMap((g) => g.slots.map((s) => [s.value, s.label])),
);

export function AppointmentBookingBlock() {
  const [slot, setSlot] = React.useState<string>("");
  const [booked, setBooked] = React.useState<string | null>(null);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>Book an appointment</CardTitle>
            <CardDescription>Dr Lina Okafor · Cardiology review</CardDescription>
          </div>
          {/* A word, not a colour. */}
          <Tag variant="secondary">Telehealth</Tag>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {/*
          One always-mounted live region, holding text only once there is an outcome.

          ResultState has an `announce` prop, and it is deliberately NOT used here. Its own documentation
          scopes it to "a result that changes in place (pending → success after a poll)" — a region that
          stays mounted while its text changes. This block mounts the result instead of updating it, and a
          live region inserted together with its first text gives assistive technology no change to observe,
          so it is frequently not announced at all. Passing `announce` as well would also risk the outcome
          being read twice. The region below is in the DOM from first render, which is the condition that
          actually makes an announcement reliable.
        */}
        <p role="status" className="sr-only">
          {booked
            ? `Appointment confirmed for Tuesday 7 April 2026 at ${SLOT_LABEL[booked] ?? booked}, with Dr Lina Okafor.`
            : ""}
        </p>
        {/*
          The facts that change which time someone picks, above the times rather than below the button.
          `stacked` for the cancellation rule because it is a sentence, not a value.
        */}
        <DescriptionList>
          <DescriptionListItem term="Date">
            {/* Its own `dir="auto"` run: a Latin date opens with a digit, and in an RTL paragraph the bidi
                algorithm moves that digit to the far end — "7 Apr 2026" reads as "Apr 2026 7". */}
            <time dateTime="2026-04-07" dir="auto">
              Tuesday 7 April 2026
            </time>
          </DescriptionListItem>
          <DescriptionListItem term="Length">25 minutes</DescriptionListItem>
          <DescriptionListItem term="Joining">Video link, sent after confirmation</DescriptionListItem>
          <DescriptionListItem term="Changes" layout="stacked">
            Free to move or cancel up to 24 hours before. After that a missed-visit fee applies.
          </DescriptionListItem>
        </DescriptionList>

        {booked ? (
          <ResultState
            status="success"
            /* `start`, because this result sits inside a card rather than filling a screen. */
            align="start"
            title="Appointment confirmed"
            description={`Tuesday 7 April 2026 at ${SLOT_LABEL[booked] ?? booked}, with Dr Lina Okafor. The video link is on its way.`}
            /* The one thing a person has to quote back when they ring to move it. */
            reference={<ReferenceCode label="Booking reference" value="KX-4C19B" />}
            secondaryAction={
              <Button
                variant="Outline"
                onClick={() => {
                  setBooked(null);
                  setSlot("");
                }}
              >
                Choose another time
              </Button>
            }
          />
        ) : (
          <>
            <TimeSlotPicker
              label="Available times"
              timeZoneLabel="Times in Riyadh (GMT+3)"
              groups={SLOT_GROUPS}
              value={slot}
              onValueChange={setSlot}
              emptyMessage="No times are available on this day. Try another date."
            />
            {/*
              Disabled until a time exists, and the reason is written next to it rather than left to be
              guessed. `aria-describedby` is not needed: the sentence is the button's sibling in reading
              order and is read with it.
            */}
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!slot} onClick={() => setBooked(slot)}>
                Confirm appointment
              </Button>
              {!slot && <p className="text-body-sm text-muted-foreground">Choose a time to continue.</p>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
// kx-block:end
