import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxCard, KxCardContent, KxCardHeader, KxCardTitle, KxLabel, KxSeparator } from '../../lib/primitives';
import { KxTag } from '../../lib/display';
import { KxSlider } from '../../lib/forms';
import { KxCheckbox } from '../../lib/toggles';

/**
 * The "Filter panel" block — see sign-in.ts for how block fixtures work.
 *
 * The active filters are tags and the filters themselves are checkboxes: the same fact, shown twice, on
 * purpose. The tags are the fast way to undo one thing; the checkboxes are the full set. Removing a tag and
 * unticking its box are the same operation, so they share one piece of state — two lists that can disagree
 * is the classic bug in this pattern.
 *
 * `kx-tag` names its dismiss button after the tag by default, so the row announces "Remove In stock" rather
 * than three identical "Remove" buttons.
 *
 * The price is visible next to the slider rather than living in a tooltip on the thumb: a tooltip that only
 * appears while dragging cannot be read by anyone who is not dragging.
 */
// kx-block:start
@Component({
  selector: 'app-filter-panel-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxCard, KxCardContent, KxCardHeader, KxCardTitle, KxCheckbox, KxLabel, KxSeparator, KxSlider, KxTag],
  template: `
    <kx-card>
      <kx-card-header class="head">
        <kx-card-title>Filters</kx-card-title>
        <button kxButton variant="Ghost" size="sm" [disabled]="active().length === 0" (click)="active.set([])">Clear all</button>
      </kx-card-header>
      <kx-card-content class="body">
        @if (activeOptions().length) {
          <ul class="tags" aria-label="Active filters">
            @for (option of activeOptions(); track option.id) {
              <li><kx-tag variant="secondary" removable (removed)="toggle(option.id)">{{ option.label }}</kx-tag></li>
            }
          </ul>
        }

        <div class="price">
          <div class="price-head">
            <label kxLabel id="fp-price-label">Maximum price</label>
            <span class="amount">{{ '$' + price() }}</span>
          </div>
          <kx-slider [(value)]="price" [min]="0" [max]="500" [step]="10" [valueText]="'$' + price()" aria-labelledby="fp-price-label" />
        </div>

        <kx-separator />

        <fieldset class="availability">
          <legend>Availability</legend>
          @for (option of options; track option.id) {
            <span class="option">
              <kx-checkbox [id]="'fp-' + option.id" [checked]="active().includes(option.id)" (toggled)="toggle(option.id)" />
              <label kxLabel [for]="'fp-' + option.id">{{ option.label }}</label>
            </span>
          }
        </fieldset>
      </kx-card-content>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 20rem; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-2); }
    .body { display: grid; gap: var(--spacing-5); }
    .tags { display: flex; flex-wrap: wrap; gap: var(--spacing-2); margin: 0; padding: 0; list-style: none; }
    .price { display: grid; gap: var(--spacing-3); }
    .price-head { display: flex; align-items: baseline; justify-content: space-between; }
    .amount { font: var(--text-body-sm); font-variant-numeric: tabular-nums; color: hsl(var(--muted-foreground)); }
    .availability { display: grid; gap: var(--spacing-3); margin: 0; padding: 0; border: 0; }
    .availability legend { margin-block-end: var(--spacing-3); font: var(--text-label-sm); }
    .option { display: flex; align-items: center; gap: var(--spacing-3); }
    .option label { font-weight: 400; }
  `,
})
export class FilterPanelBlock {
  readonly price = signal(250);
  readonly active = signal<string[]>(['stock']);

  readonly options = [
    { id: 'stock', label: 'In stock' },
    { id: 'sale', label: 'On sale' },
    { id: 'shipping', label: 'Free shipping' },
  ];

  readonly activeOptions = computed(() => this.options.filter((option) => this.active().includes(option.id)));

  toggle(id: string): void {
    const current = this.active();
    this.active.set(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
}
// kx-block:end
