import {
  Directive,
  ElementRef,
  InjectionToken,
  type ModelSignal,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import { KxActiveDescendant, KxTypeahead, isTypeaheadKey, moveForKey, readableText, type KxDescendantItem } from './collection';
import { disclosureId } from './disclosure';
import { KxFloatingRoot, KxFloatingSurface, type CloseReason } from './floating';
import { activeElement, isFocusTarget, type KxSide } from './overlay';

/**
 * The listbox layer: what select, command, the combobox recipe and multi-select share. Nothing in this file is
 * exported from `public-api.ts`.
 *
 * Wave C2a built the collection core (collection.ts) for menus, where focus MOVES onto each item. A listbox
 * keeps focus where the reader is — on a select's trigger, in a command palette's search field, in a
 * multi-select's input — and says which option is current with `aria-activedescendant` (collection.ts,
 * `KxActiveDescendant`). Everything about the walk is the core's: the same `moveIndex`, the same disabled-skip,
 * the same typeahead. What this file adds is what a listbox means that a menu does not:
 *
 *   value        an option HAS a value, and the collection says which are chosen. Three selection modes, and
 *                `aria-selected` follows the mode, not the highlight:
 *                  single     select — the chosen value; the highlight is a separate thing
 *                  multiple   multi-select — every chosen value (`aria-multiselectable` on the listbox)
 *                  none       command — options are actions with no lasting value, so selection follows the
 *                             highlight (cmdk's and APG's "selection follows focus" for an action list)
 *   filtering    an option can be hidden by a filter (`isHidden`), which takes it out of the walk, out of the
 *                accessibility tree (`hidden`) and out of `aria-activedescendant` in the same change
 *   modality     a highlight that came from the keyboard draws the focus ring; one under a resting pointer does
 *                not (the C2a menu rule, so the two collections agree)
 *
 * The parts:
 *
 *   KxOptionList    the controller every owner holds: the active-descendant state, the selection mode, the
 *                   vertical keys, typeahead and pointer highlight. Owners provide it to their options with
 *                   `KX_OPTION_LIST`.
 *   KxOptionBase    what every option element shares (`role="option"`, its id, `aria-selected`,
 *                   `aria-disabled`, `hidden`, highlight, click and pointer).
 *   KxOptionField   the root of a FIELD that opens a listbox (select, multi-select): a floating root (it opens
 *                   and closes like any C1 surface) that is also a form control (`ControlValueAccessor`).
 *   KxOptionPopup   that field's popup surface: a C1 floating surface with `role="listbox"`. The popup never
 *                   takes focus — a press inside it keeps focus where it was — so there is nothing to give back
 *                   when it closes unless focus was lost meanwhile.
 *
 * None of these names starts with `KxList…`: the evidence extractor credits a symbol to the catalogue entry
 * whose name is its prefix (covered-slugs.mjs), and `List` is the `list` component's.
 */

export type KxSelectionMode = 'single' | 'multiple' | 'none';

export interface KxOptionListConfig<T extends KxOptionBase> {
  /** The options, in document order (a content or view query). */
  items: () => readonly T[];
  selection: KxSelectionMode;
  /** Whether an option is chosen; `none` ignores it. */
  isSelected?: (option: T) => boolean;
  /** Whether a filter hides an option. */
  isHidden?: (option: T) => boolean;
  /** An enabled option was chosen, by a click or by the owner's Enter. */
  activate: (option: T) => void;
}

/** The controller an owner (select, command, multi-select) holds and gives to its options. */
export class KxOptionList<T extends KxOptionBase = KxOptionBase> {
  readonly descendant: KxActiveDescendant<T>;
  /** How the current option became current: a keyboard highlight draws the ring, a pointer's does not. */
  readonly modality = signal<'keyboard' | 'pointer'>('keyboard');
  private readonly typeahead = new KxTypeahead();

  constructor(private readonly config: KxOptionListConfig<T>) {
    this.descendant = new KxActiveDescendant<T>(config.items);
  }

  /**
   * Nothing to list: every option filtered out. A `role="listbox"` must own options, so an empty one is exposed
   * as a plain container holding its "no results" text — the field's `aria-controls` still points at it.
   */
  readonly empty = computed(() => this.descendant.visible().length === 0);

  get selection(): KxSelectionMode {
    return this.config.selection;
  }

  /** `aria-selected` for an option: by value in `single` and `multiple`, by the highlight in `none`. */
  isSelected(option: T): boolean {
    if (this.config.selection === 'none') return this.descendant.current() === option;
    return this.config.isSelected?.(option) ?? false;
  }

  isHidden(option: T): boolean {
    return this.config.isHidden?.(option) ?? false;
  }

  isCurrent(option: T): boolean {
    return this.descendant.current() === option;
  }

  /** Choose `option`. A disabled or hidden option is exposed but never operable. */
  activate(option: T): void {
    if (option.isDisabled() || option.isHidden()) return;
    this.config.activate(option);
  }

  /** Make `option` current, recording how. */
  highlight(option: T | null, modality: 'keyboard' | 'pointer'): T | null {
    this.modality.set(modality);
    return this.descendant.set(option);
  }

  /**
   * The vertical keys, for whichever element holds focus. ArrowDown / ArrowUp move and STOP at the ends (as
   * Radix's Select and cmdk do by default); Home / End jump only where the owner says they belong to the list —
   * a closed select's trigger has no caret, a search field does and keeps them. Returns whether the key was the
   * list's.
   */
  navigate(event: KeyboardEvent, { homeEnd }: { homeEnd: boolean }): boolean {
    if ((event.key === 'Home' || event.key === 'End') && !homeEnd) return false;
    const move = moveForKey(event.key, 'vertical', false);
    if (!move) return false;
    event.preventDefault();
    const target = this.descendant.target(move, false);
    // at an end there is nowhere to go: the current option stays, and the key is still the list's
    if (target) this.highlight(target, 'keyboard');
    else if (!this.descendant.current()) this.highlight(this.descendant.target(move === 'previous' ? 'last' : 'first', false, null), 'keyboard');
    return true;
  }

  /**
   * Typeahead: a printable key adds to the buffer, and the match from `from` (the current option by default)
   * comes back. A Space joins a search already in progress ("new y…"); on its own it is not a search.
   */
  typeaheadFor(event: KeyboardEvent, from: T | null = this.descendant.current()): T | null {
    const space = event.key === ' ' && this.searching && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (!isTypeaheadKey(event) && !space) return null;
    return this.descendant.match(this.typeahead.push(event.key), (o) => o.text(), from);
  }
  /** Whether a typeahead search is in progress — a Space then belongs to it rather than choosing. */
  get searching(): boolean {
    return this.typeahead.search.length > 0;
  }

  /** The pointer moved over an option: it becomes current, unless it is disabled. */
  pointerMoved(option: T, event: PointerEvent): void {
    if (event.pointerType === 'touch' || option.isDisabled()) return;
    if (this.descendant.current() !== option || this.modality() !== 'pointer') this.highlight(option, 'pointer');
  }

  /** Forget the current option and any typeahead — on close, so a reopened list starts clean. */
  clear(): void {
    this.typeahead.clear();
    this.descendant.active.set(null);
  }
}

export const KX_OPTION_LIST = new InjectionToken<KxOptionList>('KxOptionList');

/**
 * What every option shares. Options are never focused: the field keeps focus and names the current option with
 * `aria-activedescendant`. A press on an option is kept from moving focus (`mousedown` is prevented) so the
 * field stays where typing reaches it.
 */
@Directive({
  host: {
    role: 'option',
    '[id]': 'domId()',
    '[attr.aria-selected]': 'list.isSelected(this) ? "true" : "false"',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-highlighted]': 'list.isCurrent(this) ? list.modality() : null',
    '[attr.data-state]': 'list.selection !== "none" && list.isSelected(this) ? "checked" : "unchecked"',
    '[hidden]': 'isHidden()',
    '(mousedown)': '$event.preventDefault()',
    '(pointermove)': 'list.pointerMoved(this, $event)',
    '(click)': 'list.activate(this)',
  },
})
export abstract class KxOptionBase implements KxDescendantItem {
  readonly list = inject(KX_OPTION_LIST);
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Your own id, static or bound; `aria-activedescendant` follows it. Generated (and unique) when absent. */
  readonly id = input<string | undefined>(undefined);
  /** Exposed but not operable: skipped by the keys and typeahead, never current, never chosen. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The text typeahead and filtering match, when the option's own text is not it. */
  readonly textValue = input<string | undefined>(undefined);
  private readonly generated = disclosureId('option');
  readonly domId = computed(() => this.id() || this.generated);

