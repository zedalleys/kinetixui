import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { AccountSecurityBlock } from './account-security';
import { AlertStackBlock } from './alert-stack';
import { CommentBoxBlock } from './comment-box';
import { CreateAccountBlock } from './create-account';
import { CtaBannerBlock } from './cta-banner';
import { DashboardTabsBlock } from './dashboard-tabs';
import { EditorToolbarBlock } from './editor-toolbar';
import { EmptyStateBlock } from './empty-state';
import { FilterPanelBlock } from './filter-panel';
import { LoadingStateBlock } from './loading-state';
import { OnboardingChecklistBlock } from './onboarding-checklist';
import { OrderSummaryBlock } from './order-summary';
import { PricingTierBlock } from './pricing-tier';
import { ProfileFormBlock } from './profile-form';
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
  ['create-account', CreateAccountBlock],
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
  ['profile-form', ProfileFormBlock],
  ['account-security', AccountSecurityBlock],
  ['onboarding-checklist', OnboardingChecklistBlock],
  ['editor-toolbar', EditorToolbarBlock],
  ['filter-panel', FilterPanelBlock],
  ['dashboard-tabs', DashboardTabsBlock],
  ['loading-state', LoadingStateBlock],
  ['order-summary', OrderSummaryBlock],
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

  it('create-account names the rules still unmet, and blocks submit until they are', () => {
    const fixture = mount(CreateAccountBlock);
    const el = fixture.nativeElement as HTMLElement;
    // Not querySelector('button'): the first button in this block is the password field's own reveal toggle.
    const submit = el.querySelector('button.submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(el.textContent).toContain('Still needs 12 characters, an upper and a lower case letter, a number, a symbol.');

    fixture.componentInstance.password.set('Correct-Horse-9');
    fixture.componentInstance.accepted.set(true);
    fixture.detectChanges();
    expect(el.textContent).toContain('Strong password.');
    expect(submit.disabled).toBe(false);
  });

  it('filter-panel keeps the tags and the checkboxes on ONE piece of state', () => {
    const fixture = mount(FilterPanelBlock);
    const el = fixture.nativeElement as HTMLElement;
    // The dismiss button is named after the tag, not just "Remove".
    const remove = el.querySelector('kx-tag button') as HTMLButtonElement;
    expect(remove.getAttribute('aria-label')).toBe('Remove In stock');

    remove.click();
    fixture.detectChanges();
    // Dismissing the tag is the same operation as unticking the row: neither can go stale.
    expect(el.querySelector('kx-tag')).toBeNull();
    expect(fixture.componentInstance.active()).toEqual([]);
  });

  it('editor-toolbar names each mark in text, and turns the marks off outside the editor', () => {
    const fixture = mount(EditorToolbarBlock);
    const el = fixture.nativeElement as HTMLElement;
    const names = [...el.querySelectorAll('kx-toggle-group-item .kx-sr-only')].map((n) => n.textContent);
    expect(names).toEqual(['Bold', 'Italic', 'Code']);
    // The glyph is decoration; only the hidden text is the name.
    expect(el.querySelector('kx-toggle-group-item [aria-hidden="true"]')?.textContent).toBe('B');

    fixture.componentInstance.mode.set('preview');
    fixture.detectChanges();
    expect([...el.querySelectorAll('kx-toggle-group-item button')].every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('order-summary names each stepper after its own line item', () => {
    const el = mount(OrderSummaryBlock).nativeElement as HTMLElement;
    const names = [...el.querySelectorAll('kx-number-input')].map((n) => n.getAttribute('aria-label'));
    expect(names).toEqual(['Quantity, Kinetix T-shirt', 'Quantity, Sticker pack']);
    // 2 x $28 + 1 x $6 = $62, over the $50 threshold, so shipping is a word rather than $0.00.
    expect(el.querySelector('.totals')?.textContent).toContain('Free');
  });

  it('loading-state tells a screen reader that it is loading, which the shapes cannot', () => {
    const el = mount(LoadingStateBlock).nativeElement as HTMLElement;
    const region = el.querySelector('kx-card-content')!;
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.querySelector('.kx-sr-only')?.textContent).toBe('Loading activity');
  });

  it('onboarding-checklist counts the progress in steps rather than in percent', () => {
    const fixture = mount(OnboardingChecklistBlock);
    const el = fixture.nativeElement as HTMLElement;
    const bar = el.querySelector('kx-progress [role="progressbar"], kx-progress')!;
    expect(bar.getAttribute('aria-valuetext')).toBe('2 of 5 complete');

    fixture.componentInstance.steps[2].done.set(true);
    fixture.detectChanges();
    expect(el.querySelector('kx-progress [role="progressbar"], kx-progress')!.getAttribute('aria-valuetext')).toBe('3 of 5 complete');
  });

  it('dashboard-tabs reserves the chart box before the chart exists', () => {
    const el = mount(DashboardTabsBlock).nativeElement as HTMLElement;
    const box = el.querySelector('kx-aspect-ratio') as HTMLElement;
    // 16/9 as a number, set as a custom property the stylesheet consumes.
    expect(box.style.getPropertyValue('--kx-aspect-ratio')).toBe(String(16 / 9));
  });

  it('profile-form groups the visibility radios under a legend', () => {
    const el = mount(ProfileFormBlock).nativeElement as HTMLElement;
    expect(el.querySelector('fieldset legend')?.textContent?.trim()).toBe('Who can see your profile');
    expect(el.querySelectorAll('kx-radio input[type="radio"]').length).toBe(3);
    const checked = el.querySelector('kx-radio input[type="radio"]:checked') as HTMLInputElement;
    expect(checked.value).toBe('team');
  });

  it('account-security names the switch from its own visible heading', () => {
    const el = mount(AccountSecurityBlock).nativeElement as HTMLElement;
    const id = el.querySelector('kx-switch')!.getAttribute('aria-labelledby');
    expect(el.querySelector(`#${id}`)?.textContent?.trim()).toBe('Two-factor authentication');
    expect(el.querySelector('button[aria-label="Revoke iPhone 15"]')).not.toBeNull();
  });

  it('pricing-tier renders its features as a real list', () => {
    const el = mount(PricingTierBlock).nativeElement as HTMLElement;
    expect(el.querySelectorAll('ul > li').length).toBe(4);
  });
});
