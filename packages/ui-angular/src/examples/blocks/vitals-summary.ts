import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxTag } from '../../lib/display';
import { KxCard } from '../../lib/primitives';

/**
 * The "Observations summary" block — see sign-in.ts for how block fixtures work.
 *
 * The same anatomy as the React version, composed from what Angular has. There is no Metric here and none
 * is needed: the shared contract is a `<dl>` pairing each label with its value, a status WORD beside the
 * value, the reference range printed in full, and freshness plus source stated in the header. All four are
 * semantics, not components, so they port exactly.
 *
 * The block never decides what is abnormal. Ranges and the status word arrive as data, because "normal" is
 * the care team's, agronomist's or engineer's judgement and a design system that guessed it would be wrong
 * in someone's domain.
 *
 * Bidi, which this repository has been bitten by: a value and its unit are two runs — digits are `EN` and
 * "mmHg" or "°C" are strong LTR — so in an RTL paragraph the unit lands on the wrong side and "37.1 °C"
 * reads as "°C 37.1". Every value and every range is wrapped in `<bdi dir="ltr">`. What is deliberately NOT
 * isolated is the footer's "2 of 6 outside their reference range": that is a count followed by translatable
 * words, and pinning it LTR would hold an Arabic word in Latin reading order.
 *
 * The written structure IS this block's data equivalent — there is no chart, so there is nothing here that
 * needs a text alternative beside it.
 *
 * Every reading, person, device and facility below is invented. No real patient record and no clinical
 * advice; the block fetches nothing.
 */
// kx-block:start
const READINGS = [
  { label: 'Blood pressure', value: '148/92', unit: 'mmHg', range: '90/60 to 120/80', status: 'High', tone: 'warning' as const },
  { label: 'Heart rate', value: '76', unit: 'bpm', range: '60 to 100', status: '', tone: 'warning' as const },
  { label: 'Temperature', value: '37.1', unit: '°C', range: '36.1 to 37.2', status: '', tone: 'warning' as const },
  { label: 'Oxygen saturation', value: '94', unit: '%', range: '95 to 100', status: 'Low', tone: 'warning' as const },
  { label: 'Respiratory rate', value: '18', unit: 'breaths/min', range: '12 to 20', status: '', tone: 'warning' as const },
  { label: 'Weight', value: '81.4', unit: 'kg', range: 'Recorded, not ranged', status: '', tone: 'warning' as const },
];

const OUTSIDE = READINGS.filter((r) => r.status !== '').length;

@Component({
  selector: 'app-vitals-summary-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxCard, KxTag],
  template: `
    <kx-card class="panel">
      <header class="head">
        <span class="who">
          <h3 class="title">Observations</h3>
          <p class="sub">
            Recorded
            <!-- Its own dir="auto" run: a Latin date opens with a digit, which an RTL paragraph would move
                 to the far end. -->
            <time datetime="2026-04-07T08:12" dir="auto">7 Apr 2026, 08:12</time>
            · Ward round, bedside monitor
          </p>
        </span>
        <kx-tag variant="secondary">Nurse-recorded</kx-tag>
      </header>

      <dl class="readings">
        @for (r of readings; track r.label) {
          <div class="reading">
            <dt>{{ r.label }}</dt>
            <dd>
              <span class="value-row">
                <!-- The value and its unit are one isolated LTR run — see the note above. -->
                <bdi dir="ltr" class="value">{{ r.value }} {{ r.unit }}</bdi>
                <!-- A word first. The tone is a second channel, never the only one. -->
                @if (r.status) {
                  <kx-tag [variant]="r.tone">{{ r.status }}</kx-tag>
                }
              </span>
              <span class="range">Reference: <bdi dir="ltr">{{ r.range }}</bdi></span>
            </dd>
          </div>
        }
      </dl>

      <footer class="foot">
        <!-- A count plus translatable words: deliberately NOT isolated. -->
        {{ outside }} of {{ readings.length }} outside their reference range. Ranges are set by the care team.
      </footer>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 42rem; }
    .panel { display: block; }
    .head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--spacing-2) var(--spacing-4); padding: var(--spacing-5) var(--spacing-5) var(--spacing-3); }
    .who { display: grid; gap: var(--spacing-1); min-inline-size: 0; }
    .title { margin: 0; font: var(--text-title-md); font-weight: 600; color: hsl(var(--foreground)); }
    .sub { margin: 0; font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    /* Two columns where there is room, one where there is not, so 200% text and a narrow phone get fewer,
       fuller rows. No fixed column count and no truncation: a clipped measurement is a wrong measurement. */
    .readings { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); gap: var(--spacing-4) var(--spacing-8); margin: 0; padding: 0 var(--spacing-5); }
    .reading { display: grid; gap: var(--spacing-1); min-inline-size: 0; border-block-end: 1px solid hsl(var(--input)); padding-block-end: var(--spacing-3); }
    .reading dt { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .reading dd { display: grid; gap: var(--spacing-1); margin: 0; min-inline-size: 0; }
    .value-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--spacing-1) var(--spacing-2); min-inline-size: 0; }
    .value { font: var(--text-headline-sm); font-weight: 500; color: hsl(var(--foreground)); font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
    .range { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); overflow-wrap: anywhere; }
    .foot { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); padding: var(--spacing-4) var(--spacing-5) var(--spacing-5); }
  `,
})
export class VitalsSummaryBlock {
  readonly readings = READINGS;
  readonly outside = OUTSIDE;
}
// kx-block:end