  constructor() {
    // Keep the current option in view as the keys move through a list that scrolls. Only a keyboard highlight
    // scrolls: a pointer is already where it points.
    afterRenderEffect({
      write: () => {
        if (this.list.isCurrent(this) && this.list.modality() === 'keyboard') this.el.scrollIntoView?.({ block: 'nearest' });
      },
    });
  }

  /** The value the option stands for: what a select or multi-select stores, what a command item emits. */
  abstract optionValue(): string;

  isDisabled(): boolean {
    return this.disabled();
  }
  isHidden(): boolean {
    return this.list.isHidden(this);
  }
  text(): string {
    return this.textValue() ?? readableText(this.el);
  }
}

/* ── a field that opens a listbox ───────────────────────────────────────── */

/**
 * The root of select and multi-select: a floating root (open, close, the reason it closed — floating.ts) and a
 * form control. `ControlValueAccessor` is written out here rather than inherited from forms.ts's `KxValueBase`
 * because a class has one base, and this one's must be the floating root its popup surface stands on; the
 * plumbing is the same three members.
 */
@Directive()
export abstract class KxOptionField<T> extends KxFloatingRoot implements ControlValueAccessor {
  abstract readonly value: ModelSignal<T>;
  abstract readonly list: KxOptionList;
  /** `aria-multiselectable` on the popup. */
  abstract readonly multiple: boolean;
  readonly disabled = input(false, { transform: booleanAttribute });
  protected readonly formDisabled = signal(false);
  isDisabled(): boolean {
    return this.disabled() || this.formDisabled();
  }

