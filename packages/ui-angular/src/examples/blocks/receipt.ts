import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, output, signal, viewChild } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxDescriptionList, KxDescriptionListItem } from '../../lib/content';
import { KxTag } from '../../lib/display';
import { KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle, KxSeparator } from '../../lib/primitives';

/**
 * The "Receipt" block — see sign-in.ts for how block fixtures work.
 *
 * One business-neutral receipt. A payment, booking, transfer, order or refund receipt is this block with
 * different words. Amounts arrive formatted — the block computes nothing — and Download, Print and Share are
 * outputs: generating a PDF, printing and sharing are the product's, not the block's.
 *
 * The status is a word ("Paid"), not a colour. The amount carries a spoken label, so "SAR 162.75" is read as
 * "162.75 Saudi riyals" rather than letter by letter.
 *
 * The receipt number is a labelled group: the code sits in a `translate="no"` element that selects in one
 * click, and the copy button is named "Copy Receipt number". The result of a copy goes into a `role="status"`
 * region that is always rendered, so it is announced — and when the clipboard is missing or refused, the
 * block selects the code and says so instead of pretending it worked.
 *
 * The breakdown is a real `<dl>`: each label and its amount are one term/definition pair, the total is the
 * last pair, and amounts sit on the inline end in tabular figures. The discount's minus sign is in the text,
 * so a deduction does not depend on colour either.
 */
// kx-block:start
const BREAKDOWN = [
  { label: 'Single-origin beans', note: '2 × SAR 62.00', value: 'SAR 124.00', deduction: false },
  { label: 'Pour-over filters', note: '', value: 'SAR 18.00', deduction: false },
  { label: 'Member discount', note: '10% on beans', value: '−SAR 12.40', deduction: true },
  { label: 'VAT', note: '15%', value: 'SAR 19.29', deduction: false },
  { label: 'Rounding', note: '', value: '+SAR 0.01', deduction: false },
];

@Component({
  selector: 'app-receipt-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxCard, KxCardContent, KxCardDescription, KxCardFooter, KxCardHeader, KxCardTitle, KxDescriptionList, KxDescriptionListItem, KxSeparator, KxTag],
  template: `
    <kx-card>
      <kx-card-header class="header">
        <span class="issuer">
          <kx-card-title>Harbour Coffee Roasters</kx-card-title>
          <kx-card-description>Payment receipt</kx-card-description>
        </span>
        <kx-tag>Paid</kx-tag>
      </kx-card-header>
      <kx-card-content class="body">
        <div class="amount">
          <span class="label">Amount paid</span>
          <span class="value" aria-hidden="true">SAR 162.75</span>
          <span class="kx-sr-only">162.75 Saudi riyals</span>
        </div>

        <div class="reference" role="group" aria-labelledby="rc-ref-label">
          <span class="label" id="rc-ref-label">Receipt number</span>
          <span class="reference-row">
            <span class="code" translate="no" #code>RCP-2026-004817</span>
            <button kxButton variant="Outline" size="sm" type="button" aria-labelledby="rc-copy-text rc-ref-label" (click)="copy()">
              <span id="rc-copy-text">Copy</span>
            </button>
          </span>
          <span class="feedback" role="status" [class.failed]="feedback() === 'failed'">{{ message() }}</span>
        </div>

        <dl kxDescriptionList>
          <div kxDescriptionListItem term="Date"><time datetime="2026-03-14T09:42">14 Mar 2026, 09:42</time></div>
          <div kxDescriptionListItem term="Paid with">Visa ending 4242</div>
          <div kxDescriptionListItem term="Paid to">Harbour Coffee Roasters, Riyadh</div>
        </dl>

        <kx-separator />

        <dl class="breakdown" aria-label="Receipt summary">
          @for (line of breakdown; track line.label) {
            <div [class.deduction]="line.deduction">
              <dt>
                <span>{{ line.label }}</span>
                @if (line.note) {
                  <span class="note">{{ line.note }}</span>
                }
              </dt>
              <dd>{{ line.value }}</dd>
            </div>
          }
          <div class="total"><dt>Total paid</dt><dd>SAR 162.75</dd></div>
        </dl>
      </kx-card-content>
      <kx-card-footer class="actions">
        <button kxButton variant="Outline" type="button" (click)="download.emit()">Download</button>
        <button kxButton variant="Outline" type="button" (click)="print.emit()">Print</button>
        <button kxButton variant="Ghost" type="button" (click)="share.emit()">Share</button>
      </kx-card-footer>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 28rem; }
    .header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--spacing-3); }
    .issuer { display: grid; gap: var(--spacing-1); min-inline-size: 0; }
    .body { display: grid; gap: var(--spacing-5); }
    .label { font: var(--text-label-md); color: hsl(var(--muted-foreground)); }
    .amount { display: grid; gap: var(--spacing-1); }
    .amount .value { font: var(--text-headline-md); font-variant-numeric: tabular-nums; color: hsl(var(--foreground)); }
    .reference { display: grid; gap: var(--spacing-1); min-inline-size: 0; }
    .reference-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-2) var(--spacing-3); }
    .code { min-inline-size: 0; font-family: var(--font-mono, ui-monospace, monospace); font-weight: 600; letter-spacing: 0.025em; user-select: all; overflow-wrap: anywhere; }
    .feedback { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .feedback.failed { color: hsl(var(--destructive)); }
    .breakdown { display: grid; gap: var(--spacing-2); margin: 0; font: var(--text-body-sm); }
    .breakdown div { display: flex; align-items: baseline; gap: var(--spacing-3); }
    .breakdown dt { display: grid; gap: var(--spacing-0-5, 0.125rem); color: hsl(var(--muted-foreground)); }
    .breakdown .note { font: var(--text-body-xs, var(--text-body-sm)); }
    .breakdown dd { margin: 0; margin-inline-start: auto; text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .breakdown .total { padding-block-start: var(--spacing-2); border-block-start: 1px solid hsl(var(--border)); }
    .breakdown .total dt, .breakdown .total dd { font-weight: 600; color: hsl(var(--foreground)); }
    .actions { display: flex; flex-wrap: wrap; gap: var(--spacing-2); }
  `,
})
export class ReceiptBlock implements OnDestroy {
  readonly breakdown = BREAKDOWN;

  readonly download = output<void>();
  readonly print = output<void>();
  readonly share = output<void>();

  readonly feedback = signal<'idle' | 'copied' | 'failed'>('idle');
  private readonly code = viewChild.required<ElementRef<HTMLElement>>('code');
  private timer: ReturnType<typeof setTimeout> | undefined;

  message(): string {
    const state = this.feedback();
    if (state === 'copied') return 'Copied';
    if (state === 'failed') return "Couldn't copy automatically. The code is selected — copy it with your keyboard.";
    return '';
  }

  async copy(): Promise<void> {
    clearTimeout(this.timer);
    const value = this.code().nativeElement.textContent?.trim() ?? '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(value);
      this.feedback.set('copied');
      this.timer = setTimeout(() => this.feedback.set('idle'), 2000);
    } catch {
      // Leave the failure message up: the reader still has to act on it. Selecting the code makes a keyboard
      // copy one shortcut away.
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(this.code().nativeElement);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      this.feedback.set('failed');
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
// kx-block:end
