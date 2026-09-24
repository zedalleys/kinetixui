import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KxButton } from '../../lib/button';
import { KxCard, KxCardContent } from '../../lib/primitives';
import { KxAvatar, KxAvatarFallback } from '../../lib/display';
import { KxField, KxFieldLabel, KxTextarea } from '../../lib/forms';

/**
 * The "Comment box" block — see sign-in.ts for how block fixtures work.
 *
 * The field carries a visible label rather than leaning on the placeholder. A placeholder is announced as a
 * value, vanishes the moment typing starts, and leaves the control nameless — the most common accessibility
 * defect in a comment form, and the reason `kx-field` exists.
 *
 * The submit button is disabled while the box is empty, so the disabled state carries a real meaning rather
 * than being decorative.
 */
// kx-block:start
@Component({
  selector: 'app-comment-box-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxAvatar, KxAvatarFallback, KxButton, KxCard, KxCardContent, KxField, KxFieldLabel, KxTextarea],
  template: `
    <kx-card>
      <kx-card-content>
        <div class="row">
          <kx-avatar>
            <kx-avatar-fallback>ZF</kx-avatar-fallback>
          </kx-avatar>
          <kx-field class="field">
            <label kxFieldLabel for="comment">Add a comment</label>
            <textarea
              kxTextarea
              id="comment"
              rows="3"
              [value]="comment()"
              (input)="comment.set($any($event.target).value)"
            ></textarea>
            <div class="actions">
              <button kxButton [disabled]="!comment().trim()" (click)="submit()">Comment</button>
            </div>
          </kx-field>
        </div>
      </kx-card-content>
    </kx-card>
  `,
  styles: `
    .row { display: flex; align-items: flex-start; gap: var(--spacing-3); }
    .field { flex: 1; min-inline-size: 0; }
    .actions { display: flex; justify-content: flex-end; }
  `,
})
export class CommentBoxBlock {
  readonly comment = signal('');
  submit(): void {
    this.comment.set('');
  }
}
// kx-block:end
