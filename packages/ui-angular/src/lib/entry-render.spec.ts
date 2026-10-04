import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { EntryStates } from '../fixtures/entry';


describe('text entry and tabs — rendered subject for check:entry-visual', () => {
  TestBed.configureTestingModule({ imports: [EntryStates], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(EntryStates);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const at = (selector: string) => root.querySelector(selector) as HTMLElement;

  it('renders every field state with the semantics the gate addresses', () => {
    for (const kind of ['input', 'textarea', 'native-select']) {
      const field = (c: string) => at(`[data-kx-kind="${kind}"] [data-kx-case="${c}"]`);
      expect(field('rest'), `${kind} rest`).toBeTruthy();
      expect(field('filled'), `${kind} filled`).toBeTruthy();
      expect(field('invalid').getAttribute('aria-invalid'), `${kind} invalid`).toBe('true');
      expect((field('disabled') as HTMLInputElement).disabled, `${kind} disabled`).toBe(true);
    }
    expect((at('[data-kx-kind="input"] [data-kx-case="readonly"]') as HTMLInputElement).readOnly).toBe(true);
    expect((at('[data-kx-kind="textarea"] [data-kx-case="readonly"]') as HTMLTextAreaElement).readOnly).toBe(true);
    expect((at('[data-kx-kind="native-select"] [data-kx-case="rest"]') as HTMLSelectElement).value).toBe('');
    expect((at('[data-kx-kind="native-select"] [data-kx-case="filled"]') as HTMLSelectElement).value).toBe('utc');
  });

  it('renders each tab strip with one selected tab and a disabled one', () => {
    for (const where of ['page', 'card']) {
      const tab = (c: string) => at(`kx-tab-list[data-kx-case="${where}"] [data-kx-case="${c}"]`);
      expect(tab('selected').getAttribute('aria-selected'), `${where} selected`).toBe('true');
      expect(tab('unselected').getAttribute('aria-selected'), `${where} unselected`).toBe('false');
      expect((tab('disabled') as HTMLButtonElement).disabled, `${where} disabled`).toBe(true);
    }
  });

});
