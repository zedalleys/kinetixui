import { NgComponentOutlet } from '@angular/common';
import { Component, type Type } from '@angular/core';
import * as examples from '../usage/examples';

/**
 * Every Angular usage example the website shows (`src/usage/examples.ts`), mounted live.
 *
 * The examples are the catalogue's most honest subject: they are the code a reader copies, they cover every
 * implemented component, and `check:usage` already keeps them in step with the published code tabs. Each
 * example component is its own page (`?demo=<ExportName>`), the way it appears on its own docs page — two
 * examples share element ids (`email`, `name`) that would collide if they were rendered side by side.
 *
 * The list is read from the module's exports, so an example added there is in the browser pass without
 * anyone editing this file.
 */
export const USAGE_DEMOS: { name: string; type: Type<unknown> }[] = Object.entries(examples)
  .filter(([, value]) => typeof value === 'function' && 'ɵcmp' in value)
  .map(([name, type]) => ({ name, type: type as Type<unknown> }));

@Component({
  selector: 'kx-fixture',
  imports: [NgComponentOutlet],
  template: `
    @for (demo of demos; track demo.name) {
      <section class="kx-usage-demo" [attr.data-kx-demo]="demo.name"><ng-container *ngComponentOutlet="demo.type" /></section>
    }
  `,
})
export class UsageExamples {
  private readonly only = new URLSearchParams(globalThis.location?.search ?? '').get('demo');
  readonly demos = USAGE_DEMOS.filter((d) => !this.only || d.name === this.only);
}
