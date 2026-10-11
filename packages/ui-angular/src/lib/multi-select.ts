import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { KxTag } from './display';
import { disclosureId } from './disclosure';
import { adopt } from './floating';
import { KX_OPTION_LIST, KxOptionBase, KxOptionField, KxOptionList, KxOptionPopup } from './listbox';
import { activeElement } from './overlay';

export interface KxMultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Multi-select: one field holding several chosen values as chips, with a search input that filters a listbox of
 * the options.
 *
 *   <label kxLabel for="labels">Labels</label>
 *   <kx-multi-select inputId="labels" [options]="labels" [(value)]="chosen" placeholder="Add labels…" />
 *
 * ── Semantics ──────────────────────────────────────────────────────────────
 *
 * The field's input is the combobox (`role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`,
 * `aria-controls`, and `aria-activedescendant` while the popup shows). It is named by a `<label for>` its
 * `inputId`, or `aria-label` / `aria-labelledby`, and described by a summary of what is chosen. The popup is
 * `role="listbox"` with `aria-multiselectable="true"`; every option carries `aria-selected` for whether it is
 * CHOSEN — the highlight is a separate state, so moving through the list never reads as choosing. Each chip is a
 * `kx-tag` whose remove button is named "Remove {label}".
 *
 * ── Keys (focus stays in the input) ────────────────────────────────────────
 *
 *   typing          filters the options and opens the popup; the highlight resets to the first match
 *   ArrowDown / Up  open the popup, then move the highlight (stopping at the ends)
 *   Enter           toggles the highlighted option; the popup stays open for the next one. Space types.
 *   Escape          closes the popup (only the popup: the stack gives Escape to the topmost layer)
 *   Backspace       in an empty input, removes the last chip — and says so
 *   Tab             closes the popup and moves on; the chips' remove buttons come first in the Tab order
 *
 * Removing a chip from its button puts focus on the next chip's button, else the previous one's, else the input,
 * so focus never falls to the page. Every change to the chosen set is announced in a polite live region inside
 * the component.
 *
 * With `creatable`, a search that matches no option's label offers "Create “…”", which adds the text itself.
 */
@Component({
  selector: 'kx-multi-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxTag, forwardRef(() => KxMultiSelectPopup), forwardRef(() => KxMultiSelectOptionItem)],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxMultiSelect), multi: true },
    { provide: KX_OPTION_LIST, useFactory: () => inject(KxMultiSelect).list },
  ],
  template: `
    <div class="kx-multi-select__field" (click)="onFieldClick($event)">
      @for (v of value(); track v; let i = $index) {
        <kx-tag
          class="kx-multi-select__chip"
          variant="secondary"
          [removable]="!isDisabled()"
          [removeLabel]="'Remove ' + labelOf(v)"
          (removed)="removeAt(i, true)"
        >{{ labelOf(v) }}</kx-tag>
      }
      <input
        #input
        class="kx-multi-select__input"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        [id]="resolvedInputId()"
        [value]="query()"
        [placeholder]="value().length ? '' : placeholder()"
        [disabled]="isDisabled()"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="contentId()"
        [attr.aria-activedescendant]="activeDescendant()"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-labelledby]="ariaLabelledby()"
        [attr.aria-invalid]="ariaInvalid()"
        [attr.aria-describedby]="describedby()"
        (input)="onInput($any($event.target).value)"
        (keydown)="onInputKeydown($event)"
        (blur)="touched()"
      />
    </div>
    <div kxMultiSelectPopup class="kx-floating kx-option-popup">
      @for (o of options(); track o.value) {
        <div kxMultiSelectOption class="kx-option kx-option--inset" [value]="o.value" [disabled]="!!o.disabled">
          <span class="kx-option__indicator" aria-hidden="true"
            ><svg class="kx-option__mark" viewBox="0 0 16 16" focusable="false"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></span
          >{{ o.label }}
        </div>
      }
      @if (creatable()) {
        <div kxMultiSelectOption class="kx-option kx-option--inset" [value]="createText()" [create]="true">{{ createLabel() }}</div>
      }
      <div class="kx-option-empty" [hidden]="list.descendant.visible().length > 0">{{ emptyLabel() }}</div>
    </div>
    <span class="kx-sr-only" [id]="summaryId">{{ summary() }}</span>
    <span class="kx-sr-only" role="status">{{ announcement() }}</span>
  `,
  host: { class: 'kx-overlay-root kx-multi-select', '[attr.data-disabled]': 'isDisabled() ? "" : null' },
})
export class KxMultiSelect extends KxOptionField<string[]> {
  /** Two-way: the chosen values, in the order they were chosen. */
  readonly value = model<string[]>([]);
  readonly multiple = true;
  readonly options = input<readonly KxMultiSelectOption[]>([]);
  readonly placeholder = input('Select…');
  /** Offer to add the search text when no option's label matches it. */
  readonly creatable = input(false, { transform: booleanAttribute });
  /** Shown in the popup when the search leaves nothing. */
  readonly emptyLabel = input('No results.');
  /** The input's id — what a `<label for>` points at. Generated when absent. */
  readonly inputId = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  readonly ariaLabelledby = input<string | null>(null, { alias: 'aria-labelledby' });
  /** Forwarded to the input, which is what assistive technology reads and what the field's error state keys on. */
  readonly ariaInvalid = input<'true' | 'false' | null>(null, { alias: 'aria-invalid' });
  /** Forwarded to the input, before the summary of what is chosen. */
  readonly ariaDescribedby = input<string | null>(null, { alias: 'aria-describedby' });

