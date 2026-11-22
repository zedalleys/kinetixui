import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxTag } from '../../lib/display';
import { KxCard } from '../../lib/primitives';
import { KxDescriptionList, KxDescriptionListItem } from '../../lib/content';
import { KxRadio, KxRadioGroup } from '../../lib/forms';

/**
 * The "Appointment booking" block — see sign-in.ts for how block fixtures work.
 *
 * Angular has no TimeSlotPicker, so the slots are composed from the primitives it does have: a
 * `kx-radio-group` whose radios are drawn as tiles. That is not a workaround — it is the SAME contract. The
 * React version is a Radix RadioGroup and this is a set of real `<input type="radio">` elements sharing a
 * name, so both give the identical model: one tab stop for the group, arrow keys moving between times,
 * Space selecting, and "3 of 7, checked" spoken. What differs is the component names and the mechanism,
 * which is exactly the line this library draws between a shared contract and a platform implementation.
 *
 * Two things the React version gets from TimeSlotPicker and this one has to state for itself, written out
 * rather than skipped:
 *
 *   unavailable   the radio is disabled, which already removes it from the arrow-key cycle, AND its label
 *                 ends with the word "Unavailable". A struck-through tile is not a message to a screen
 *                 reader, and a disabled tile with no word is announced only as "dimmed".
 *   period        morning and afternoon are a `fieldset`/`legend` pair INSIDE the one group, so the arrow
 *                 keys still cross between them. Two separate radio groups would make them two tab stops
 *                 and two independent choices, which is the wrong model for "pick one time".
 *
 * The flow is real state, not a picture of one. Confirm is disabled until a time is chosen, and the reason
 * is written beside it. Confirming replaces the picker with the outcome in a `role="status"` region, so it
 * is announced rather than silently swapped in — Angular has no ResultState, so the live region is declared
 * here, which is the same obligation the React version meets by passing `announce`.
 *
 * Times are shown exactly as supplied, with the zone named. Nothing here converts a time zone.
 *
 * Everything below is fictional: no real clinician, patient, facility or price. Availability arrives as
 * data; the block holds, fetches and releases nothing.
 */
// kx-block:start
const GROUPS = [
  {
    label: 'Morning',
    slots: [
      { value: '2026-04-07T09:00', label: '09:00', unavailable: false, note: '' },
      { value: '2026-04-07T09:30', label: '09:30', unavailable: true, note: '' },
      { value: '2026-04-07T10:15', label: '10:15', unavailable: false, note: '' },
      { value: '2026-04-07T11:00', label: '11:00', unavailable: false, note: 'Last morning slot' },
    ],
  },
  {
    label: 'Afternoon',
    slots: [
      { value: '2026-04-07T13:30', label: '13:30', unavailable: true, note: '' },
      { value: '2026-04-07T14:00', label: '14:00', unavailable: false, note: '' },
      { value: '2026-04-07T15:45', label: '15:45', unavailable: false, note: '' },
    ],
  },
];

const FACTS = [
  { term: 'Date', value: 'Tuesday 7 April 2026', time: '2026-04-07', layout: 'row' as const },
  { term: 'Length', value: '25 minutes', time: '', layout: 'row' as const },
  { term: 'Joining', value: 'Video link, sent after confirmation', time: '', layout: 'row' as const },
  {
    term: 'Changes',
    value: 'Free to move or cancel up to 24 hours before. After that a missed-visit fee applies.',
    time: '',
    layout: 'stacked' as const,
  },
];

const LABELS = new Map(GROUPS.flatMap((g) => g.slots.map((s) => [s.value, s.label] as const)));

