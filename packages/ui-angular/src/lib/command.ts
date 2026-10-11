import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  type Signal,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { readableText } from './collection';
import { KX_DIALOG, KxDialogContent, KxDialogRoot } from './dialog';
import { disclosureId } from './disclosure';
import { KX_OPTION_LIST, KxOptionBase, KxOptionList } from './listbox';

/**
 * Command: a search field over a list of actions — the primitive a command palette, a quick switcher or the
 * combobox recipe is built from. It is a composition of parts, not a modal: put it in a page, a popover or
 * `kx-command-dialog`.
 *
 *   <kx-command label="Commands" [(search)]="query">
 *     <input kxCommandInput placeholder="Type a command or search…" />
 *     <kx-command-list>
 *       <kx-command-empty>No results.</kx-command-empty>
 *       <kx-command-group heading="Suggestions">
 *         <kx-command-item value="calendar" (select)="go($event)">Calendar</kx-command-item>
 *         <kx-command-item value="emoji" [keywords]="['smiley']">Search emoji</kx-command-item>
 *         <kx-command-item value="calculator" disabled>Calculator</kx-command-item>
 *       </kx-command-group>
 *       <kx-command-separator />
 *       <kx-command-group heading="Settings">
 *         <kx-command-item value="profile">Profile <kx-command-shortcut>Ctrl+P</kx-command-shortcut></kx-command-item>
 *       </kx-command-group>
 *     </kx-command-list>
 *   </kx-command>
 *
 * ── Semantics ──────────────────────────────────────────────────────────────
 *
 * The search field is `role="combobox"` with `aria-autocomplete="list"`, `aria-expanded` (true while the list
 * shows any item: it is always on the page), `aria-controls` and `aria-activedescendant`. When a search leaves
 * nothing, the list drops its listbox role (a listbox must own options), the field reads collapsed, and the
 * empty text shows. The list is `role="listbox"`, named by `label`
 * — which also names the field unless the field has a label of its own. Items are `role="option"`; because
 * they are actions with no lasting value, `aria-selected` follows the highlight (selection follows focus). A
 * group is `role="group"` named by its heading.
 *
 * ── Focus stays in the field ───────────────────────────────────────────────
 *
 * Typing filters; ArrowDown / ArrowUp move the highlight and stop at the ends (cmdk's default); Enter runs the
 * highlighted item (`select` emits its value). Home, End and the horizontal arrows stay the field's caret keys,
 * and Escape is left to whatever holds the command — a popover or the command dialog closes on it.
 *
 * Filtering is local and synchronous: the default filter keeps an item whose text, value or keywords contain the
 * search, case-insensitively. The query is never sent anywhere — no analytics, no instrumentation. Pass your own
 * `filter`, or `[filter]="null"` when you filter the items yourself. A filtered-out item is `hidden`: out of the
 * accessibility tree, out of the walk, and never the active descendant. Whenever the search changes the
 * highlight goes back to the first match, and if the highlighted item disappears for any other reason (removed,
 * disabled) it moves to the first item that remains — the field never points at an option that is not there.
 */

export interface KxCommandFilterItem {
  readonly text: string;
  readonly value: string;
  readonly keywords: readonly string[];
}
/** Whether an item stays visible for `search`. */
export type KxCommandFilter = (search: string, item: KxCommandFilterItem) => boolean;

const containsFilter: KxCommandFilter = (search, item) => {
  const needle = search.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [item.text, item.value, ...item.keywords].some((t) => t.toLocaleLowerCase().includes(needle));
};

@Component({
  selector: 'kx-command',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: KX_OPTION_LIST, useFactory: () => inject(KxCommand).list }],
  template: '<ng-content />',
  host: { class: 'kx-command' },
})
export class KxCommand {
  /** Two-way: the search text. */
  readonly search = model('');
  /** Names the list, and the search field unless it has a label of its own. */
  readonly label = input.required<string>();
  /** Which items a search keeps. `null` keeps them all: you filter the items yourself. */
  readonly filter = input<KxCommandFilter | null>(containsFilter);
  private readonly items = contentChildren(forwardRef(() => KxCommandItem), { descendants: true });
  readonly list = new KxOptionList({
    items: () => this.items(),
    selection: 'none',
    isHidden: (item) => !this.matches(item as KxCommandItem),
    activate: (item) => (item as KxCommandItem).run(),
  });
  private readonly base = disclosureId('command');
  /** The list's id, static, bound or generated. */
  readonly listIdFrom = signal<Signal<string | undefined> | null>(null);
  readonly listId = computed(() => this.listIdFrom()?.() || `${this.base}-list`);
  /** How many items the search leaves showing. */
  readonly visibleCount = computed(() => this.list.descendant.visible().length);

  constructor() {
    // A new search starts the highlight over at the first match.
    effect(() => {
      this.search();
      untracked(() => this.list.descendant.reset());
    });
    // The highlight is never left on nothing while something is showing: when the current item goes away
    // (filtered, removed, disabled) the first remaining one takes over.
    effect(() => {
      const current = this.list.descendant.current();
      const visible = this.list.descendant.visible();
      if (!current && visible.length) untracked(() => this.list.descendant.reset());
    });
  }

  private matches(item: KxCommandItem): boolean {
    const filter = this.filter();
    const search = this.search();
    if (!filter || !search) return true;
    return filter(search, { text: item.text(), value: item.optionValue(), keywords: item.keywords() });
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.isComposing || event.defaultPrevented) return;
    if (this.list.navigate(event, { homeEnd: false })) return;
    if (event.key === 'Enter') {
      const current = this.list.descendant.current();
      if (!current) return;
      event.preventDefault();
      this.list.activate(current);
    }
  }
}

