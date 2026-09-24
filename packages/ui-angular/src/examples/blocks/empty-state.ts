import { ChangeDetectionStrategy, Component } from '@angular/core';
import { KxButton } from '../../lib/button';
import {
  KxEmpty,
  KxEmptyContent,
  KxEmptyDescription,
  KxEmptyHeader,
  KxEmptyMedia,
  KxEmptyTitle,
} from '../../lib/display';

/**
 * The "Empty state" block — see sign-in.ts for how block fixtures work.
 *
 * `kx-empty-media` is already `aria-hidden`, so the glyph inside it is decoration by construction and the
 * heading carries the meaning. The block is content and nothing else; the layout belongs to the component,
 * which is what a composition should look like when the primitives are doing their job.
 */
// kx-block:start
@Component({
  selector: 'app-empty-state-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxButton, KxEmpty, KxEmptyContent, KxEmptyDescription, KxEmptyHeader, KxEmptyMedia, KxEmptyTitle],
  template: `
    <kx-empty>
      <kx-empty-header>
        <kx-empty-media variant="icon">&#128229;</kx-empty-media>
        <kx-empty-title>No messages yet</kx-empty-title>
        <kx-empty-description>When someone messages you, it will show up here.</kx-empty-description>
      </kx-empty-header>
      <kx-empty-content>
        <button kxButton (click)="start()">Start a conversation</button>
      </kx-empty-content>
    </kx-empty>
  `,
})
export class EmptyStateBlock {
  start(): void {}
}
// kx-block:end