@Component({
  selector: 'app-appointment-booking-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxCard, KxTag, KxDescriptionList, KxDescriptionListItem, KxRadio, KxRadioGroup],
  template: `
    <kx-card class="booking">
      <header class="head">
        <span class="who">
          <h3 class="title">Book an appointment</h3>
          <p class="sub">Dr Lina Okafor · Cardiology review</p>
        </span>
        <!-- A word, not a colour. -->
        <kx-tag variant="secondary">Telehealth</kx-tag>
      </header>

      <div class="body">
        <dl kxDescriptionList>
          @for (fact of facts; track fact.term) {
            <div kxDescriptionListItem [term]="fact.term" [layout]="fact.layout">
              @if (fact.time) {
                <!-- Its own dir="auto" run: a Latin date opens with a digit, which an RTL paragraph would
                     move to the far end ("Apr 2026 7"). -->
                <time [attr.datetime]="fact.time" dir="auto">{{ fact.value }}</time>
              } @else {
                {{ fact.value }}
              }
            </div>
          }
        </dl>

        <!--
          The live region is OUTSIDE the @if and always in the DOM, holding text only once there is an
          outcome. A region inserted together with its first text is frequently not announced at all — the
          assistive technology has nothing to observe a change against — which is why this is not simply
          role="status" on the panel below. It is visually hidden because the panel already says the same
          thing on screen; this exists for the reader who cannot see it appear.
        -->
        <p class="announce" role="status">{{ announcement() }}</p>

        @if (booked()) {
          <p class="outcome">
            <span class="outcome-title">Appointment confirmed</span>
            <span class="outcome-detail">
              Tuesday 7 April 2026 at {{ bookedLabel() }}, with Dr Lina Okafor. The video link is on its way.
            </span>
            <span class="outcome-reference">Booking reference <span translate="no">KX-4C19B</span></span>
          </p>
          <button kxButton variant="Outline" type="button" (click)="reset()">Choose another time</button>
        } @else {
          <section class="slots" aria-labelledby="ab-slots-label" aria-describedby="ab-slots-zone">
            <span class="slots-label" id="ab-slots-label">Available times</span>
            <span class="slots-zone" id="ab-slots-zone">Times in Riyadh (GMT+3)</span>
            <!--
              The label and the zone are attached to the GROUP, not only to the section around it.
              The kx-radio-group component puts role="radiogroup" on its host and names it from nothing, so without
              these two the choice group was reachable but anonymous: a reader entering it heard
              "radiogroup" with no "Available times" and no "Times in Riyadh". Found by Codex's exact-head
              review of #660 — the ids were already here, serving only the visible headings.
            -->
            <kx-radio-group
              class="tiles"
              aria-labelledby="ab-slots-label"
              aria-describedby="ab-slots-zone"
              [value]="slot()"
              (selected)="slot.set($event)"
            >
              @for (group of groups; track group.label) {
                <!-- A period INSIDE the one group: the arrow keys still cross between morning and
                     afternoon, which two separate groups would prevent. -->
                <fieldset class="period">
                  <legend>{{ group.label }}</legend>
                  <span class="period-tiles">
                    @for (s of group.slots; track s.value) {
                      <kx-radio class="tile" [value]="s.value" [disabled]="s.unavailable">
                        <span class="tile-time">{{ s.label }}</span>
                        @if (s.note) {
                          <span class="tile-note">{{ s.note }}</span>
                        }
                        <!-- The word, not only the strike-through: a dimmed tile with no word is announced
                             as "dimmed" and nothing else. -->
                        @if (s.unavailable) {
                          <span class="tile-note">Unavailable</span>
                        }
                      </kx-radio>
                    }
                  </span>
                </fieldset>
              }
            </kx-radio-group>
          </section>

          <span class="confirm-row">
            <button kxButton type="button" [disabled]="!slot()" (click)="confirm()">Confirm appointment</button>
            @if (!slot()) {
              <span class="hint">Choose a time to continue.</span>
            }
          </span>
        }
      </div>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 28rem; }
    .booking { display: block; }
    .head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--spacing-2) var(--spacing-4); padding: var(--spacing-5) var(--spacing-5) var(--spacing-3); }
    .who { display: grid; gap: var(--spacing-1); min-inline-size: 0; }
    .title { margin: 0; font: var(--text-title-md); font-weight: 600; color: hsl(var(--foreground)); }
    .sub { margin: 0; font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .body { display: grid; gap: var(--spacing-5); padding: 0 var(--spacing-5) var(--spacing-5); justify-items: start; }
    .slots { display: grid; gap: var(--spacing-1); inline-size: 100%; }
    .slots-label { font: var(--text-label-md); font-weight: 500; color: hsl(var(--foreground)); }
    .slots-zone { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); margin-block-end: var(--spacing-2); }
    .tiles { display: grid; gap: var(--spacing-4); }
    .period { margin: 0; border: 0; padding: 0; min-inline-size: 0; }
    .period legend { padding: 0; font: var(--text-label-sm); color: hsl(var(--muted-foreground)); }
    /* As many columns as fit at a minimum width, so 200% text and a phone get fewer, wider tiles rather
       than a clipped time. */
    .period-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 6.5rem), 1fr)); gap: var(--spacing-2); margin-block-start: var(--spacing-2); }
    .tile { align-items: flex-start; gap: var(--spacing-2); border: 1px solid hsl(var(--input)); border-radius: var(--radius-md, 0.5rem); padding: var(--spacing-2) var(--spacing-3); min-inline-size: 0; }
    .tile:has(.kx-radio__input:checked) { border-color: hsl(var(--action)); background: hsl(var(--action) / 0.08); }
    .tile:has(.kx-radio__input:disabled) .tile-time { text-decoration: line-through; color: hsl(var(--muted-foreground)); }
    .tile-time { font: var(--text-body-md); font-weight: 500; font-variant-numeric: tabular-nums; }
    .tile-note { display: block; font: var(--text-body-sm); color: hsl(var(--muted-foreground)); overflow-wrap: anywhere; }
    .confirm-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-3); }
    .hint { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .outcome { display: grid; gap: var(--spacing-1); margin: 0; border-radius: var(--radius-md, 0.5rem); background: hsl(var(--success) / 0.15); padding: var(--spacing-4); color: hsl(var(--success-on-container)); }
    .outcome-title { font: var(--text-title-sm); font-weight: 600; }
    .outcome-detail, .outcome-reference { font: var(--text-body-sm); }
    /* Visually hidden, still in the accessibility tree and still a live region. Not display:none and not
       hidden: either would take it out of the tree and announce nothing. */
    .announce { position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
  `,
})
export class AppointmentBookingBlock {
  readonly groups = GROUPS;
  readonly facts = FACTS;

  readonly slot = signal<string | null>(null);
  readonly booked = signal<string | null>(null);

  /** The words the outcome reads back, so it never prints a raw slot id. */
  readonly bookedLabel = computed(() => {
    const value = this.booked();
    return value ? (LABELS.get(value) ?? value) : '';
  });

  /** What the live region says. Empty until there is an outcome, so nothing is announced on first render. */
  readonly announcement = computed(() => {
    const label = this.bookedLabel();
    return label ? `Appointment confirmed for Tuesday 7 April 2026 at ${label}, with Dr Lina Okafor.` : '';
  });

  confirm(): void {
    this.booked.set(this.slot());
  }

  reset(): void {
    this.booked.set(null);
    this.slot.set(null);
  }
}
// kx-block:end
