import { Component, signal } from '@angular/core';
import { KxButton } from '../lib/button';
import { KxFab } from '../lib/content';
import { KxSlider } from '../lib/forms';

@Component({
  selector: 'kx-fixture',
  imports: [KxButton, KxFab, KxSlider],
  template: `
    <main>
      <h1>Press and value feedback</h1>
      <form (submit)="$event.preventDefault(); submissions.update(v => v + 1)">
        <button kxButton>Save</button>
        <button kxButton type="button" disabled>Unavailable</button>
        <button kxFab type="button" aria-label="Add item" (click)="items.update(v => v + 1)">+</button>
      </form>
      <output id="submissions">{{ submissions() }}</output>
      <output id="items">{{ items() }}</output>
      <section [attr.dir]="rtl() ? 'rtl' : 'ltr'">
        <kx-slider aria-label="Level" [min]="-5" [max]="max()" [step]="0.25" [(value)]="value" />
        <output id="level">{{ value() }}</output>
      </section>
      <button type="button" (click)="rtl.update(v => !v)">Flip direction</button>
      <button type="button" (click)="max.set(2)">Limit to two</button>
    </main>
  `,
  styles: 'main{padding:var(--spacing-4)} section{max-inline-size:25rem;margin-block:var(--spacing-4)}',
})
export class PressSlider {
  readonly submissions = signal(0);
  readonly items = signal(0);
  readonly value = signal(0);
  readonly max = signal(5);
  readonly rtl = signal(false);
}