  private readonly base = disclosureId('multi-select');
  readonly resolvedInputId = computed(() => this.inputId() || `${this.base}-input`);
  protected readonly summaryId = `${this.base}-summary`;
  protected readonly query = signal('');
  protected readonly announcement = signal('');
  private readonly items = viewChildren(forwardRef(() => KxMultiSelectOptionItem));
  private readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  readonly list = new KxOptionList({
    items: () => this.items(),
    selection: 'multiple',
    ownerDisabled: () => this.isDisabled(),
    isSelected: (option) => this.value().includes(option.optionValue()),
    isHidden: (option) => !this.matches(option as KxMultiSelectOptionItem),
    activate: (option) => this.toggle(option.optionValue()),
  });

  protected readonly createText = computed(() => this.query().trim());
  protected readonly createLabel = computed(() => `Create “${this.createText()}”`);
  private readonly canCreate = computed(() => {
    const text = this.createText().toLocaleLowerCase();
    return this.creatable() && !!text && !this.options().some((o) => o.label.toLocaleLowerCase() === text || o.value.toLocaleLowerCase() === text) && !this.value().some((v) => v.toLocaleLowerCase() === text);
  });
  protected readonly summary = computed(() => {
    const chosen = this.value();
    return chosen.length ? `${chosen.length} selected: ${chosen.map((v) => this.labelOf(v)).join(', ')}` : 'None selected';
  });
  protected readonly describedby = computed(() => [this.ariaDescribedby(), this.summaryId].filter(Boolean).join(' '));

  constructor() {
    super();
    // the field is what the popup is placed against and sized to, and pressing it is not "outside"
    afterNextRender(() => {
      const field = this.inputEl().nativeElement.parentElement;
      this.trigger = field;
      this.anchor = field;
    });
    // a new search starts the highlight at the first match
    effect(() => {
      this.query();
      untracked(() => {
        if (this.open()) this.list.highlight(this.list.descendant.target('first', false, null), 'keyboard');
      });
    });
  }

  focusTarget(): HTMLElement | null {
    return this.inputEl().nativeElement;
  }

  override writeValue(value: string[]): void {
    this.value.set(Array.isArray(value) ? [...value] : []);
  }

