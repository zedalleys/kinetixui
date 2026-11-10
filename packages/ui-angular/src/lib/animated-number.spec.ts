import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KxAnimatedNumber } from './animated-number';

afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('numeric continuity', () => {
  it('renders initial target, retargets, and cancels when the preference changes', () => {
    let reduced = false;
    let change = () => {};
    let serial = 0;
    const frames = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('matchMedia', () => ({ get matches() { return reduced; }, addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() }) as unknown as MediaQueryList);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => { frames.set(++serial, fn); return serial; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { frames.delete(id); });
    const step = (time: number) => { const batch = [...frames.values()]; frames.clear(); batch.forEach((fn) => fn(time)); fixture.detectChanges(); };
    TestBed.configureTestingModule({ imports: [KxAnimatedNumber], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(KxAnimatedNumber);
    fixture.componentRef.setInput('value', 20); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('2020');
    fixture.componentRef.setInput('value', 100); fixture.detectChanges(); step(0); step(150);
    const visual = fixture.nativeElement.querySelector('[aria-hidden]');
    expect(visual.textContent).toBe('60');
    expect(fixture.nativeElement.querySelector('.kx-sr-only').textContent).toBe('100');
    fixture.componentRef.setInput('value', -20); fixture.detectChanges(); step(200); step(350);
    expect(visual.textContent).toBe('20');
    reduced = true; change(); fixture.detectChanges();
    expect(visual.textContent).toBe('-20'); expect(frames.size).toBe(0);
    fixture.destroy(); expect(frames.size).toBe(0);
  });
});
