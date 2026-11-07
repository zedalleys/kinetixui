import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, signal, viewChild } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxTag } from '../../lib/display';
import { KxCard } from '../../lib/primitives';

/**
 * The "Boarding pass" block — see sign-in.ts for how block fixtures work.
 *
 * Angular has no PassCard component, so this is the same anatomy composed from the primitives it does have:
 * a card, a fact grid as a real `<dl>`, a dashed `<hr>` for the tear line, a `<figure>` for the supplied code
 * and a footer. The shared contract is the anatomy and the semantics, not the component names.
 *
 * Every value is supplied: the block looks nothing up, converts no time zone and encodes nothing. The QR
 * placeholder stands in for the code the product or the issuer generates, sits on its own opaque light quiet
 * zone so a scanner still works in a dark theme, and is `aria-hidden` because the figure is named by its
 * `role="img"` wrapper and the readable code is printed beneath it.
 *
 * The route is words ("Riyadh (RUH) to Cairo (CAI)"), not an arrow, so it reads correctly in both directions.
 * Gate, seat and group are emphasised because they are what a traveller looks for at a glance, and the grid
 * reflows to fewer columns at 200% text rather than truncating a gate. Boarding status is a word in a tag.
 *
 * The confirmation code is a labelled group: the code selects in one click and the copy button is named
 * "Copy Confirmation code". The result goes into an always-rendered `role="status"` region, so it is
 * announced — and when the clipboard is missing or refused, the block selects the code and says so instead
 * of claiming a copy that did not happen.
 *
 * All data here is fictional, Kinetix Air included.
 */
// kx-block:start
const FIELDS = [
  { label: 'Passenger', value: 'Amira Haddad', emphasis: false, time: '' },
  { label: 'Flight', value: 'KX 1180', emphasis: false, time: '' },
  { label: 'Boards', value: '2 Apr, 06:15', emphasis: false, time: '2026-04-02T06:15' },
  { label: 'Gate', value: 'C21', emphasis: true, time: '' },
  { label: 'Seat', value: '9A', emphasis: true, time: '' },
  { label: 'Group', value: '3', emphasis: true, time: '' },
];

const CONFIRMATION_CODE = 'KX7F2Q9';

