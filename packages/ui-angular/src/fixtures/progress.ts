import { Component, signal } from '@angular/core';
import { KxProgress } from '../lib/primitives';

@Component({
  selector: 'kx-fixture',
  imports: [KxProgress],
  template: `
    <div style="max-width: 240px">
      @if (mounted()) {
        <kx-progress aria-label="Upload progress" [value]="value()" [max]="max()" />
      }
    </div>
    <button id="zero" (click)="set(0, 4)">Zero</button>
    <button id="max" (click)="set(4, 4)">Maximum</button>
    <button id="low" (click)="set(1, 4)">One file</button>
    <button id="high" (click)="set(3, 4)">Three files</button>
    <button id="overflow" (click)="set(9, 4)">Above maximum</button>
    <button id="negative" (click)="set(-2, 4)">Negative</button>
    <button id="invalid-max" (click)="set(25, infinity)">Invalid maximum</button>
    <button id="invalid-value" (click)="set(infinity, 4)">Invalid value</button>
    <button id="nan" (click)="set(nan, 4)">Not a number</button>
    <button id="negative-infinity" (click)="set(-infinity, 4)">Negative infinity</button>
    <button id="zero-max" (click)="set(25, 0)">Zero maximum</button>
    <button id="negative-max" (click)="set(25, -1)">Negative maximum</button>
    <button id="unknown" (click)="set(null, 4)">Unknown</button>
    <button id="mount" (click)="mounted.update((state) => !state)">Toggle progress</button>
  `,
})
export class ProgressFixture {
  readonly value = signal<number | null>(1);
  readonly max = signal(4);
  readonly mounted = signal(true);
  readonly infinity = Infinity;
  readonly nan = NaN;

  set(value: number | null, max: number) {
    this.value.set(value);
    this.max.set(max);
  }
}