/**
 * The search field: put it on your own `<input>`. It is the combobox — focus stays here while the keys move the
 * highlight through the list.
 */
@Directive({
  selector: 'input[kxCommandInput]',
  host: {
    class: 'kx-command__input',
    type: 'text',
    role: 'combobox',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-autocomplete': 'list',
    '[attr.aria-expanded]': 'command.visibleCount() > 0',
    '[attr.aria-controls]': 'command.listId()',
    '[attr.aria-activedescendant]': 'command.list.descendant.activeId()',
    '[attr.aria-label]': 'ariaLabelledby() ? null : command.label()',
    '[attr.aria-labelledby]': 'ariaLabelledby()',
    '[value]': 'command.search()',
    '(input)': 'command.search.set($any($event.target).value)',
    '(keydown)': 'command.onInputKeydown($event)',
  },
})
export class KxCommandInput {
  readonly command = inject(KxCommand);
  /** A visible label of your own for the field; the command's `label` names it otherwise. */
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
}

/** The list: `role="listbox"`, named by the command's `label` — a plain container while nothing matches. Scrolls inside itself. */
@Component({
  selector: 'kx-command-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-command__list',
    '[attr.role]': 'command.list.empty() ? null : "listbox"',
    '[id]': 'command.listId()',
    '[attr.aria-label]': 'command.list.empty() ? null : command.label()',
    '(mousedown)': '$event.preventDefault()',
  },
})
export class KxCommandList {
  readonly command = inject(KxCommand);
  /** Your own id, static or bound; the field's `aria-controls` follows it. */
  readonly id = input<string | undefined>(undefined);
  constructor() {
    this.command.listIdFrom.set(this.id);
  }
}

/** Shown while the search leaves nothing showing. */
@Component({
  selector: 'kx-command-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-command__empty', '[hidden]': 'command.visibleCount() > 0' },
})
export class KxCommandEmpty {
  readonly command = inject(KxCommand);
}

/** `role="group"` named by `heading`; hidden while the search leaves none of its items showing. */
@Component({
  selector: 'kx-command-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (heading()) {
      <div class="kx-option-label" [id]="headingId" aria-hidden="true">{{ heading() }}</div>
    }
    <ng-content />
  `,
  host: {
    class: 'kx-option-group',
    role: 'group',
    '[attr.aria-labelledby]': 'heading() ? headingId : null',
    '[hidden]': 'empty()',
  },
})
export class KxCommandGroup {
  readonly heading = input<string | undefined>(undefined);
  protected readonly headingId = `${disclosureId('command')}-heading`;
  private readonly items = contentChildren(forwardRef(() => KxCommandItem), { descendants: true });
  protected readonly empty = computed(() => {
    const items = this.items();
    return items.length > 0 && items.every((i) => i.isHidden());
  });
}

/** A rule between groups; decorative, and hidden while a search is filtering the list. */
@Component({
  selector: 'kx-command-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { class: 'kx-option-separator', 'aria-hidden': 'true', '[hidden]': '!!command.search()' },
})
export class KxCommandSeparator {
  readonly command = inject(KxCommand);
}

const COMMAND_TEXT_SKIP = 'kx-command-shortcut, [aria-hidden="true"]';

/**
 *   <kx-command-item value="profile" [keywords]="['account']" (select)="open($event)">Profile</kx-command-item>
 *
 * `role="option"`. Enter or a press runs it: `select` emits its `value` (its text, when it has none).
 */
@Component({
  selector: 'kx-command-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-option' },
})
export class KxCommandItem extends KxOptionBase {
  /** What `select` emits and the filter matches; the item's text when absent. */
  readonly value = input<string | undefined>(undefined);
  /** More words the filter matches, beyond the text and value. */
  readonly keywords = input<readonly string[]>([]);
  /** The item was run — by Enter or a press. Emits its value. */
  readonly select = output<string>();

  optionValue(): string {
    return this.value() ?? this.text();
  }
  override text(): string {
    return this.textValue() ?? readableText(this.el, COMMAND_TEXT_SKIP);
  }
  run(): void {
    this.select.emit(this.optionValue());
  }
}

/** The keyboard shortcut an item also has, at its inline end. Left out of what the filter matches. */
@Component({
  selector: 'kx-command-shortcut',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-command__shortcut' },
})
export class KxCommandShortcut {}

/**
 *   <kx-command-dialog [(open)]="paletteOpen" label="Command palette">
 *     <kx-command label="Commands">…</kx-command>
 *   </kx-command-dialog>
 *
 * A command in a modal dialog (the C1 dialog, so the page behind is inert, Escape closes it and focus goes back
 * to where it was). Focus starts in the search field. Opening it from a keyboard shortcut is the app's business.
 */
@Component({
  selector: 'kx-command-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxDialogContent],
  providers: [{ provide: KX_DIALOG, useExisting: forwardRef(() => KxCommandDialog) }],
  template: `<dialog kxDialogContent class="kx-command-dialog" [label]="label()" [closeButton]="false"><ng-content /></dialog>`,
  host: { class: 'kx-overlay-root' },
})
export class KxCommandDialog extends KxDialogRoot {
  /** Names the dialog. */
  readonly label = input('Command palette');
}
