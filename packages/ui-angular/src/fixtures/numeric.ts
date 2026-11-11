import { Component } from '@angular/core';
import { KxAnimatedNumber } from '../lib/animated-number';

/** Opt-in utility subject; it is deliberately outside the component catalogue. */
@Component({
  selector: 'kx-fixture',
  imports: [KxAnimatedNumber],
  template: `
    <h1>Numeric continuity</h1>
    <kx-animated-number [value]="value" [format]="format" />
    <button type="button" (click)="value = 100.5">Increase numeric value</button>
    <button type="button" (click)="value = -40.25">Decrease numeric value</button>
    <button type="button" (click)="value = value + 1.25">Step numeric value</button>
    <button type="button" (click)="nonfinite()">Nonfinite numeric value</button>
  `,
})
export class NumericFixture {
  value = 20.25;
  readonly format = (value: number) => Number.isFinite(value) ? value.toFixed(2) : String(value);
  nonfinite() { this.value = Infinity; }
}
