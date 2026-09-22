import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  contentChildren,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

/**
 * Tabs — the package's first composite, and where the keyboard pattern is established.
 *
 *   <kx-tabs [(value)]="tab">
 *     <kx-tab-list aria-label="Account">
 *       <button kxTab value="profile">Profile</button>
 *       <button kxTab value="billing">Billing</button>
 *     </kx-tab-list>
 *     <kx-tab-panel value="profile">…</kx-tab-panel>
 *     <kx-tab-panel value="billing">…</kx-tab-panel>
 *   </kx-tabs>
 *
 * Follows the APG tabs pattern: one stop in the page tab order (roving tabindex), arrows move between tabs,
 * Home/End jump to the ends, and selection follows focus (automatic activation) because the panels here are
 * cheap to render. Arrow direction is resolved against the computed writing direction, so in an RTL document
 * ArrowLeft moves to the *next* tab — mirroring what the Compose port already tested for.
 *
 * Ids are generated once per tab so `aria-controls`/`aria-labelledby` can point at each other without the
 * caller having to invent and thread two ids per tab.
 */

let nextId = 0;

@Directive({
  selector: 'button[kxTab]',
  host: {
    class: 'kx-tab',
    type: 'button',
    role: 'tab',
    '[id]': 'id',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-controls]': 'panelId',
    '[attr.tabindex]': 'selected() ? 0 : -1',
    '[disabled]': 'disabled()',
    '(click)': 'tabs.select(value())',
    '(keydown)': 'tabs.onKeydown($event)',
  },
})
export class KxTab {
  readonly tabs = inject(KxTabs);
  readonly el = inject<ElementRef<HTMLButtonElement>>(ElementRef);
  readonly value = input.required<string>();
  readonly disabled = input(false);

  readonly id = `kx-tab-${nextId++}`;
  readonly panelId = `${this.id}-panel`;

  selected(): boolean {
    return this.tabs.value() === this.value();
  }
}

@Component({
  selector: 'kx-tab-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-tab-list', role: 'tablist' },
})
export class KxTabList {}

/**
 * The panel is focusable (`tabindex="0"`) because after Tab moves out of the tab list the next stop must be
 * the panel itself — otherwise a keyboard user lands past the content the tab just revealed. Hidden panels are
 * removed from the DOM rather than merely hidden, so nothing inside them is reachable or announced.
 */
@Component({
  selector: 'kx-tab-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '@if (active()) { <ng-content /> }',
  host: {
    class: 'kx-tab-panel',
    role: 'tabpanel',
    '[attr.tabindex]': 'active() ? 0 : null',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[hidden]': '!active()',
  },
})
export class KxTabPanel {
  private readonly tabs = inject(KxTabs);
  readonly value = input.required<string>();

  active(): boolean {
    return this.tabs.value() === this.value();
  }
  labelledBy(): string | null {
    return this.tabs.tabFor(this.value())?.id ?? null;
  }
}

@Component({
  selector: 'kx-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-tabs' },
})
export class KxTabs {
  /** Two-way: `[(value)]` for a controlled tab strip, or leave it and let the first tab win. */
  readonly value = model<string>('');
  private readonly tabs = contentChildren(KxTab, { descendants: true });
  private readonly initialised = signal(false);

  tabFor(value: string): KxTab | undefined {
    return this.tabs().find((t) => t.value() === value);
  }

  select(value: string): void {
    this.value.set(value);
  }

  /** Falls back to the first enabled tab when nothing is selected, so an uncontrolled strip still works. */
  constructor() {
    queueMicrotask(() => {
      if (this.initialised()) return;
      this.initialised.set(true);
      if (!this.value()) {
        const first = this.tabs().find((t) => !t.disabled());
        if (first) this.value.set(first.value());
      }
    });
  }

  onKeydown(event: KeyboardEvent): void {
    const enabled = this.tabs().filter((t) => !t.disabled());
    if (enabled.length === 0) return;
    const current = enabled.findIndex((t) => t.value() === this.value());
    const rtl = this.isRtl();
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';

    let next: number | null = null;
    if (event.key === forward) next = (current + 1) % enabled.length;
    else if (event.key === back) next = (current - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    if (next === null) return;

    event.preventDefault();
    const target = enabled[next]!;
    this.select(target.value());
    target.el.nativeElement.focus();
  }

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The document's own direction, read at the moment of the keypress rather than taken as an input — an
   * application that flips `dir` at runtime keeps working with no extra wiring.
   *
   * The nearest `[dir]` ancestor is checked before the computed style. Computed direction is the more correct
   * answer when direction comes from CSS, but it is also the one a DOM implementation is free not to inherit,
   * so relying on it alone makes the behaviour depend on the environment rather than on the markup.
   */
  private isRtl(): boolean {
    const node = this.el.nativeElement;
    const explicit = node.closest('[dir]')?.getAttribute('dir')?.toLowerCase();
    if (explicit === 'rtl' || explicit === 'ltr') return explicit === 'rtl';
    return node.ownerDocument.defaultView?.getComputedStyle(node).direction === 'rtl';
  }
}
