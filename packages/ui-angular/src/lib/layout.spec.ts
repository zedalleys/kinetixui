import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { KxCarousel, KxCarouselContent, KxCarouselItem, KxCarouselNext, KxCarouselPrevious, slidesInView, snapPositions } from './carousel';
import { KxComparisonSlider } from './comparison-slider';
import { KxPointerDrag } from './pointer-drag';
import { KxResizableHandle, KxResizablePanel, KxResizablePanelGroup, defaultLayout, reachable, resizePair } from './resizable';
import { KxScrollArea } from './scroll-area';

// The layout tranche as logic and semantics in jsdom: the pure position rules (resize, reachable range, snap
// positions, slides in view), the pointer-drag lifecycle and its teardown, and the roles, names and values each
// component renders. jsdom has no layout, no scrolling and no pointer capture of its own; the drag, the keyboard
// in both directions, scroll geometry, resize observation, 200% text and motion are measured in Chromium by
// scripts/angular-layout.mjs.

function host<T extends object>(template: string, imports: unknown[], state: T = {} as T) {
  @Component({ template, imports: imports as never[] })
  class Host {}
  Object.assign(Host.prototype, state);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}
const settle = async (fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) => {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};

/* ── pure rules ─────────────────────────────────────────────────────────── */

describe('resizable rules', () => {
  it('moves one boundary, keeping the pair total, inside both panels’ limits', () => {
    expect(resizePair([50, 50], 0, 10, [20, 25], [80, 100])).toEqual([60, 40]);
    expect(resizePair([50, 50], 0, 40, [20, 25], [80, 100])).toEqual([75, 25]); // the after panel's min
    expect(resizePair([50, 50], 0, -40, [20, 25], [80, 100])).toEqual([20, 80]); // the before panel's min
    expect(resizePair([25, 50, 25], 1, 100, [10, 10, 10], [100, 100, 100])).toEqual([25, 65, 10]);
  });
  it('reports the reachable range, not the panel’s own limits alone', () => {
    expect(reachable([50, 50], 0, [20, 25], [80, 100])).toEqual({ lo: 20, hi: 75 });
  });
  it('shares what defaults leave between the panels without one', () => {
    expect(defaultLayout([25, 50, undefined], [0, 0, 0], [100, 100, 100])).toEqual([25, 50, 25]);
    expect(defaultLayout([undefined, undefined], [0, 0], [100, 100])).toEqual([50, 50]);
  });
});

describe('carousel rules', () => {
  const full = [0, 1, 2, 3, 4].map((i) => ({ start: i * 116, size: 100 }));
  it('one position per slide when a slide fills the view', () => {
    expect(snapPositions(full.map((s, i) => ({ start: i * 100, size: 100 })), 100)).toEqual([0, 100, 200, 300, 400]);
  });
  it('trims the end so the last view is full (three to a view over five gives three positions)', () => {
    expect(snapPositions(full, 332)).toEqual([0, 116, 232]);
  });
  it('one position when everything fits', () => {
    expect(snapPositions(full.slice(0, 2), 400)).toEqual([0]);
  });
  it('says which slides a view shows', () => {
    expect(slidesInView(full, 116, 332)).toEqual([1, 2, 3]);
    expect(slidesInView(full, 0, 100)).toEqual([0]);
  });
});

/* ── the pointer drag ───────────────────────────────────────────────────── */

describe('pointer drag', () => {
  const pointer = (type: string, init: Partial<PointerEvent> = {}) => Object.assign(new Event(type, { bubbles: true }), { pointerId: 1, clientX: 0, clientY: 0, ...init }) as PointerEvent;

  it('captures, reports travel from the press, ends once, and leaves no listener behind', () => {
    const el = document.createElement('div');
    document.body.append(el);
    el.setPointerCapture = vi.fn();
    el.hasPointerCapture = vi.fn(() => true);
    el.releasePointerCapture = vi.fn();
    const add = vi.spyOn(el, 'addEventListener');
    const remove = vi.spyOn(el, 'removeEventListener');
    const move = vi.fn();
    const end = vi.fn();
    const drag = new KxPointerDrag();
    expect(drag.start(el, pointer('pointerdown', { clientX: 10, clientY: 5 }), { move, end })).toBe(true);
    expect(el.setPointerCapture).toHaveBeenCalledWith(1);
    expect(drag.start(el, pointer('pointerdown'), { move, end })).toBe(false); // one drag at a time
    el.dispatchEvent(pointer('pointermove', { clientX: 30, clientY: 9 }));
    el.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 99 })); // another pointer
    expect(move).toHaveBeenCalledTimes(1);
    expect(move.mock.calls[0]!.slice(0, 2)).toEqual([20, 4]);
    el.dispatchEvent(pointer('pointerup'));
    el.dispatchEvent(pointer('lostpointercapture'));
    expect(end).toHaveBeenCalledTimes(1);
    expect(end.mock.calls[0]![0]).toBe(true);
    expect(drag.active).toBe(false);
    for (const [type] of add.mock.calls) expect(remove.mock.calls.some((c) => c[0] === type)).toBe(true);
    el.remove();
  });

  it('a cancel, a lost capture or dispose ends it as not released', () => {
    for (const how of ['pointercancel', 'lostpointercapture', 'dispose'] as const) {
      const el = document.createElement('div');
      el.setPointerCapture = vi.fn();
      const end = vi.fn();
      const drag = new KxPointerDrag();
      drag.start(el, pointer('pointerdown'), { move: vi.fn(), end });
      if (how === 'dispose') drag.dispose();
      else el.dispatchEvent(pointer(how));
      expect(end).toHaveBeenCalledWith(false, how === 'dispose' ? null : expect.anything());
      expect(drag.active).toBe(false);
    }
  });

  it('page mode listens on the document only while the drag runs', () => {
    const el = document.createElement('div');
    document.body.append(el);
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const drag = new KxPointerDrag();
    drag.start(el, pointer('pointerdown'), { move: vi.fn(), end: vi.fn() }, 'page');
    const added = add.mock.calls.map((c) => c[0]);
    expect(added).toEqual(['pointermove', 'pointerup', 'pointercancel']);
    document.dispatchEvent(pointer('pointerup'));
    for (const type of added) expect(remove.mock.calls.some((c) => c[0] === type)).toBe(true);
    add.mockRestore();
    remove.mockRestore();
    el.remove();
  });
});

