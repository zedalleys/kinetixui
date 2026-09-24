import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxButton } from '../../lib/button';

/**
 * The "CTA banner" block — see sign-in.ts for how block fixtures work.
 *
 * `flex-wrap` rather than a breakpoint: the actions drop below the copy when there is no room for them, at
 * whatever width that turns out to be — including the width caused by a longer translation or a larger text
 * size, neither of which a media query knows about. The heading is an `<h3>` so the section keeps a document
 * outline instead of being styled text.
 */
// kx-block:start
@Component({
  selector: 'app-cta-banner-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton],
  template: `
    <section class="banner">
      <div>
        <h3>Ship with one token architecture</h3>
        <p>Built from the same design-token contract on every supported platform.</p>
      </div>
      <div class="actions">
        <button kxButton (click)="start()">Get started</button>
        <button kxButton variant="Outline" (click)="docs()">Read the docs</button>
      </div>
    </section>
  `,
  styles: `
    .banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-4);
      padding: var(--spacing-8);
      border: var(--border-width-default) solid hsl(var(--border));
      border-radius: var(--radius-container);
    }
    .banner h3 { margin: 0; font: var(--text-title-lg); }
    .banner p { margin: var(--spacing-1) 0 0; font: var(--text-body-sm); color: hsl(var(--muted-foreground)); }
    .actions { display: flex; flex-wrap: wrap; gap: var(--spacing-2); }
  `,
})
export class CtaBannerBlock {
  start(): void {}
  docs(): void {}
}
// kx-block:end
