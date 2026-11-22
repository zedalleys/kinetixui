"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Tag,
} from "@kinetixui/ui";

// kx-block:start
/**
 * A set of monitored readings against the range they are judged by.
 *
 * Clinical in its words, general in its anatomy: a soil-moisture panel, a water-quality readout, a battery
 * bank's cells or a machine's temperatures are the same block. Every one of them needs the four things a
 * bare number cannot carry — what was measured, against which range, how fresh it is, and where it came
 * from. A `stat-cards` block has none of those, which is why a KPI grid is not a readings panel however it
 * is labelled.
 *
 * The block never decides what is abnormal. Ranges arrive as data and the status word arrives with the
 * reading, because "normal" is the product's clinical, agronomic or engineering judgement and a design
 * system that guessed it would be wrong in someone's domain. The same rule the planned `VitalSign`
 * component carries in the roadmap: "the component never decides what is abnormal".
 *
 * Reading it without sight, and reading it as data:
 *
 *   Each reading is a `<dl>` row, so the label and the value are programmatically paired rather than being
 *   two pieces of text that happen to sit together. The status is a WORD in a Tag beside the value — a
 *   reading that is out of range says "High", it does not merely turn amber — and the range is printed in
 *   full, so the judgement can be checked rather than trusted. That written structure IS this block's
 *   data equivalent: there is no chart here, so there is nothing that needs a text alternative beside it.
 *
 * Bidi, which this repository has been bitten by: a value and its unit are two runs, digits being `EN`
 * and "mmHg" or "°C" strong LTR, so in an RTL paragraph the bidi algorithm sends the unit to the wrong
 * side and "37.1 °C" reads as "°C 37.1". Each value is wrapped in `<bdi dir="ltr">` to isolate it. Note
 * what is NOT isolated: "2 of 6 outside range" in the footer is a count followed by translatable words,
 * and pinning that LTR would hold an Arabic word in Latin reading order.
 *
 * Freshness is stated rather than implied. A readings panel whose numbers are an hour old looks exactly
 * like one that is live, so the time and the source are in the header where they are read before the
 * values, not in small print underneath them.
 *
 * Every reading, person, device and facility below is invented. No real patient record, no clinical advice,
 * and the block fetches nothing.
 */

type Reading = {
  label: string;
  value: string;
  unit: string;
  /** Printed in full so the judgement can be checked. */
  range: string;
  /** The product's judgement, in a word. `null` is in range and needs no tag. */
  status: { word: string; tone: "warning" | "destructive" } | null;
};

const READINGS: Reading[] = [
  { label: "Blood pressure", value: "148/92", unit: "mmHg", range: "90/60 to 120/80", status: { word: "High", tone: "warning" } },
  { label: "Heart rate", value: "76", unit: "bpm", range: "60 to 100", status: null },
  { label: "Temperature", value: "37.1", unit: "°C", range: "36.1 to 37.2", status: null },
  { label: "Oxygen saturation", value: "94", unit: "%", range: "95 to 100", status: { word: "Low", tone: "warning" } },
  { label: "Respiratory rate", value: "18", unit: "breaths/min", range: "12 to 20", status: null },
  { label: "Weight", value: "81.4", unit: "kg", range: "Recorded, not ranged", status: null },
];

const outside = READINGS.filter((r) => r.status !== null).length;

export function VitalsSummaryBlock() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>Observations</CardTitle>
            <CardDescription>
              Recorded{" "}
              {/* `dir="auto"`: a Latin date opens with a digit, which an RTL paragraph would move to the far end. */}
              <time dateTime="2026-04-07T08:12" dir="auto">
                7 Apr 2026, 08:12
              </time>{" "}
              · Ward round, bedside monitor
            </CardDescription>
          </div>
          <Tag variant="secondary">Nurse-recorded</Tag>
        </div>
      </CardHeader>

      <CardContent>
        {/*
          A real `<dl>` in a wrapping grid: two columns where there is room, one where there is not, so
          200% text and a narrow phone get fewer, fuller rows rather than a truncated reading. No fixed
          column count and no `truncate` anywhere — a clipped measurement is a wrong measurement.
        */}
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {READINGS.map((r) => (
            <div key={r.label} className="flex min-w-0 flex-col gap-1 border-b border-input pb-3">
              <dt className="text-body-sm text-muted-foreground">{r.label}</dt>
              <dd className="flex min-w-0 flex-col gap-1">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  {/* The value and its unit are one isolated LTR run — see the note above. */}
                  <bdi dir="ltr" className="text-headline-sm font-medium text-foreground">
                    {r.value} {r.unit}
                  </bdi>
                  {/* A word first. The tone is a second channel, never the only one. */}
                  {r.status && <Tag variant={r.status.tone}>{r.status.word}</Tag>}
                </span>
                <span className="text-body-sm text-muted-foreground">
                  Reference:{" "}
                  <bdi dir="ltr">{r.range}</bdi>
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>

      <CardFooter className="text-body-sm text-muted-foreground">
        {/* A count plus translatable words: deliberately NOT isolated. */}
        {outside} of {READINGS.length} outside their reference range. Ranges are set by the care team.
      </CardFooter>
    </Card>
  );
}
// kx-block:end
