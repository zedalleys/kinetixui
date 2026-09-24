import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxCard, KxCardContent, KxCardFooter, KxCardHeader, KxCardTitle } from '../../lib/primitives';
import { KxSkeleton, KxSpinner } from '../../lib/display';

/**
 * The "Loading state" block — see sign-in.ts for how block fixtures work.
 *
 * A skeleton is a picture of nothing. It says "wait" to someone who can see the shapes and absolutely
 * nothing to anyone who cannot, so the region says so out loud: `aria-busy` marks it as pending and
 * `aria-live="polite"` gives a screen reader something to announce. Without that the card is silent until
 * the data lands, which is the single most common defect in this pattern.
 *
 * The shapes match what will replace them — an avatar circle and two lines of text — so nothing moves when
 * the data arrives.
 *
 * The spinner in the footer is `aria-hidden`: the button already says "Loading", and saying it twice is
 * noise rather than redundancy.
 */
// kx-block:start
@Component({
  selector: 'app-loading-state-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxCard, KxCardContent, KxCardFooter, KxCardHeader, KxCardTitle, KxSkeleton, KxSpinner],
  template: `
    <kx-card>
      <kx-card-header>
        <kx-card-title>Activity</kx-card-title>
      </kx-card-header>
      <kx-card-content class="body" aria-busy="true" aria-live="polite">
        <span class="kx-sr-only">Loading activity</span>
        @for (row of rows; track row) {
          <div class="row">
            <kx-skeleton class="avatar" />
            <div class="lines">
              <kx-skeleton class="line-title" />
              <kx-skeleton class="line-meta" />
            </div>
          </div>
        }
      </kx-card-content>
      <kx-card-footer>
        <button kxButton variant="Outline" class="more" disabled>
          <kx-spinner size="sm" aria-hidden="true" />
          Loading
        </button>
      </kx-card-footer>
    </kx-card>
  `,
  styles: `
    :host { display: block; max-inline-size: 24rem; }
    .body { display: grid; gap: var(--spacing-4); }
    .row { display: flex; align-items: center; gap: var(--spacing-3); }
    .avatar { flex-shrink: 0; inline-size: 2.5rem; block-size: 2.5rem; border-radius: var(--radius-full, 9999px); }
    .lines { display: grid; flex: 1; gap: var(--spacing-2); }
    .line-title { block-size: 1rem; inline-size: 66%; }
    .line-meta { block-size: 0.75rem; inline-size: 33%; }
    .more { inline-size: 100%; gap: var(--spacing-2); }
  `,
})
export class LoadingStateBlock {
  readonly rows = [0, 1, 2];
}
// kx-block:end
