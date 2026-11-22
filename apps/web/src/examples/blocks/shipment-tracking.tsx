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
  Inform,
  ReferenceCode,
  Tag,
  Timeline,
} from "@kinetixui/ui";

// kx-block:start
/**
 * Where a consignment is, what happened to it, and what the reader has to do about it.
 *
 * Tracking is the logistics face of a general pattern — a repair, a visa application, a claim, a transfer
 * or an onboarding case has the same anatomy — but the content is specific in a way a generic status list
 * is not. A delivery that failed is not just a step with a red dot: it changes who has to act, and a
 * tracking block that cannot say so is a decoration. That is modelled here rather than drawn:
 *
 *   the exception is the LAST event, and it is `warning`, not `error`
 *       the parcel is not lost; an attempt failed. A timeline that calls every problem a failure teaches
 *       readers to ignore it.
 *   the exception carries the action
 *       Timeline's `action` slot puts "Choose a new date" on the event that needs it, so the thing to do
 *       sits with the reason, not at the bottom of the card away from its cause.
 *   the step after it is `pending`, not absent
 *       delivery has not been cancelled, so hiding it would misreport the state.
 *   the banner repeats the ask, and nothing else
 *       Inform states what is required of the reader once, above the history. It is not a second copy of
 *       the status.
 *
 * Status is a word in a Tag ("Delayed"), and each timeline event's state is spoken through Timeline's own
 * status labels — so "Needs attention" is announced, not inferred from a colour. The rail, the markers and
 * the text are all logical, so the whole thing mirrors under `dir="rtl"` with no direction prop.
 *
 * Every time is shown exactly as supplied with its zone named. Nothing here converts a time zone: a parcel
 * scanned at 18:40 local is a different fact from 18:40 in the reader's zone, and quietly choosing one is
 * how a tracking page starts lying.
 *
 * The one thing a person reads out to support is the tracking number, so it is a `ReferenceCode` whose copy
 * reports whether it actually copied, rather than a span the reader has to select by hand.
 *
 * No real carrier, consignment, address or person. The block tracks nothing and fetches nothing: events
 * arrive as data.
 */

const EVENTS = [
  {
    time: "2 Apr, 09:04",
    title: "Collected",
    content: "Kinetix Freight depot, Jeddah",
    status: "complete" as const,
  },
  {
    time: "3 Apr, 21:17",
    title: "In transit",
    content: "Departed sorting hub, Riyadh",
    status: "complete" as const,
  },
  {
    time: "5 Apr, 07:52",
    title: "Out for delivery",
    content: "On vehicle KX-418",
    status: "complete" as const,
  },
  {
    time: "5 Apr, 18:40",
    title: "Delivery attempted",
    /* The reason, in the words of what actually happened — not "exception". */
    content: "Nobody available to sign. The parcel is back at the Riyadh depot.",
    /* `warning`, not `error`: the consignment is intact and the next step is the reader's. */
    status: "warning" as const,
    action: <Button size="sm">Choose a new date</Button>,
  },
  {
    time: "Awaiting a date",
    title: "Delivery",
    content: "Signature required on arrival.",
    /* Still pending, because nothing has been cancelled. */
    status: "pending" as const,
  },
];

export function ShipmentTrackingBlock() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>Track consignment</CardTitle>
            <CardDescription>Kinetix Freight · 2 parcels, 4.6 kg</CardDescription>
          </div>
          {/* A word. The tone is the second channel. */}
          <Tag variant="warning">Delayed</Tag>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <DescriptionList>
          <DescriptionListItem term="To">Rahma Suleiman, Al Olaya, Riyadh</DescriptionListItem>
          <DescriptionListItem term="Service">Next day, signature required</DescriptionListItem>
          <DescriptionListItem term="Times">Shown in Riyadh time (GMT+3)</DescriptionListItem>
        </DescriptionList>

        <ReferenceCode label="Tracking number" value="KXF-7731-2048" />

        {/*
          The ask, once, above the history. Not a restatement of the status tag: that says what the
          consignment is, this says what the reader has to do.
        */}
        <Inform variant="warning">
          Delivery needs a new date. The depot holds the parcels for 5 working days.
        </Inform>

        {/*
          `aria-label` because the list is the page's history and its heading is the card title, which
          also names the facts above it.
        */}
        <Timeline items={EVENTS} aria-label="Consignment history" />
      </CardContent>
    </Card>
  );
}
// kx-block:end
