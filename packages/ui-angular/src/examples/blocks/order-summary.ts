import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxCard, KxCardContent, KxCardFooter, KxCardHeader, KxCardTitle, KxInput, KxSeparator } from '../../lib/primitives';
import { KxField, KxFieldLabel, KxNumberInput } from '../../lib/forms';

/**
 * The "Order summary" block — see sign-in.ts for how block fixtures work.
 *
 * Each quantity stepper is named after its own line item. Two steppers that both announce "Quantity" leave a
 * screen-reader user changing the count of something they cannot identify — the most common defect in a cart.
 *
 * The totals are a real `<dl>`: each label and its amount are one term/definition pair, so they stay
 * associated when the visual two-column layout is not what a reader gets.
 *
 * "Free" is a word, so shipping says "Free" rather than leaving $0.00 to be inferred.
 */
// kx-block:start
const ITEMS = [
  { id: 'tee', name: 'Kinetix T-shirt', unit: 28, qty: 2 },
  { id: 'stickers', name: 'Sticker pack', unit: 6, qty: 1 },
];

@Component({
  selector: 'app-order-summary-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxCard, KxCardContent, KxCardFooter, KxCardHeader, KxCardTitle, KxField, KxFieldLabel, KxInput, KxNumberInput, KxSeparator],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-card-title>Order summary</kx-card-title>
      </kx-card-header>
      <kx-card-content class="body">
        <ul class="items">
          @for (item of items; track item.id) {
            <li>
              <span class="text">
                <span>{{ item.name }}</span>
                <span class="hint">{{ money(item.unit) }} each</span>
              </span>
              <kx-number-input [(value)]="item.qty" [min]="0" [max]="99" [attr.aria-label]="'Quantity, ' + item.name" />
            </li>
          }
        </ul>

        <kx-separator />

        <kx-field>
          <label kxFieldLabel for="os-promo">Promo code</label>
          <span class="promo">
            <input kxInput id="os-promo" placeholder="KINETIX10" />
            <button kxButton variant="Outline">Apply</button>
          </span>
        </kx-field>

        <kx-separator />

        <dl class="totals">
          <div><dt>Subtotal</dt><dd>{{ money(subtotal()) }}</dd></div>
          <div><dt>Shipping</dt><dd>{{ shipping() === 0 ? 'Free' : money(shipping()) }}</dd></div>
          <div class="grand"><dt>Total</dt><dd>{{ money(subtotal() + shipping()) }}</dd></div>
        </dl>
      </kx-card-content>
      <kx-card-footer>
        <button kxButton class="place" [disabled]="subtotal() === 0">Place order</button>
      </kx-card-footer>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 24rem; }
    .body { display: grid; gap: var(--spacing-4); }
    .items { display: grid; gap: var(--spacing-4); margin: 0; padding: 0; list-style: none; }
    .items li { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-3); }
    .text { display: grid; gap: var(--spacing-1); }
    .hint { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .promo { display: flex; gap: var(--spacing-2); }
    .promo input { flex: 1; min-inline-size: 0; }
    .totals { display: grid; gap: var(--spacing-2); margin: 0; font: var(--text-body-sm); }
    .totals div { display: flex; justify-content: space-between; }
    .totals dt { color: hsl(var(--muted-foreground)); }
    .totals dd { margin: 0; font-variant-numeric: tabular-nums; }
    .totals .grand dt, .totals .grand dd { font-weight: 500; color: hsl(var(--foreground)); }
    .place { inline-size: 100%; }
  `,
})
export class OrderSummaryBlock {
  readonly items = ITEMS.map((item) => ({ ...item, qty: signal<number | null>(item.qty) }));

  readonly subtotal = computed(() => this.items.reduce((total, item) => total + item.unit * (item.qty() ?? 0), 0));
  readonly shipping = computed(() => (this.subtotal() > 50 || this.subtotal() === 0 ? 0 : 5));

  money(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }
}
// kx-block:end
