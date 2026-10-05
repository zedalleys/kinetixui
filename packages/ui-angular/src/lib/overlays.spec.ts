import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KxButton } from './button';
import {
  KxAlertDialog,
  KxAlertDialogAction,
  KxAlertDialogCancel,
  KxAlertDialogContent,
  KxDialog,
  KxDialogClose,
  KxDialogContent,
  KxDialogDescription,
  KxDialogFooter,
  KxDialogHeader,
  KxDialogTitle,
  KxDialogTrigger,
  KxModal,
  KxSheet,
  KxSheetContent,
} from './dialog';
import { KxHoverCard, KxHoverCardContent, KxHoverCardTrigger, KxPopover, KxPopoverContent, KxPopoverTrigger, KxTooltip, KxTooltipContent, KxTooltipTrigger } from './floating';
import { KxOverlayStack, computePlacement, physicalSide, type KxDismissReason, type KxLayer, type KxPlacementInput } from './overlay';

// The overlay layer's pure parts and the semantics each surface renders, in jsdom. jsdom has no layout, no top
// layer and no keyboard: everything about focus, Escape, outside presses, placement on a real screen, RTL and
// motion is measured in Chromium by scripts/angular-overlays.mjs and scripts/overlay-visual.mjs. What is here
// is what does not need a browser: the placement arithmetic, the stack's bookkeeping, and the ARIA wiring.