  constructor() {
    super();
    // Disabled while open, from `[disabled]` or a form: the popup closes, so no option can be pressed after it.
    effect(() => {
      if (this.isDisabled() && untracked(this.open)) untracked(() => this.hide('programmatic'));
    });
  }

  protected onChange: (value: T) => void = () => {};
  protected onTouched: () => void = () => {};
  abstract writeValue(value: T): void;
  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
    if (isDisabled) this.hide('programmatic');
  }

  /** The element that keeps focus while the popup is open: the trigger or the input. */
  abstract focusTarget(): HTMLElement | null;
  /**
   * What names the popup's listbox: the field's own name. A listbox needs one (axe, `aria-input-field-name`),
   * and pointing `aria-labelledby` at the field itself would not do — an input referenced that way contributes
   * its VALUE, not its label. So the field's `aria-labelledby` is reused when it has one; otherwise the text of
   * its `<label>`s, else its `aria-label`, becomes the listbox's `aria-label`.
   */
  popupLabelledby(): string | null {
    return this.focusTarget()?.getAttribute('aria-labelledby') ?? null;
  }
  popupLabel(): string | null {
    if (this.popupLabelledby()) return null;
    const field = this.focusTarget() as (HTMLElement & { labels?: NodeListOf<HTMLLabelElement> | null }) | null;
    const labels = field?.labels ? Array.from(field.labels) : [];
    const text = labels.length ? labels.map((l) => readableText(l)).join(' ') : field?.getAttribute('aria-label');
    return text || null;
  }
  /** `aria-activedescendant` for the field: the current option's id, only while the popup shows it. */
  readonly activeDescendant = computed(() => (this.open() ? this.list.descendant.activeId() : null));

  /** The field lost focus: tell the form, once the reader has left it. */
  touched(): void {
    this.onTouched();
  }
}

/**
 * The popup of a select or multi-select: a C1 floating surface (top layer, `autoPlace`, one layer on the stack,
 * so Escape closes it alone and a press outside closes it) with `role="listbox"`. At least as wide as the field
 * it opens from. It holds no focus: a press inside it is kept from moving focus, so focus is still on the
 * field when it closes. If focus was lost while it was open, Escape or a choice puts it back on the field.
 * While a filter leaves no option it drops the listbox role (a listbox must own options) and shows its empty text.
 */
@Directive({
  host: {
    '[attr.role]': 'root.list.empty() ? null : "listbox"',
    '[attr.aria-labelledby]': 'root.list.empty() ? null : root.popupLabelledby()',
    '[attr.aria-label]': 'root.list.empty() ? null : root.popupLabel()',
    '[attr.aria-multiselectable]': 'root.multiple && !root.list.empty() ? "true" : null',
    '[attr.data-modality]': 'root.list.modality()',
    '(mousedown)': '$event.preventDefault()',
  },
})
export abstract class KxOptionPopup extends KxFloatingSurface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- select's and multi-select's value types differ
  abstract override readonly root: KxOptionField<any>;
  readonly side = input<KxSide>('bottom');
  override readonly align = input<'start' | 'center' | 'end'>('start');
  readonly closesOnFocusOutside = true;

  protected override afterShow(): void {
    const anchor = this.root.anchor ?? this.root.trigger;
    if (!anchor) return;
    this.el.style.setProperty('--kx-field-width', `${anchor.getBoundingClientRect().width}px`);
    // The width just set can change the surface's size: place it again against the size it now has. A fixed
    // box shrinks to the room left of its viewport edge, so it is measured from the start edge first — a long
    // option then gets the width it needs in one placement, not a frame later.
    this.el.style.left = '0px';
    this.reposition();
  }

  protected override afterHide(reason: CloseReason): void {
    this.root.list.clear();
    const lost = !activeElement(this.doc);
    const back = this.root.focusTarget();
    if (lost && (reason === 'escape' || reason === 'select' || reason === 'close' || reason === 'programmatic') && isFocusTarget(back)) back.focus();
  }
}