  labelOf(value: string): string {
    return this.options().find((o) => o.value === value)?.label ?? value;
  }

  private matches(option: KxMultiSelectOptionItem): boolean {
    if (option.create()) return this.canCreate();
    const needle = this.query().trim().toLocaleLowerCase();
    return !needle || option.text().toLocaleLowerCase().includes(needle);
  }

  private set(next: string[], message: string): void {
    this.value.set(next);
    this.onChange(next);
    this.announcement.set(message);
  }

  private toggle(value: string): void {
    const chosen = this.value();
    const label = this.labelOf(value);
    if (chosen.includes(value)) this.set(chosen.filter((v) => v !== value), `${label} removed`);
    else this.set([...chosen, value], `${label} selected`);
    // a choice made from a search (a created value included): the search has done its job
    if (this.query()) this.query.set('');
  }

  /** Remove the chip at `index`. From its own button, focus moves to a neighbouring chip, else the input. */
  removeAt(index: number, fromChip: boolean): void {
    const chosen = this.value();
    const value = chosen[index];
    if (value === undefined || this.isDisabled()) return;
    this.set(chosen.filter((_, i) => i !== index), `${this.labelOf(value)} removed`);
    if (!fromChip) return;
    // once the chip's own button is gone: its neighbour's, else the input — focus never falls to the page
    afterNextRender(
      () => {
        const focused = activeElement(this.host.ownerDocument);
        if (focused && this.host.contains(focused)) return;
        const buttons = Array.from(this.host.querySelectorAll<HTMLElement>('.kx-multi-select__chip .kx-tag__remove'));
        (buttons[index] ?? buttons[index - 1] ?? this.inputEl().nativeElement).focus();
      },
      { injector: this.injector },
    );
  }

  protected onInput(text: string): void {
    this.query.set(text);
    if (!this.open()) this.show();
    this.list.highlight(this.list.descendant.target('first', false, null), 'keyboard');
  }

  protected onFieldClick(event: MouseEvent): void {
    if (this.isDisabled() || (event.target as Element).closest('.kx-tag__remove')) return;
    this.inputEl().nativeElement.focus();
    if (!this.open()) this.show();
  }

  protected onInputKeydown(event: KeyboardEvent): void {
    if (event.isComposing || event.defaultPrevented || this.isDisabled()) return;
    const key = event.key;
    if ((key === 'ArrowDown' || key === 'ArrowUp') && !this.open()) {
      event.preventDefault();
      this.show();
      this.list.highlight(this.list.descendant.target(key === 'ArrowUp' ? 'last' : 'first', false, null), 'keyboard');
      return;
    }
    if (this.open() && this.list.navigate(event, { homeEnd: false })) return;
    if (key === 'Enter') {
      event.preventDefault();
      const current = this.list.descendant.current();
      if (this.open() && current) this.list.activate(current);
      else if (!this.open()) this.show();
      return;
    }
    if (key === 'Backspace' && !this.query() && this.value().length) {
      event.preventDefault();
      this.removeAt(this.value().length - 1, false);
      return;
    }
    if (key === 'Tab' && this.open()) this.hide('tab');
  }
}

/** The popup surface inside `kx-multi-select`. Internal: not part of the public API. */
@Directive({ selector: '[kxMultiSelectPopup]' })
export class KxMultiSelectPopup extends KxOptionPopup {
  readonly root: KxMultiSelect = adopt(inject(KxMultiSelect), this.id);
}

/** An option inside `kx-multi-select`. Internal: not part of the public API. */
@Directive({ selector: '[kxMultiSelectOption]' })
export class KxMultiSelectOptionItem extends KxOptionBase {
  readonly value = input.required<string>();
  /** The "Create “…”" option: its value is the search text. */
  readonly create = input(false, { transform: booleanAttribute });
  optionValue(): string {
    return this.value();
  }
}