/* ── semantics ──────────────────────────────────────────────────────────── */

describe('resizable', () => {
  it('a handle is a focusable window splitter announcing the panel before it', async () => {
    const { el, fixture } = host(
      `<kx-resizable-panel-group>
         <kx-resizable-panel id="a" [defaultSize]="30" [minSize]="20" />
         <kx-resizable-handle withHandle />
         <kx-resizable-panel [minSize]="10" />
       </kx-resizable-panel-group>`,
      [KxResizablePanelGroup, KxResizablePanel, KxResizableHandle],
    );
    await settle(fixture);
    const handle = el.querySelector('kx-resizable-handle')!;
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('tabindex')).toBe('0');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-controls')).toBe('a');
    expect([handle.getAttribute('aria-valuenow'), handle.getAttribute('aria-valuemin'), handle.getAttribute('aria-valuemax')]).toEqual(['30', '20', '90']);
    expect(handle.getAttribute('aria-label')).toBe('Resize');
    expect(el.querySelector<HTMLElement>('#a')!.style.flex).toMatch(/^30 1 0/);
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await settle(fixture);
    expect(handle.getAttribute('aria-valuenow')).toBe('90');
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    await settle(fixture);
    expect(handle.getAttribute('aria-valuenow')).toBe('20');
  });
});

describe('scroll area', () => {
  it('content that fits is not a Tab stop and draws no bar', async () => {
    const { el, fixture } = host('<kx-scroll-area label="Tags"><p>Short</p></kx-scroll-area>', [KxScrollArea]);
    await settle(fixture);
    const viewport = el.querySelector('.kx-scroll-area__viewport')!;
    expect(viewport.hasAttribute('tabindex')).toBe(false);
    expect(viewport.hasAttribute('role')).toBe(false);
    expect(el.querySelector('.kx-scroll-area__scrollbar')).toBeNull();
  });
});

describe('carousel', () => {
  it('a named region of slides, controls named, aria-disabled (never disabled) at the start', async () => {
    const { el, fixture } = host(
      `<kx-carousel aria-label="Featured">
         <kx-carousel-content><kx-carousel-item>1</kx-carousel-item><kx-carousel-item>2</kx-carousel-item></kx-carousel-content>
         <button kxCarouselPrevious></button><button kxCarouselNext></button>
       </kx-carousel>`,
      [KxCarousel, KxCarouselContent, KxCarouselItem, KxCarouselPrevious, KxCarouselNext],
    );
    await settle(fixture);
    const region = el.querySelector('kx-carousel')!;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('aria-roledescription')).toBe('carousel');
    const slides = el.querySelectorAll('kx-carousel-item');
    expect([...slides].map((s) => [s.getAttribute('role'), s.getAttribute('aria-roledescription'), s.getAttribute('aria-label')])).toEqual([
      ['group', 'slide', '1 of 2'],
      ['group', 'slide', '2 of 2'],
    ]);
    const prev = el.querySelector<HTMLButtonElement>('button.kx-carousel__previous')!;
    expect(prev.textContent).toContain('Previous slide');
    expect(prev.disabled).toBe(false);
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    expect(prev.type).toBe('button');
    expect(el.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});

describe('comparison slider', () => {
  it('one native slider, named, held to 0–100', async () => {
    const { el, fixture } = host('<kx-comparison-slider [value]="value" />', [KxComparisonSlider], { value: 150 });
    await settle(fixture);
    const inputs = el.querySelectorAll('input');
    expect(inputs).toHaveLength(1);
    const input = inputs[0]!;
    expect(input.type).toBe('range');
    expect(input.getAttribute('aria-label')).toBe('Comparison position');
    expect([input.min, input.max]).toEqual(['0', '100']);
    expect(input.value).toBe('100');
    expect(el.querySelector<HTMLElement>('kx-comparison-slider')!.style.getPropertyValue('--kx-comparison-position')).toBe('100%');
    expect(el.querySelector('.kx-comparison-slider__handle')!.getAttribute('aria-hidden')).toBe('true');
  });
});