@Component({
  selector: 'app-boarding-pass-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxCard, KxTag],
  template: `
    <kx-card class="pass">
      <header class="head">
        <span class="who">
          <h3 class="title">Boarding pass</h3>
          <p class="route">Kinetix Air · Riyadh (RUH) to Cairo (CAI)</p>
        </span>
        <!-- A word, not a colour. -->
        <kx-tag variant="secondary">Boarding</kx-tag>
      </header>

      <dl class="fields">
        @for (field of fields; track field.label) {
          <div [class.emphasis]="field.emphasis">
            <dt>{{ field.label }}</dt>
            <dd>
              @if (field.time) {
                <!-- Its own dir="auto" run: a Latin date begins with a digit, and in an RTL paragraph the
                     bidi algorithm would move that digit to the other end ("Apr, 06:15 2"). -->
                <time [attr.datetime]="field.time" dir="auto">{{ field.value }}</time>
              } @else {
                {{ field.value }}
              }
            </dd>
          </div>
        }
      </dl>

      <hr class="tear" />

      <figure class="code">
        <span role="img" aria-label="Boarding pass QR code">
          <!-- A stand-in for the code the product supplies: a fixed pattern, not an encoding of anything. -->
          <svg viewBox="0 0 25 25" width="132" height="132" shape-rendering="crispEdges" aria-hidden="true">
            <rect x="0" y="0" width="25" height="25" fill="#fff" />
            <path
              fill="#000"
              d="M2 2h7v7h-7zM4 4h3v3h-3zM16 2h7v7h-7zM18 4h3v3h-3zM2 16h7v7h-7zM4 18h3v3h-3zM11 2h1v1h-1zM13 2h1v1h-1zM11 4h3v1h-3zM12 6h1v1h-1zM11 8h1v1h-1zM13 8h1v1h-1zM2 11h1v1h-1zM4 11h3v1h-3zM8 11h1v1h-1zM11 11h3v1h-3zM16 11h1v1h-1zM18 11h3v1h-3zM22 11h1v1h-1zM2 13h3v1h-3zM6 13h1v1h-1zM9 13h1v1h-1zM12 13h1v1h-1zM14 13h3v1h-3zM19 13h1v1h-1zM21 13h2v1h-2zM11 15h1v1h-1zM13 15h3v1h-3zM17 15h1v1h-1zM19 15h1v1h-1zM21 15h1v1h-1zM12 17h1v1h-1zM14 17h1v1h-1zM16 17h3v1h-3zM20 17h1v1h-1zM22 17h1v1h-1zM11 19h3v1h-3zM15 19h1v1h-1zM17 19h2v1h-2zM20 19h1v1h-1zM12 21h1v1h-1zM14 21h2v1h-2zM17 21h1v1h-1zM19 21h3v1h-3z"
            />
          </svg>
        </span>
        <figcaption class="reference" role="group" aria-labelledby="bp-ref-label">
          <span class="label" id="bp-ref-label">Confirmation code</span>
          <span class="reference-row">
            <span class="value" translate="no" #code>{{ confirmationCode }}</span>
            <button kxButton variant="Outline" size="sm" type="button" aria-labelledby="bp-copy-text bp-ref-label" (click)="copy()">
              <span id="bp-copy-text">Copy</span>
            </button>
          </span>
          <span class="feedback" role="status" [class.failed]="feedback() === 'failed'">{{ message() }}</span>
        </figcaption>
      </figure>

      <footer class="foot">The gate closes 20 minutes before departure.</footer>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 24rem; }
    .pass { display: block; overflow: hidden; }
    .head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--spacing-2) var(--spacing-4); padding: var(--spacing-5) var(--spacing-5) var(--spacing-3); }
    .who { display: grid; gap: var(--spacing-1); min-inline-size: 0; }
    .title { margin: 0; font: var(--text-title-md); font-weight: 600; color: hsl(var(--foreground)); }
    .route { margin: 0; font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    /* As many columns as fit at a minimum width, so 200% text and a phone fall to fewer columns instead of
       truncating a gate number. */
    .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr)); gap: var(--spacing-3) var(--spacing-4); margin: 0; padding: var(--spacing-3) var(--spacing-5); }
    .fields div { display: grid; gap: 0.125rem; min-inline-size: 0; }
    .fields dt { font: var(--text-label-sm); color: hsl(var(--muted-foreground)); }
    .fields dd { margin: 0; min-inline-size: 0; font: var(--text-body-md); font-weight: 500; color: hsl(var(--foreground)); overflow-wrap: anywhere; }
    .fields .emphasis dd { font: var(--text-title-lg); font-weight: 600; font-variant-numeric: tabular-nums; }
    .tear { margin: var(--spacing-1) var(--spacing-5); border: 0; border-block-start: 2px dashed hsl(var(--border)); }
    .code { display: grid; justify-items: center; gap: var(--spacing-2); margin: 0; padding: var(--spacing-4) var(--spacing-5); }
    .code svg { display: block; max-inline-size: 100%; height: auto; }
    .reference { display: grid; justify-items: center; gap: var(--spacing-1); min-inline-size: 0; }
    .label { font: var(--text-label-sm); color: hsl(var(--muted-foreground)); }
    .reference-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--spacing-2) var(--spacing-3); }
    .value { min-inline-size: 0; font-family: var(--font-mono, ui-monospace, monospace); font-weight: 600; letter-spacing: 0.05em; user-select: all; overflow-wrap: anywhere; }
    .feedback { font: var(--text-body-sm); color: hsl(var(--muted-foreground)); text-align: center; }
    .feedback.failed { color: hsl(var(--destructive)); }
    .foot { border-block-start: 1px solid hsl(var(--border) / 0.6); background: hsl(var(--muted) / 0.3); padding: var(--spacing-3) var(--spacing-5); font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
  `,
})
export class BoardingPassBlock implements OnDestroy {
  readonly fields = FIELDS;
  readonly confirmationCode = CONFIRMATION_CODE;

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
