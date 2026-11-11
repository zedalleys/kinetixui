import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KxAnimatedNumber } from './animated-number';

afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('numeric continuity', () => {
  it('keeps advancing while retargeted every frame with exact target semantics', () => {
    let now = 0;
    vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    let serial = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => { frames.set(++serial, fn); return serial; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { frames.delete(id); });
    TestBed.configureTestingModule({ imports: [KxAnimatedNumber], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(KxAnimatedNumber);
    fixture.componentRef.setInput('value', 0); fixture.detectChanges();
    const step = (time: number) => { now = time; const batch = [...frames.values()]; frames.clear(); batch.forEach((fn) => fn(time)); fixture.detectChanges(); };
    for (let target = 1; target <= 60; target++) {
      now = (target - 1) * 16;
      const previous = fixture.componentInstance.display();
      fixture.componentRef.setInput('value', target); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.kx-sr-only').textContent).toBe(String(target));
      step(target * 16);
      expect(fixture.componentInstance.display(), `frame ${target} must advance before the next retarget`).toBeGreaterThan(previous);
      expect(fixture.componentInstance.display()).toBeLessThan(target);
    }
    step(1260);
    expect(fixture.componentInstance.display()).toBe(60);
    expect(frames.size).toBe(0);
    fixture.destroy();
  });
  it('renders initial target, retargets, and cancels when the preference changes', () => {
    let now = 0;
    vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    let reduced = false;
    let change = () => {};
    let serial = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }) as unknown as MediaQueryList);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => { frames.set(++serial, fn); return serial; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { frames.delete(id); });
    const step = (time: number) => { now = time; const batch = [...frames.values()]; frames.clear(); batch.forEach((fn) => fn(time)); fixture.detectChanges(); };
    TestBed.configureTestingModule({ imports: [KxAnimatedNumber], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(KxAnimatedNumber);
    fixture.componentRef.setInput('value', 20); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('2020');
    fixture.componentRef.setInput('value', 100); fixture.detectChanges(); step(0); step(150);
    const visual = fixture.nativeElement.querySelector('[aria-hidden]');
    expect(visual.textContent).toBe('60');
    expect(fixture.nativeElement.querySelector('.kx-sr-only').textContent).toBe('100');
    now = 200; fixture.componentRef.setInput('value', -20); fixture.detectChanges(); step(200); step(350);
    expect(visual.textContent).toBe('20');
    reduced = true; change(); fixture.detectChanges();
    expect(visual.textContent).toBe('-20'); expect(frames.size).toBe(0);
    fixture.destroy(); expect(frames.size).toBe(0);
  });

  it('renders the exact target when the injected host document has no browser view', () => {
    vi.stubGlobal('matchMedia', () => { throw new Error('global browser access'); });
    TestBed.configureTestingModule({ imports: [KxAnimatedNumber], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(KxAnimatedNumber);
    const serverDocument = document.implementation.createHTMLDocument('server');
    expect(serverDocument.defaultView).toBeNull();
    Object.defineProperty(fixture.nativeElement, 'ownerDocument', { value: serverDocument });
    fixture.componentRef.setInput('value', 42);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('4242');
    fixture.componentRef.setInput('value', -20);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('-20-20');
  });

  it('reads media and timing from the host document realm instead of the global window', () => {
    vi.stubGlobal('matchMedia', () => { throw new Error('global browser access'); });
    const media = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const view = {
      performance: { now: vi.fn(() => 0) },
      matchMedia: vi.fn(() => media),
      requestAnimationFrame: vi.fn(),
      cancelAnimationFrame: vi.fn(),
      getComputedStyle: vi.fn(() => ({ getPropertyValue: () => '300ms' })),
    };
    const hostDocument = document.implementation.createHTMLDocument('other realm');
    Object.defineProperty(hostDocument, 'defaultView', { value: view });
    TestBed.configureTestingModule({ imports: [KxAnimatedNumber], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(KxAnimatedNumber);
    Object.defineProperty(fixture.nativeElement, 'ownerDocument', { value: hostDocument });
    fixture.componentRef.setInput('value', 75);
    fixture.detectChanges();
    expect(view.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(view.getComputedStyle).toHaveBeenCalledWith(hostDocument.documentElement);
    expect(view.performance.now).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toBe('7575');
    expect(view.requestAnimationFrame).not.toHaveBeenCalled();
  });

});
