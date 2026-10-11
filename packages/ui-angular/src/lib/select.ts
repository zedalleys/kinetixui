import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  contentChild,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  effect,
  untracked,
  type ModelSignal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { isTypeaheadKey } from './collection';
import { disclosureId } from './disclosure';
import { adopt } from './floating';
import { KX_OPTION_LIST, KxOptionBase, KxOptionField, KxOptionList, KxOptionPopup } from './listbox';

/**
 * Select: a designed listbox behind a trigger — the control `kxNativeSelect` deliberately is not. Where the
 * platform's own picker is right (a phone, a long plain list), use the native select; this one is for when the
 * options need to look like the rest of the product.
 *
 *   <label kxLabel for="plan">Plan</label>
 *   <kx-select [(value)]="plan">                         (or formControl / [(ngModel)])
 *     <button kxSelectTrigger id="plan"><kx-select-value placeholder="Choose a plan" /></button>
 *     <kx-select-content>
 *       <kx-select-group>
 *         <kx-select-label>Plans</kx-select-label>
 *         <kx-select-item value="free">Free</kx-select-item>
 *         <kx-select-item value="pro">Pro</kx-select-item>
 *         <kx-select-item value="team" disabled>Team</kx-select-item>
 *       </kx-select-group>
 *     </kx-select-content>
 *   </kx-select>
 *
 * ── Semantics ──────────────────────────────────────────────────────────────
 *
 * The trigger is a `<button>` with `role="combobox"` (as Radix's is): `aria-haspopup="listbox"`,
 * `aria-expanded`, `aria-controls` and — while open — `aria-activedescendant` naming the highlighted option. It
 * is named the way any button is: a `<label for>`, `aria-labelledby` or `aria-label`; its text is the chosen
 * value (or the placeholder). The popup is `role="listbox"`, its options `role="option"` with `aria-selected`
 * on the CHOSEN option only — the highlight is a separate state, drawn separately, so arrowing through the list
 * never reads as choosing.
 *
 * ── Focus stays on the trigger ─────────────────────────────────────────────
 *
 * The APG "select-only combobox": the trigger keeps DOM focus the whole time; the options are never focused.
 * So Tab from an open select simply moves on (the select closes and chooses nothing), Escape closes it with
 * focus already where it belongs, and a press on an option chooses it without focus going anywhere.
 *
 *   closed     ArrowDown, ArrowUp, Enter, Space open it, highlighting the chosen option (else the first, or the
 *              last for ArrowUp). A printable key CHOOSES the next option starting with it, without opening —
 *              as a native select does.
 *   open       ArrowDown / ArrowUp move the highlight and stop at the ends (Radix's Select does not wrap);
 *              Home / End jump; typing highlights; Enter or Space chooses the highlight and closes; Escape
 *              closes without choosing; Tab closes without choosing and moves on.
 *   pointer    pressing the trigger toggles it; moving over an option highlights it; pressing one chooses it.
 *
 * Disabled options are announced (`aria-disabled`) and skipped by every key, by typeahead and by the pointer.
 *
 * The popup is a C1 floating surface (overlay.ts): the top layer, placed below the trigger and flipped, shifted
 * and capped to the room it has — so at 200% text or on a narrow screen it scrolls inside itself. It is at least
 * as wide as the trigger, and a long label wraps rather than being cut.
 */
@Component({
  selector: 'kx-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => KxSelect), multi: true },
    { provide: KX_OPTION_LIST, useFactory: () => inject(KxSelect).list },
  ],
  template: '<ng-content />',
  host: { class: 'kx-overlay-root kx-select' },
})
export class KxSelect extends KxOptionField<string | null> {
  /** Two-way: the chosen option's value, or null for none. */
  // Annotated: inferred, the published .d.ts drops `| null` and a consumer's strict AOT build rejects the override.
  readonly value: ModelSignal<string | null> = model<string | null>(null);
  readonly multiple = false;
  private readonly items = contentChildren(forwardRef(() => KxSelectItem), { descendants: true });
  readonly list = new KxOptionList({
    items: () => this.items(),
    selection: 'single',
    ownerDisabled: () => this.isDisabled(),
    isSelected: (option) => option.optionValue() === this.value(),
    activate: (option) => this.choose(option.optionValue()),
  });
  /** The chosen option, while one with the value exists. */
  readonly selected = computed(() => this.items().find((i) => i.optionValue() === this.value()) ?? null);

  constructor() {
    super();
    // Opened through `[(open)]` rather than a key or a press: start on the chosen option all the same, so
    // `aria-activedescendant`, Enter and the arrows work from the first key.
    effect(() => {
      if (!this.open()) return;
      untracked(() => {
        const chosen = this.selected();
        if (!this.list.descendant.current() && chosen && !chosen.isDisabled()) this.list.highlight(chosen, 'pointer');
      });
    });
  }

  focusTarget(): HTMLElement | null {
    return this.trigger;
  }

  override writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  /** Commit a value from the reader: model, form and change, then close. */
  private commit(value: string): void {
    if (value === this.value()) return;
    this.value.set(value);
    this.onChange(value);
  }
  private choose(value: string): void {
    this.commit(value);
    this.hide('select');
  }

