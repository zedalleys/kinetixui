import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxTag } from '../../lib/display';
import { KxCard } from '../../lib/primitives';
import { KxDescriptionList, KxDescriptionListItem, KxInform, KxTimeline, KxTimelineItem } from '../../lib/content';

/**
 * The "Shipment tracking" block — see sign-in.ts for how block fixtures work.
 *
 * The same contract as the React version: the consignment's facts, the tracking number the reader will
 * quote, the ask stated once, and a history whose exception carries its own action.
 *
 * ONE REAL DIVERGENCE, written down rather than papered over. React's Timeline has six statuses
 * (complete, current, pending, warning, error, neutral); Angular's `KxTimelineStatus` has four
 * (default, active, success, error). There is no `warning` rung and no `pending` rung here, and the
 * failed delivery attempt is neither a success nor a failure of the consignment — calling it `error`
 * would say the parcel is lost, which is wrong and is the sort of overstatement this library exists to
 * avoid. So the attempt is `active` (it is the latest event) and its state is carried by the WORDS
 * "Needs attention" in its own content, which is what the Angular component's documentation already asks
 * for: "the item's state is in title/description, which is what WCAG 1.4.1 asks for". The same reasoning
 * puts the undelivered final step at `default` rather than inventing a pending marker for it.
 *
 * That divergence is a gap in the Angular Timeline's status vocabulary, not a gap in this block, and it is
 * recorded as such in M5.26's five-platform matrix. It is NOT fixed here: widening a published component's
 * union is an API change and belongs in its own slice.
 *
 * Every time is shown exactly as supplied with its zone named. Nothing here converts a time zone: a parcel
 * scanned at 18:40 local is a different fact from 18:40 in the reader's zone.
 *
 * No real carrier, consignment, address or person. Events arrive as data; the block tracks nothing.
 */
// kx-block:start
const EVENTS = [
  { time: '2 Apr, 09:04', title: 'Collected', detail: 'Kinetix Freight depot, Jeddah', status: 'success' as const, attention: false, action: false },
  { time: '3 Apr, 21:17', title: 'In transit', detail: 'Departed sorting hub, Riyadh', status: 'success' as const, attention: false, action: false },
  { time: '5 Apr, 07:52', title: 'Out for delivery', detail: 'On vehicle KX-418', status: 'success' as const, attention: false, action: false },
  {
    time: '5 Apr, 18:40',
    title: 'Delivery attempted',
    detail: 'Nobody available to sign. The parcel is back at the Riyadh depot.',
    status: 'active' as const,
    attention: true,
    action: true,
  },
  { time: 'Awaiting a date', title: 'Delivery', detail: 'Signature required on arrival.', status: 'default' as const, attention: false, action: false },
];

const FACTS = [
  { term: 'To', value: 'Rahma Suleiman, Al Olaya, Riyadh' },
  { term: 'Service', value: 'Next day, signature required' },
  { term: 'Times', value: 'Shown in Riyadh time (GMT+3)' },
];

@Component({
  selector: 'app-shipment-tracking-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxCard, KxTag, KxDescriptionList, KxDescriptionListItem, KxInform, KxTimeline, KxTimelineItem],
  template: `
    <kx-card class="tracking">
      <header class="head">
        <span class="who">
          <h3 class="title">Track consignment</h3>
          <p class="sub">Kinetix Freight · 2 parcels, 4.6 kg</p>
        </span>
        <!-- A word. The tone is the second channel. -->
        <kx-tag variant="warning">Delayed</kx-tag>
      </header>

      <div class="body">
        <dl kxDescriptionList>
          @for (fact of facts; track fact.term) {
            <div kxDescriptionListItem [term]="fact.term">{{ fact.value }}</div>
          }
        </dl>

        <span class="reference" role="group" aria-labelledby="st-ref-label">
          <span class="reference-label" id="st-ref-label">Tracking number</span>
          <span class="reference-value" translate="no">KXF-7731-2048</span>
        </span>

        <!-- The ask, once, above the history. Not a restatement of the status tag: that says what the
             consignment is, this says what the reader has to do. -->
        <kx-inform variant="warning">
          Delivery needs a new date. The depot holds the parcels for 5 working days.
        </kx-inform>

        <ol kxTimeline aria-label="Consignment history">
          @for (event of events; track event.title) {
            <li kxTimelineItem [title]="event.title" [status]="event.status">
              <span class="event">
                <!-- dir="auto": a time opens with a digit, which an RTL paragraph would move to the far end. -->
                <span class="event-time" dir="auto">{{ event.time }}</span>
                <span class="event-detail">{{ event.detail }}</span>
                <!-- Angular's Timeline has no warning status, so the state is a word. See the note above. -->
                @if (event.attention) {
                  <kx-tag variant="warning">Needs attention</kx-tag>
                }
                @if (event.action) {
                  <button kxButton size="sm" type="button">Choose a new date</button>
                }
              </span>
            </li>
          }
        </ol>
      </div>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 36rem; }
    .tracking { display: block; }
    .head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--spacing-2) var(--spacing-4); padding: var(--spacing-5) var(--spacing-5) var(--spacing-3); }
    .who { display: grid; gap: var(--spacing-1); min-inline-size: 0; }
    .title { margin: 0; font: var(--text-title-md); font-weight: 600; color: hsl(var(--foreground)); }
    .sub { margin: 0; font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .body { display: grid; gap: var(--spacing-5); padding: 0 var(--spacing-5) var(--spacing-5); justify-items: start; }
    .reference { display: grid; gap: var(--spacing-1); min-inline-size: 0; }
    .reference-label { font: var(--text-label-sm); color: hsl(var(--muted-foreground)); }
    .reference-value { font-family: var(--font-mono, ui-monospace, monospace); font-weight: 600; letter-spacing: 0.05em; user-select: all; overflow-wrap: anywhere; }
    /* Wraps rather than compresses, so 200% text drops the tag and the button onto their own lines instead
       of squeezing the detail sentence. */
    .event { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-2); min-inline-size: 0; }
    .event-time { flex-basis: 100%; font: var(--text-body-sm); color: hsl(var(--muted-foreground)); font-variant-numeric: tabular-nums; }
    .event-detail { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); overflow-wrap: anywhere; }
  `,
})
export class ShipmentTrackingBlock {
  readonly events = EVENTS;
  readonly facts = FACTS;
}
// kx-block:end
