import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  contentChildren,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  viewChild,
} from '@angular/core';

/**
 * Disclosure: accordion and collapsible — one gesture, two shapes.
 *
 * ── The contract (written before the code) ─────────────────────────────────
 *
 * Trigger
 *   - a real `<button type="button">`, so Enter and Space activate it with no key handling of ours, and a
 *     disabled trigger is a disabled button: out of the tab order and inert to the pointer
 *   - `aria-expanded` says whether its content is shown; `aria-controls` names that content's `id`, which is
 *     generated once per instance and always present in the DOM, open or closed, so the reference never points
 *     at nothing
 *   - activating it leaves focus on it — disclosure reveals content, it does not move the reader into it
 *
 * Content
 *   - stays mounted while closed, under `visibility: hidden`: out of the accessibility tree and the tab order,
 *     and still the element `aria-controls` names
 *   - an accordion panel is a `region` labelled by its trigger (React/Radix do the same); a collapsible's
 *     content takes no role, because it is usually a fragment of a larger surface, not a landmark-sized section
 *
 * Accordion, additionally (WAI-ARIA APG, "Accordion")
 *   - each trigger sits in a heading at a level the page chooses (`headingLevel`, default 3), carried by
 *     `role="heading"` + `aria-level` for the same reason `kx-card-title` does: `<ng-content>` projects once
 *   - `type="single"` (default) or `type="multiple"`, the two modes React's Accordion has
 *   - `collapsible` lets the open item of a single accordion close again. Without it the open trigger reports
 *     `aria-disabled="true"`, as the APG asks of a panel that cannot be collapsed — it stays focusable, because
 *     a reader must still be able to reach and read it
 *   - every trigger is its own Tab stop; ArrowDown/ArrowUp move between triggers (wrapping) and Home/End jump to
 *     the ends, skipping disabled ones. Arrow keys move focus only — they never open anything
 *   - vertical only. The arrows are therefore the same in RTL: up and down do not mirror. A horizontal accordion
 *     (React exposes `orientation`) is not offered: no product in this repository uses one, and it would bring
 *     direction-dependent arrows with no consumer to prove them on
 *
 * ── Motion ─────────────────────────────────────────────────────────────────
 *
 * The content's block size animates from 0 to its natural size and back over `--duration-fast`, decelerating
 * on the way in (`--easing-enter`) and accelerating on the way out (`--easing-exit`) — the tokens React's
 * accordion and collapsible keyframes use. The mechanism is idiomatic to CSS rather than ported from Radix:
 * the host is a one-row grid whose track transitions from `0fr` to `1fr`. That needs no measured height
 * variable and no JavaScript, so it cannot fall out of step with content that changes while open.
 *
 * `visibility` rides along as a discrete transition: it turns visible at the start of an expansion and hidden
 * at the END of a collapse, so the content is seen shrinking rather than vanishing, and is unreachable once it
 * is gone.
 *
 * Under `prefers-reduced-motion: reduce` both transitions are `none` (styles.css). Angular renders the end state
 * directly — there is no animation-end event the component waits for, so nothing needs React's 0.01ms floor to
 * keep a lifecycle moving. The final state is identical: open is full height and visible, closed is zero and
 * hidden. `scripts/angular-browser.mjs` proves both, in both directions, in Chromium.
 *
 * The body clips with `overflow: clip` plus `overflow-clip-margin`, not `overflow: hidden`: the height has to
 * clip while it animates, but a focus ring on a link that sits flush with the content's edge must not be cut.
 */

let nextId = 0;
/** One id stem per disclosure, so trigger and content can name each other without the caller inventing ids. */
export const disclosureId = (kind: string): string => `kx-${kind}-${nextId++}`;

/* ── accordion ──────────────────────────────────────────────────────────── */

/**
 *   <kx-accordion type="single" collapsible [(value)]="open">
 *     <kx-accordion-item value="shipping">
 *       <kx-accordion-trigger>Shipping</kx-accordion-trigger>
 *       <kx-accordion-content>Orders leave the warehouse within two working days.</kx-accordion-content>
 *     </kx-accordion-item>
 *   </kx-accordion>
 *
 * `value` is the list of open items' values, in both modes — in `single` it holds at most one. One shape for
 * both modes keeps the two-way binding typed without a union the template would have to narrow.
 */
@Component({
  selector: 'kx-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-accordion',
    '[attr.data-type]': 'type()',
  },
})
export class KxAccordion {
  readonly type = input<'single' | 'multiple'>('single');
  /** In `single` mode, whether the open item may be closed again, leaving none open. */
  readonly collapsible = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The heading level each trigger sits in. */
  readonly headingLevel = input(3, { transform: numberAttribute });
  /** Two-way: the values of the open items. */
  readonly value = model<readonly string[]>([]);

  private readonly triggers = contentChildren(forwardRef(() => KxAccordionTrigger), { descendants: true });

  isOpen(item: string): boolean {
    return this.value().includes(item);
  }