function host<T extends object>(template: string, imports: unknown[], state: T = {} as T) {
  @Component({ template, imports: imports as never[] })
  class Host {}
  Object.assign(Host.prototype, state);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, state: fixture.componentInstance as unknown as T };
}
const settle = async (fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

/* ── placement ──────────────────────────────────────────────────────────── */

const base: KxPlacementInput = {
  anchor: { x: 400, y: 300, width: 100, height: 40 },
  floating: { width: 200, height: 100 },
  viewport: { width: 1000, height: 800 },
  side: 'bottom',
  align: 'center',
  offset: 4,
  padding: 8,
  rtl: false,
};

describe('computePlacement', () => {
  it('places below, centred, with the offset', () => {
    const p = computePlacement(base);
    expect(p).toMatchObject({ x: 350, y: 344, side: 'bottom', flipped: false });
  });

  it('resolves start and end by direction', () => {
    expect(physicalSide('start', false)).toBe('left');
    expect(physicalSide('end', false)).toBe('right');
    expect(physicalSide('start', true)).toBe('right');
    expect(physicalSide('end', true)).toBe('left');
    expect(computePlacement({ ...base, side: 'end' }).x).toBe(504);
    expect(computePlacement({ ...base, side: 'end', rtl: true }).x).toBe(400 - 4 - 200);
  });

  it('aligns logically along the inline axis', () => {
    expect(computePlacement({ ...base, align: 'start' }).x).toBe(400);
    expect(computePlacement({ ...base, align: 'end' }).x).toBe(300);
    // in RTL the inline start is the anchor's right edge
    expect(computePlacement({ ...base, align: 'start', rtl: true }).x).toBe(300);
    expect(computePlacement({ ...base, align: 'end', rtl: true }).x).toBe(400);
  });

  it('flips to the opposite side when the chosen one lacks room and the other has more', () => {
    const p = computePlacement({ ...base, anchor: { ...base.anchor, y: 720 } });
    expect(p.side).toBe('top');
    expect(p.flipped).toBe(true);
    expect(p.y).toBe(720 - 4 - 100);
  });

  it('does not flip into less room', () => {
    // both sides too small: stays on the wanted side and caps its height to the room it has
    const p = computePlacement({ ...base, viewport: { width: 1000, height: 380 }, anchor: { ...base.anchor, y: 150 } });
    expect(p.side).toBe('bottom');
    expect(p.maxHeight).toBe(380 - 190 - 4 - 8);
  });

  it('shifts along the cross axis to stay inside the padding', () => {
    expect(computePlacement({ ...base, anchor: { ...base.anchor, x: 0 } }).x).toBe(8);
    expect(computePlacement({ ...base, anchor: { ...base.anchor, x: 950 } }).x).toBe(1000 - 8 - 200);
  });

  it('caps the size to the room, so large text scrolls inside the surface', () => {
    const p = computePlacement({ ...base, floating: { width: 1200, height: 100 } });
    expect(p.maxWidth).toBe(1000 - 16);
    // wider than the viewport: the start wins, never a negative coordinate
    expect(p.x).toBe(8);
  });
});

/* ── the stack ──────────────────────────────────────────────────────────── */

function layer(modal: boolean, surface: HTMLElement, log: string[], name: string): KxLayer {
  return {
    modal,
    closesOnFocusOutside: !modal,
    surface: () => surface,
    companions: () => [],
    request: (reason: KxDismissReason) => log.push(`${name}:${reason}`),
  };
}

describe('KxOverlayStack', () => {
  it('holds scroll while any modal layer is open — derived, so an inner modal closing cannot release it', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const stack = TestBed.inject(KxOverlayStack);
    const html = document.documentElement;
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const pop = document.createElement('div');
    outer.append(inner);
    document.body.append(outer);
    const log: string[] = [];
    const [a, b, c] = [layer(true, outer, log, 'outer'), layer(true, inner, log, 'inner'), layer(false, pop, log, 'popover')];

    stack.add(a);
    expect(html.hasAttribute('data-kx-scroll-locked')).toBe(true);
    stack.add(b);
    stack.add(c);
    stack.remove(b);
    expect(html.hasAttribute('data-kx-scroll-locked')).toBe(true);
    stack.remove(c);
    expect(html.style.overflow).toBe('hidden');
    stack.remove(a);
    expect(html.hasAttribute('data-kx-scroll-locked')).toBe(false);
    expect(html.style.overflow).toBe('');
    outer.remove();
  });

  it('closing a layer first closes the layers nested inside it, and only those', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const stack = TestBed.inject(KxOverlayStack);
    const dialog = document.createElement('div');
    const nested = document.createElement('div');
    const elsewhere = document.createElement('div');
    dialog.append(nested);
    document.body.append(dialog, elsewhere);
    const log: string[] = [];
    const [d, n, e] = [layer(true, dialog, log, 'dialog'), layer(false, nested, log, 'nested'), layer(false, elsewhere, log, 'elsewhere')];
    stack.add(d);
    stack.add(n);
    stack.add(e);
    expect(stack.parentOf(n)).toBe(d);
    stack.remove(d);
    expect(log).toEqual(['nested:parent']);
    expect(stack.open).toEqual([e]);
    stack.remove(e);
    dialog.remove();
    elsewhere.remove();
  });

  it('Escape goes to the topmost layer only', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const stack = TestBed.inject(KxOverlayStack);
    const [s1, s2] = [document.createElement('div'), document.createElement('div')];
    document.body.append(s1, s2);
    const log: string[] = [];
    const [one, two] = [layer(true, s1, log, 'one'), layer(false, s2, log, 'two')];
    stack.add(one);
    stack.add(two);
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(log).toEqual(['two:escape']);
    expect(event.defaultPrevented).toBe(true);
    // an Escape another component already handled (a listbox closing itself) is left alone
    const handled = document.createElement('div');
    handled.addEventListener('keydown', (e) => e.preventDefault());
    s2.append(handled);
    handled.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(log).toEqual(['two:escape']);
    stack.remove(two);
    stack.remove(one);
    // nothing open: no listener, so nothing is asked
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(log).toEqual(['two:escape']);
    s1.remove();
    s2.remove();
  });
});

/* ── semantics ──────────────────────────────────────────────────────────── */

