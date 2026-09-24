import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AlertStackBlock } from './alert-stack';
import { CommentBoxBlock } from './comment-box';
import { CtaBannerBlock } from './cta-banner';
import { EmptyStateBlock } from './empty-state';
import { PricingTierBlock } from './pricing-tier';
import { SettingsListBlock } from './settings-list';
import { SignInBlock } from './sign-in';
import { StatCardsBlock } from './stat-cards';
import { TableToolbarBlock } from './table-toolbar';
import { TeamMembersBlock } from './team-members';
import { TestimonialBlock } from './testimonial';

/**
 * Every Angular block, rendered.
 *
 * `ng-packagr` already proves the templates type-check under `strictTemplates`, so repeating "it compiles"
 * here would add nothing. What this adds is that each block actually mounts — and, for the few blocks whose
 * whole point is a behaviour or a piece of semantics, that the behaviour is there. A block published on the
 * website that throws on render would otherwise be found by a reader rather than by CI.
 */

function mount<T>(type: new () => T) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [type as never], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  return fixture;
}

const BLOCKS = [
  ['sign-in', SignInBlock],
  ['stat-cards', StatCardsBlock],
  ['pricing-tier', PricingTierBlock],
  ['cta-banner', CtaBannerBlock],
  ['table-toolbar', TableToolbarBlock],
  ['settings-list', SettingsListBlock],
  ['team-members', TeamMembersBlock],
  ['comment-box', CommentBoxBlock],
  ['empty-state', EmptyStateBlock],
  ['alert-stack', AlertStackBlock],
  ['testimonial', TestimonialBlock],
] as const;

describe('Angular blocks', () => {
  it.each(BLOCKS)('%s renders', (_slug, type) => {
    const el = mount(type as new () => unknown).nativeElement as HTMLElement;
    expect(el.innerHTML.length).toBeGreaterThan(0);
  });
});

describe('the semantics each block exists to demonstrate', () => {
  it('sign-in keeps the submit disabled until the form is valid', () => {
    const fixture = mount(SignInBlock);
    const el = fixture.nativeElement as HTMLElement;
    const submit = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fixture.componentInstance.form.setValue({ email: 'ada@example.com', password: 'hunter2', remember: true });
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);
  });

  it('settings-list names each switch from its own visible row, not from a hard-coded label', () => {
    const el = mount(SettingsListBlock).nativeElement as HTMLElement;
    const switches = [...el.querySelectorAll('kx-switch')];
    expect(switches.length).toBe(3);
    for (const s of switches) {
      const id = s.getAttribute('aria-labelledby');
      expect(id).toBeTruthy();
      expect(el.querySelector(`#${id}`)?.textContent?.trim()).toBeTruthy();
    }
  });

  it('team-members distinguishes three identical "Remove" buttons by name', () => {
    const el = mount(TeamMembersBlock).nativeElement as HTMLElement;
    const names = [...el.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Remove Ada Lovelace', 'Remove Grace Hopper', 'Remove Alan Turing']);
  });

  it('table-toolbar really filters, and says so when nothing matches', () => {
    const fixture = mount(TableToolbarBlock);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('tbody tr').length).toBe(3);

    fixture.componentInstance.query.set('INV-002');
    fixture.detectChanges();
    expect(el.querySelectorAll('tbody tr').length).toBe(1);

    fixture.componentInstance.query.set('nothing');
    fixture.detectChanges();
    expect(el.querySelector('tbody')?.textContent).toContain('No invoices match');
  });

  it('table-toolbar ties every cell to a header, which is what a real table buys', () => {
    const el = mount(TableToolbarBlock).nativeElement as HTMLElement;
    expect([...el.querySelectorAll('thead th')].every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    expect([...el.querySelectorAll('tbody th')].every((th) => th.getAttribute('scope') === 'row')).toBe(true);
    expect(el.querySelector('caption')).not.toBeNull();
  });

  it('comment-box disables the action while there is nothing to submit', () => {
    const fixture = mount(CommentBoxBlock);
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fixture.componentInstance.comment.set('Looks good');
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });

  it('alert-stack states each status in words, not only in colour', () => {
    const el = mount(AlertStackBlock).nativeElement as HTMLElement;
    const titles = [...el.querySelectorAll('kx-alert-title')].map((t) => t.textContent?.trim());
    expect(titles).toEqual(['Heads up', 'Payment failed', 'Changes saved']);
  });

  it('pricing-tier renders its features as a real list', () => {
    const el = mount(PricingTierBlock).nativeElement as HTMLElement;
    expect(el.querySelectorAll('ul > li').length).toBe(4);
  });
});
