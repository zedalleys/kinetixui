import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { KxKbd, KxKbdGroup } from '../../lib/display';
import { KxSegment, KxSegmentedControl, KxToggleGroup, KxToggleGroupItem } from '../../lib/toggles';

/**
 * The "Editor toolbar" block — see sign-in.ts for how block fixtures work.
 *
 * Two different kinds of choice, deliberately given two different controls: the mode is one-of-two and
 * changes the whole surface, so it is a segmented control; the marks are independent and combine, so they are
 * a multi-select toggle group. Using one control for both is the usual way a toolbar stops making sense.
 *
 * The formatting controls disable in Preview. Leaving them live would offer an action that cannot happen.
 *
 * Each toggle's accessible name is real text, visually hidden with `.kx-sr-only`, rather than an `aria-label`.
 * It stays in the DOM, it is translated along with the rest of the page, and it cannot silently disagree with
 * the glyph next to it. The glyph itself is `aria-hidden`, so "B" is never read as a letter.
 */
// kx-block:start
const FORMATS = [
  { value: 'bold', name: 'Bold', glyph: 'B', shortcut: 'B', className: 'bold' },
  { value: 'italic', name: 'Italic', glyph: 'I', shortcut: 'I', className: 'italic' },
  { value: 'code', name: 'Code', glyph: '</>', shortcut: 'E', className: 'code' },
];

@Component({
  selector: 'app-editor-toolbar-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxKbd, KxKbdGroup, KxSegment, KxSegmentedControl, KxToggleGroup, KxToggleGroupItem],
  template: `
    <div class="frame">
      <div class="bar">
        <kx-segmented-control [(value)]="mode">
          <kx-segment value="write">Write</kx-segment>
          <kx-segment value="preview">Preview</kx-segment>
        </kx-segmented-control>

        <kx-toggle-group type="multiple" [(value)]="marks" [disabled]="mode() === 'preview'">
          @for (mark of formats; track mark.value) {
            <kx-toggle-group-item [value]="mark.value">
              <span class="kx-sr-only">{{ mark.name }}</span>
              <span aria-hidden="true" [class]="mark.className">{{ mark.glyph }}</span>
            </kx-toggle-group-item>
          }
        </kx-toggle-group>
      </div>

      <p class="shortcuts">
        @for (mark of formats; track mark.value) {
          <span class="shortcut">
            {{ mark.name }}
            <kbd kxKbdGroup><kbd kxKbd>⌘</kbd><kbd kxKbd>{{ mark.shortcut }}</kbd></kbd>
          </span>
        }
      </p>
    </div>
  `,
  styles: `
    :host { display: block; max-inline-size: 32rem; }
    .frame {
      padding: var(--spacing-2);
      border: var(--border-width-default) solid hsl(var(--border));
      border-radius: var(--radius-lg);
      background: hsl(var(--card));
      color: hsl(var(--card-foreground));
    }
    .bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--spacing-2); }
    .shortcuts {
      display: flex; flex-wrap: wrap; gap: var(--spacing-1) var(--spacing-4);
      margin: var(--spacing-2) 0 0; padding-inline: var(--spacing-1);
      font: var(--text-body-sm); color: hsl(var(--muted-foreground));
    }
    .shortcut { display: inline-flex; align-items: center; gap: var(--spacing-2); }
    .bold { font-weight: 700; }
    .italic { font-style: italic; }
    .code { font-family: var(--font-mono, monospace); font-size: 0.75rem; }
  `,
})
export class EditorToolbarBlock {
  readonly mode = signal('write');
  readonly marks = signal<string | string[] | null>(['bold']);

  protected readonly formats = FORMATS;
}
// kx-block:end