describe('dialog family semantics', () => {
  it('wires the trigger, the name and the description, and stays closed until opened', async () => {
    const { fixture, el, state } = host(
      `
      <kx-dialog [(open)]="open">
        <button kxButton kxDialogTrigger>Edit profile</button>
        <dialog kxDialogContent>
          <kx-dialog-header><h2 kxDialogTitle>Edit profile</h2><p kxDialogDescription>Saved when you press Save.</p></kx-dialog-header>
          <kx-dialog-footer><button kxButton kxDialogClose>Cancel</button></kx-dialog-footer>
        </dialog>
      </kx-dialog>`,
      [KxButton, KxDialog, KxDialogTrigger, KxDialogContent, KxDialogHeader, KxDialogTitle, KxDialogDescription, KxDialogFooter, KxDialogClose],
      { open: signal(false) },
    );
    const trigger = el.querySelector('button')!;
    const dialog = el.querySelector('dialog')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(dialog.getAttribute('aria-labelledby')).toBe(el.querySelector('h2')!.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(el.querySelector('p')!.id);
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(dialog.getAttribute('data-state')).toBe('closed');
    trigger.click();
    await settle(fixture);
    expect((state as { open: () => boolean }).open()).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    (el.querySelector('kx-dialog-footer button') as HTMLButtonElement).click();
    await settle(fixture);
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('uses label as the name when there is no title, and keeps a caller id', () => {
    const { el } = host(`<kx-dialog><dialog kxDialogContent id="mine" label="Upload"></dialog></kx-dialog>`, [KxDialog, KxDialogContent]);
    const dialog = el.querySelector('dialog')!;
    expect(dialog.id).toBe('mine');
    expect(dialog.getAttribute('aria-label')).toBe('Upload');
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('an alert dialog is an alertdialog with no close button', () => {
    const { el } = host(
      `<kx-alert-dialog><dialog kxAlertDialogContent><h2 kxDialogTitle>Delete?</h2><button kxAlertDialogCancel>Cancel</button><button kxAlertDialogAction>Delete</button></dialog></kx-alert-dialog>`,
      [KxAlertDialog, KxAlertDialogContent, KxDialogTitle, KxAlertDialogCancel, KxAlertDialogAction],
    );
    const dialog = el.querySelector('dialog')!;
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.querySelector('.kx-dialog__close')).toBeNull();
  });

  it('a sheet carries its logical side; a modal leaves no title attribute on its host', () => {
    const { el } = host(
      `<kx-sheet><dialog kxSheetContent side="start" label="Filters"></dialog></kx-sheet>
       <kx-modal type="Destructive" title="Delete this view?"></kx-modal>`,
      [KxSheet, KxSheetContent, KxModal],
    );
    expect(el.querySelector('dialog.kx-sheet')!.getAttribute('data-side')).toBe('start');
    expect(el.querySelector('kx-modal')!.hasAttribute('title')).toBe(false);
    const buttons = [...el.querySelectorAll('kx-modal .kx-modal__footer button')].map((b) => b.textContent!.trim());
    expect(buttons).toEqual(['Cancel', 'Delete']);
  });
});

describe('floating family semantics', () => {
  it('a popover trigger says what it opens; the content is a named, non-modal dialog', () => {
    const { el } = host(
      `<kx-popover><button kxPopoverTrigger>Filters</button><kx-popover-content label="Filters">…</kx-popover-content></kx-popover>`,
      [KxPopover, KxPopoverTrigger, KxPopoverContent],
    );
    const [trigger, content] = [el.querySelector('button')!, el.querySelector('kx-popover-content')!];
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('role')).toBe('dialog');
    expect(content.getAttribute('aria-label')).toBe('Filters');
    expect(content.getAttribute('popover')).toBe('manual');
    expect(content.hasAttribute('aria-modal')).toBe(false);
  });

  it('a tooltip is its trigger’s description from the start, and keeps the trigger’s own', () => {
    const { el } = host(
      `<p id="help">Saved to your library.</p>
       <kx-tooltip><button kxTooltipTrigger aria-describedby="help">Save</button><kx-tooltip-content>Ctrl+S</kx-tooltip-content></kx-tooltip>`,
      [KxTooltip, KxTooltipTrigger, KxTooltipContent],
    );
    const [trigger, content] = [el.querySelector('button')!, el.querySelector('kx-tooltip-content')!];
    expect(content.getAttribute('role')).toBe('tooltip');
    expect(trigger.getAttribute('aria-describedby')).toBe(`help ${content.id}`);
  });

  it('a hover card is not a description and has no role', () => {
    const { el } = host(
      `<kx-hover-card><a kxHoverCardTrigger href="/people/ada">Ada</a><kx-hover-card-content>Analyst</kx-hover-card-content></kx-hover-card>`,
      [KxHoverCard, KxHoverCardTrigger, KxHoverCardContent],
    );
    expect(el.querySelector('a')!.hasAttribute('aria-describedby')).toBe(false);
    expect(el.querySelector('kx-hover-card-content')!.hasAttribute('role')).toBe(false);
  });
});