  /** Open, highlighting the chosen option — else the first (or, from ArrowUp, the last) enabled one. */
  private openAt(end: 'first' | 'last', modality: 'keyboard' | 'pointer'): void {
    if (this.isDisabled()) return;
    this.show();
    const chosen = this.selected();
    const target = chosen && !chosen.isDisabled() ? chosen : modality === 'keyboard' ? this.list.descendant.target(end, false, null) : null;
    this.list.highlight(target, modality);
  }

  toggle(event: MouseEvent): void {
    if (this.open()) this.hide('close');
    else this.openAt('first', event.detail === 0 ? 'keyboard' : 'pointer');
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || event.defaultPrevented) return;
    const key = event.key;
    if (!this.open()) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault();
        this.openAt(key === 'ArrowUp' ? 'last' : 'first', 'keyboard');
        return;
      }
      // a closed select chooses by typeahead, without opening (a native select's behaviour)
      if (isTypeaheadKey(event)) {
        event.preventDefault();
        const match = this.list.typeaheadFor(event, this.selected());
        if (match) this.commit(match.optionValue());
      }
      return;
    }
    if (key === 'Tab') {
      // Tab leaves: nothing is chosen, and the browser moves focus on from the trigger
      this.hide('tab');
      return;
    }
    if (key === 'Enter' || (key === ' ' && !this.list.searching)) {
      event.preventDefault();
      const current = this.list.descendant.current();
      if (current) this.list.activate(current);
      return;
    }
    if (this.list.navigate(event, { homeEnd: true })) return;
    const match = this.list.typeaheadFor(event);
    if (match || isTypeaheadKey(event) || key === ' ') {
      event.preventDefault();
      if (match) this.list.highlight(match, 'keyboard');
    }
  }
}

const CHEVRON =
  '<svg class="kx-select__chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * The button that opens the select. Put `kx-select-value` inside it; a chevron is drawn at its inline end. Name
 * it as you would any field: `<label for>` its `id`, `aria-labelledby` or `aria-label`.
 */
@Component({
  selector: 'button[kxSelectTrigger]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="kx-select__value"><ng-content /></span>${CHEVRON}`,
  host: {
    class: 'kx-select__trigger',
    type: 'button',
    role: 'combobox',
    'aria-haspopup': 'listbox',
    '[id]': 'resolvedId()',
    '[attr.aria-expanded]': 'root.open()',
    '[attr.aria-controls]': 'root.contentId()',
    '[attr.aria-activedescendant]': 'root.activeDescendant()',
    '[attr.data-state]': 'root.open() ? "open" : "closed"',
    '[attr.data-placeholder]': 'root.selected() ? null : ""',
    '[disabled]': 'root.isDisabled()',
    '(click)': 'root.toggle($event)',
    '(keydown)': 'root.onTriggerKeydown($event)',
    '(blur)': 'root.touched()',
  },
})
export class KxSelectTrigger {
  readonly root = inject(KxSelect);
  /** Your own id, static or bound — what a `<label for>` points at. Generated when absent. */
  readonly id = input<string | undefined>(undefined);
  private readonly generated = `${disclosureId('select')}-trigger`;
  readonly resolvedId = computed(() => this.id() || this.generated);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.root.trigger = el;
    inject(DestroyRef).onDestroy(() => {
      if (this.root.trigger === el) this.root.trigger = null;
    });
  }
}

/** The chosen option's text, or `placeholder` while nothing is chosen. */
@Component({
  selector: 'kx-select-value',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ root.selected()?.text() ?? placeholder() }}`,
  host: { class: 'kx-select__value-text' },
})
export class KxSelectValue {
  readonly root = inject(KxSelect);
  readonly placeholder = input('');
}

/** The popup: `role="listbox"`, named by the trigger. `side` and `align` as for any floating surface. */
@Component({
  selector: 'kx-select-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-floating kx-option-popup' },
})
export class KxSelectContent extends KxOptionPopup {
  readonly root: KxSelect = adopt(inject(KxSelect), this.id);
}

const CHECK =
  '<svg class="kx-option__mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 *   <kx-select-item value="pro">Pro</kx-select-item>
 *
 * `role="option"`. The chosen one carries a check mark at its inline start (a shape, not colour alone) and
 * `aria-selected="true"`.
 */
@Component({
  selector: 'kx-select-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="kx-option__indicator" aria-hidden="true">${CHECK}</span><ng-content />`,
  host: { class: 'kx-option kx-option--inset' },
})
export class KxSelectItem extends KxOptionBase {
  readonly value = input.required<string>();
  optionValue(): string {
    return this.value();
  }
}

/** Names the group it is in. Not an option: the keys pass over it. */
@Component({
  selector: 'kx-select-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-option-label', '[id]': 'resolvedId()' },
})
export class KxSelectLabel {
  readonly id = input<string | undefined>(undefined);
  private readonly generated = `${disclosureId('select')}-label`;
  readonly resolvedId = computed(() => this.id() || this.generated);
}

/** `role="group"`, named by the `kx-select-label` inside it. */
@Component({
  selector: 'kx-select-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-option-group', role: 'group', '[attr.aria-labelledby]': 'heading()?.resolvedId() ?? null' },
})
export class KxSelectGroup {
  protected readonly heading = contentChild(KxSelectLabel);
}

/** A rule between groups. Decorative: hidden from assistive technology, as Radix's is. */
@Component({
  selector: 'kx-select-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { class: 'kx-option-separator', 'aria-hidden': 'true' },
})
export class KxSelectSeparator {}
