import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { CardStates } from '../fixtures/card';

describe('card — rendered subject for check:card-visual', () => {
  TestBed.configureTestingModule({ imports: [CardStates], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(CardStates);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;

  it('renders a resting card with a field in it, and a card on a grouped section', () => {
    const card = root.querySelector('kx-card[data-kx-case="default"]');
    expect(card?.classList.contains('kx-card')).toBe(true);
    expect(card?.querySelector('input.kx-input')).toBeTruthy();
    expect(root.querySelector('section[data-kx-case="grouped"] kx-card.kx-card')).toBeTruthy();
  });

  it('is static: a card is not itself interactive', () => {
    const card = root.querySelector('kx-card[data-kx-case="default"]') as HTMLElement;
    expect(card.getAttribute('tabindex')).toBeNull();
    expect(card.getAttribute('role')).toBeNull();
  });

});