  /** Whether activating this open item would do nothing — a single accordion that is not collapsible. */
  locked(item: string): boolean {
    return this.type() === 'single' && !this.collapsible() && this.isOpen(item);
  }

  toggle(item: string): void {
    if (this.locked(item)) return;
    const open = this.isOpen(item);
    if (this.type() === 'multiple') this.value.set(open ? this.value().filter((v) => v !== item) : [...this.value(), item]);
    else this.value.set(open ? [] : [item]);
  }

  /** APG accordion keys, on the triggers: focus moves, nothing opens. */
  onKeydown(event: KeyboardEvent, from: KxAccordionTrigger): void {
    const enabled = this.triggers().filter((t) => !t.item.isDisabled());
    const at = enabled.indexOf(from);
    if (at === -1 || enabled.length === 0) return;
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = (at + 1) % enabled.length;
    else if (event.key === 'ArrowUp') next = (at - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    if (next === null) return;
    event.preventDefault();
    enabled[next]!.focus();
  }
}

@Component({
  selector: 'kx-accordion-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-accordion__item',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class KxAccordionItem {
  readonly accordion = inject(KxAccordion);
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly id = disclosureId('accordion');
  readonly triggerId = `${this.id}-trigger`;
  readonly contentId = `${this.id}-content`;

  readonly open = computed(() => this.accordion.isOpen(this.value()));
  readonly isDisabled = computed(() => this.disabled() || this.accordion.disabled());
}

/**
 * The heading and its button. The chevron is built in (as the dismiss glyph is in banner and inform): a
 * disclosure control whose only state cue is the caller remembering to add an icon is one nobody can see.
 * It points down and turns to point up when open. It does not mirror in RTL — down is down in both directions.
 */
@Component({
  selector: 'kx-accordion-trigger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #button
      type="button"
      class="kx-accordion__trigger"
      [id]="item.triggerId"
      [attr.aria-expanded]="item.open()"
      [attr.aria-controls]="item.contentId"
      [attr.aria-disabled]="item.accordion.locked(item.value()) ? 'true' : null"
      [disabled]="item.isDisabled()"
      (click)="item.accordion.toggle(item.value())"
      (keydown)="item.accordion.onKeydown($event, this)"
    >
      <span class="kx-accordion__label"><ng-content /></span>
      <svg class="kx-accordion__chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  `,
  host: {
    class: 'kx-accordion__heading',
    role: 'heading',
    '[attr.aria-level]': 'item.accordion.headingLevel()',
  },
})
export class KxAccordionTrigger {
  readonly item = inject(KxAccordionItem);
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  focus(): void {
    this.button().nativeElement.focus();
  }
}

@Component({
  selector: 'kx-accordion-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="kx-disclosure__body"><div class="kx-accordion__inner"><ng-content /></div></div>',
  host: {
    class: 'kx-disclosure kx-accordion__content',
    role: 'region',
    '[id]': 'item.contentId',
    '[attr.aria-labelledby]': 'item.triggerId',
    '[attr.data-state]': 'item.open() ? "open" : "closed"',
  },
})
export class KxAccordionContent {
  readonly item = inject(KxAccordionItem);
}

/* ── collapsible ────────────────────────────────────────────────────────── */

/**
 *   <kx-collapsible [(open)]="showAdvanced">
 *     <button kxButton kxCollapsibleTrigger variant="Ghost">Advanced settings</button>
 *     <kx-collapsible-content>…</kx-collapsible-content>
 *   </kx-collapsible>
 *
 * One trigger, one region. The trigger is a directive on the caller's own `<button>`, so it can be any button
 * the design calls for (a ghost `kxButton`, a link-styled one) and keeps every native behaviour.
 */
@Component({
  selector: 'kx-collapsible',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-collapsible',
    '[attr.data-state]': 'open() ? "open" : "closed"',
  },
})
export class KxCollapsible {
  /** Two-way: whether the content is shown. */
  readonly open = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly contentId = `${disclosureId('collapsible')}-content`;

  toggle(): void {
    if (!this.disabled()) this.open.set(!this.open());
  }
}

@Directive({
  selector: 'button[kxCollapsibleTrigger]',
  host: {
    type: 'button',
    '[attr.aria-expanded]': 'collapsible.open()',
    '[attr.aria-controls]': 'collapsible.contentId',
    '[attr.data-state]': 'collapsible.open() ? "open" : "closed"',
    '[disabled]': 'collapsible.disabled()',
    '(click)': 'collapsible.toggle()',
  },
})
export class KxCollapsibleTrigger {
  readonly collapsible = inject(KxCollapsible);
}

@Component({
  selector: 'kx-collapsible-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div class="kx-disclosure__body"><ng-content /></div>',
  host: {
    class: 'kx-disclosure kx-collapsible__content',
    '[id]': 'collapsible.contentId',
    '[attr.data-state]': 'collapsible.open() ? "open" : "closed"',
  },
})
export class KxCollapsibleContent {
  readonly collapsible = inject(KxCollapsible);
}
