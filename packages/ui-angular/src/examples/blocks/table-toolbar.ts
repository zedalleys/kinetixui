import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxInput, KxLabel } from '../../lib/primitives';
import { KxNativeSelect } from '../../lib/forms';

/**
 * The "Table toolbar" block — see sign-in.ts for how block fixtures work.
 *
 * The table is a real `<table>`. KinetixUI has no Angular table component yet — `table` is in the layout
 * wave — and the web platform's own table already carries the semantics that matter: a row/column grid a
 * screen reader can navigate, with `<th scope>` tying every cell to its header. Wrapping that in a div grid
 * to look more like a component would throw all of it away.
 *
 * The search field and the status filter are both labelled, and the label is visible rather than a
 * placeholder. `kx-native-select` is the browser's own `<select>`, which is what gives the filter the
 * platform picker on a phone for free.
 *
 * The filtering is real, not decorative: typing narrows the rows, so the block demonstrates the thing it
 * depicts.
 */
// kx-block:start
@Component({
  selector: 'app-table-toolbar-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxInput, KxLabel, KxNativeSelect],
  template: `
    <div class="toolbar">
      <span class="search">
        <label kxLabel for="invoice-search">Search invoices</label>
        <input kxInput id="invoice-search" type="search" placeholder="INV-001"
               [value]="query()" (input)="query.set($any($event.target).value)" />
      </span>
      <span class="filter">
        <label kxLabel for="invoice-status">Status</label>
        <select kxNativeSelect id="invoice-status" [value]="status()" (change)="status.set($any($event.target).value)">
          <option value="all">All statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
        </select>
      </span>
      <button kxButton (click)="add()">Add invoice</button>
    </div>

    <table class="invoices">
      <caption class="kx-sr-only">Invoices, filtered by search and status</caption>
      <thead>
        <tr>
          <th scope="col">Invoice</th>
          <th scope="col">Status</th>
          <th scope="col" class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        @for (invoice of visible(); track invoice.id) {
          <tr>
            <th scope="row">{{ invoice.id }}</th>
            <td>{{ invoice.status }}</td>
            <td class="amount">{{ invoice.amount }}</td>
          </tr>
        } @empty {
          <tr>
            <td colspan="3" class="empty">No invoices match that search.</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--spacing-2);
      margin-block-end: var(--spacing-4);
    }
    .search { display: grid; gap: var(--spacing-2); flex: 1; min-inline-size: 12rem; }
    .filter { display: grid; gap: var(--spacing-2); }
    .invoices { inline-size: 100%; border-collapse: collapse; font: var(--text-body-sm); }
    .invoices th, .invoices td {
      padding: var(--spacing-2) var(--spacing-3);
      text-align: start;
      border-block-end: var(--border-width-default) solid hsl(var(--border));
    }
    .invoices thead th { font: var(--text-label-sm); color: hsl(var(--muted-foreground)); }
    .amount { text-align: end; }
    .empty { color: hsl(var(--muted-foreground)); text-align: center; }
  `,
})
export class TableToolbarBlock {
  readonly query = signal('');
  readonly status = signal('all');

  private readonly invoices = [
    { id: 'INV-001', status: 'Paid', amount: '$250.00' },
    { id: 'INV-002', status: 'Pending', amount: '$150.00' },
    { id: 'INV-003', status: 'Paid', amount: '$350.00' },
  ];

  readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const s = this.status();
    return this.invoices.filter(
      (invoice) => (!q || invoice.id.toLowerCase().includes(q)) && (s === 'all' || invoice.status === s),
    );
  });

  add(): void {}
}
// kx-block:end
