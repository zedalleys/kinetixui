import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KxButton } from './button';
import { KxAlert, KxAlertDescription, KxAlertTitle, KxBadge, KxCard, KxCardTitle, KxInput, KxLabel, KxProgress, KxSeparator } from './primitives';
import { KxCheckbox, KxSwitch } from './toggles';
import { KxTab, KxTabList, KxTabPanel, KxTabs } from './tabs';

/**
 * These are behaviour tests, not render smoke tests. `ng-packagr` already proves every template compiles under
 * `strictTemplates`, so repeating "it renders" here would add nothing. What is worth asserting is the part a
 * compiler cannot see: the roles and names assistive technology receives, what the keyboard does, whether a
 * disabled control really refuses input, and whether the forms integration writes both ways.
 */

/**
 * Renders `template` with `imports` and returns the host element. Resets the TestBed first: it refuses to be
 * reconfigured once instantiated, and several tests below render more than one tree to compare two states.
 */
function host(template: string, imports: unknown[], props: Record<string, unknown> = {}) {
  @Component({ template, imports: imports as never[] })
  class Host {
    [key: string]: unknown;
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, props);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

/** Same, for the tests that declare their own host component (forms bindings need real typed fields). */
function mount<T>(type: new () => T) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [type as never], providers: [provideZonelessChangeDetection()] });
  return TestBed.createComponent(type);
}

describe('KxButton', () => {
  it('stays a real <button>, keeping its native type and disabled behaviour', () => {
    const { el } = host('<button kxButton [disabled]="true">Save</button>', [KxButton]);
    const button = el.querySelector('button')!;
    expect(button.tagName).toBe('BUTTON');
    expect(button.disabled).toBe(true);
    // no role attribute: the element already IS a button, and re-declaring it would be noise
    expect(button.getAttribute('role')).toBeNull();
  });

  it('applies the shared variant and size contract as classes and data attributes', () => {
    const { el } = host('<button kxButton variant="Outline" size="lg" corners="pill">Go</button>', [KxButton]);
    const button = el.querySelector('button')!;
    expect(button.className).toContain('kx-btn--outline');
    expect(button.className).toContain('kx-btn--lg');
    expect(button.className).toContain('kx-btn--pill');
    expect(button.getAttribute('data-variant')).toBe('Outline');
  });

  it('defaults to Primary/md and adds no corner class for the default radius', () => {
    const { el } = host('<button kxButton>Go</button>', [KxButton]);
    const cls = el.querySelector('button')!.className;
    expect(cls).toContain('kx-btn--primary');
    expect(cls).toContain('kx-btn--md');
    expect(cls).not.toContain('kx-btn--default');
  });

  it('works on an anchor, which cannot be disabled natively', () => {
    const { el } = host('<a kxButton href="/docs" variant="Link">Docs</a>', [KxButton]);
    const link = el.querySelector('a')!;
    expect(link.tagName).toBe('A');
    expect(link.className).toContain('kx-btn--link');
  });
});

describe('KxBadge / KxCard / KxSeparator', () => {
  it('renders the badge variant class', () => {
    const { el } = host('<kx-badge variant="success">Synced</kx-badge>', [KxBadge]);
    expect(el.querySelector('kx-badge')!.className).toContain('kx-badge--success');
  });

  it('renders the card title at the heading level the page needs, not a hard-coded h3', () => {
    const { el } = host('<kx-card><kx-card-title [level]="2">Billing</kx-card-title></kx-card>', [KxCard, KxCardTitle]);
    const title = el.querySelector('kx-card-title')!;
    expect(title.getAttribute('role')).toBe('heading');
    expect(title.getAttribute('aria-level')).toBe('2');
    // the point of a dynamic level is that the text survives it
    expect(title.textContent).toContain('Billing');
  });

  it('hides a decorative separator from assistive technology, and exposes a semantic one', () => {
    const a = host('<kx-separator />', [KxSeparator]).el.querySelector('kx-separator')!;
    expect(a.getAttribute('aria-hidden')).toBe('true');
    expect(a.getAttribute('role')).toBe('none');

    const b = host('<kx-separator [decorative]="false" orientation="vertical" />', [KxSeparator]).el.querySelector('kx-separator')!;
    expect(b.getAttribute('role')).toBe('separator');
    expect(b.getAttribute('aria-orientation')).toBe('vertical');
    expect(b.getAttribute('aria-hidden')).toBeNull();
  });
});

describe('KxProgress', () => {
  it('reports its value as a progressbar', () => {
    const { el } = host('<kx-progress [value]="62" />', [KxProgress]);
    const bar = el.querySelector('kx-progress')!;
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('62');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('drops aria-valuenow when indeterminate rather than reporting a fake zero', () => {
    const { el } = host('<kx-progress [value]="null" />', [KxProgress]);
    expect(el.querySelector('kx-progress')!.getAttribute('aria-valuenow')).toBeNull();
  });

  it('clamps a value outside the range instead of overflowing the track', () => {
    const { el } = host('<kx-progress [value]="140" />', [KxProgress]);
    const fill = el.querySelector('.kx-progress__bar') as HTMLElement;
    expect(fill.style.inlineSize).toBe('100%');
  });
});

describe('KxAlert', () => {
  it('announces an urgent variant as an alert, and a neutral one as a plain note', () => {
    const urgent = host('<kx-alert variant="destructive"><kx-alert-title>Failed</kx-alert-title></kx-alert>', [KxAlert, KxAlertTitle]);
    expect(urgent.el.querySelector('kx-alert')!.getAttribute('role')).toBe('alert');

    const calm = host('<kx-alert><kx-alert-description>Saved</kx-alert-description></kx-alert>', [KxAlert, KxAlertDescription]);
    // a neutral panel must NOT interrupt a screen-reader user
    expect(calm.el.querySelector('kx-alert')!.getAttribute('role')).toBe('note');
  });
});

describe('KxLabel / KxInput', () => {
  it('keeps the native label/input association so clicking the label focuses the control', () => {
    const { el } = host('<label kxLabel for="email">Email</label><input kxInput id="email" />', [KxLabel, KxInput]);
    const label = el.querySelector('label')!;
    const input = el.querySelector('input')!;
    expect(label.htmlFor).toBe('email');
    expect(input.id).toBe('email');
    // deliberately NOT asserting that label.click() focuses the input: that is the browser's own label
    // activation behaviour, which jsdom does not emulate. What this package is responsible for is leaving the
    // native for/id association intact, which is what makes a real browser do it.
    expect(el.querySelector('label[for="email"]')).toBe(label);
  });

  it('leaves aria-invalid as the source of truth for the error state', () => {
    const { el } = host('<input kxInput aria-invalid="true" />', [KxInput]);
    expect(el.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
  });
});

describe('KxCheckbox', () => {
  it('exposes a checkbox role and toggles on click', async () => {
    const { fixture, el } = host('<kx-checkbox aria-label="Remember me" />', [KxCheckbox]);
    const button = el.querySelector('button')!;
    expect(button.getAttribute('role')).toBe('checkbox');
    expect(button.getAttribute('aria-label')).toBe('Remember me');
    expect(button.getAttribute('aria-checked')).toBe('false');

    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  it('reports the tri-state as aria-checked="mixed"', () => {
    const { el } = host('<kx-checkbox [indeterminate]="true" aria-label="All" />', [KxCheckbox]);
    expect(el.querySelector('button')!.getAttribute('aria-checked')).toBe('mixed');
  });

  it('refuses input when disabled — no state change, and the button is really disabled', async () => {
    const { fixture, el } = host('<kx-checkbox [disabled]="true" aria-label="x" />', [KxCheckbox]);
    const button = el.querySelector('button')!;
    expect(button.disabled).toBe(true);
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('writes both ways through ngModel', async () => {
    @Component({
      template: '<kx-checkbox [(ngModel)]="value" aria-label="Remember" />',
      imports: [KxCheckbox, FormsModule],
    })
    class Host {
      // a signal, not a plain field: writing a plain field between change-detection passes is what makes
      // Angular raise NG0100, and the test would be reporting its own mistake rather than the component's
      value = signal(false);
    }
    const fixture = mount(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(true); // control → model

    fixture.componentInstance.value.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('false'); // model → control
  });

  it('honours disabled coming from the form model, not just the attribute', async () => {
    @Component({
      template: '<kx-checkbox [formControl]="control" aria-label="Remember" />',
      imports: [KxCheckbox, ReactiveFormsModule],
    })
    class Host {
      control = new FormControl({ value: false, disabled: true });
    }
    const fixture = mount(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('KxSwitch', () => {
  it('uses role="switch" so it reports on/off rather than checked', async () => {
    const { fixture, el } = host('<kx-switch aria-label="Notifications" />', [KxSwitch]);
    const button = el.querySelector('button')!;
    expect(button.getAttribute('role')).toBe('switch');
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button.getAttribute('aria-checked')).toBe('true');
  });

  it('emits toggled only for user interaction, not for a programmatic write', async () => {
    @Component({
      template: '<kx-switch [checked]="value()" (toggled)="seen.push($event)" aria-label="n" />',
      imports: [KxSwitch],
    })
    class Host {
      value = signal(false);
      seen: boolean[] = [];
    }
    const fixture = mount(Host);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.value.set(true); // programmatic — must be silent
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.seen).toEqual([]);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.seen).toEqual([false]);
  });
});

/**
 * The example on kinetixui.com/docs/angular, verbatim. If the public API changes, this fails before the docs
 * can show code that no longer compiles — `apps/web/src/lib/angular-docs.test.ts` checks the page still
 * contains this exact template.
 */
export const DOCS_EXAMPLE_TEMPLATE = `
    <kx-switch [(ngModel)]="notifications" aria-label="Email notifications" />
    <button kxButton variant="Outline" (click)="save()">Save</button>
  `;

describe('the /docs/angular example', () => {
  it('compiles against the real exports and behaves as the page describes', async () => {
    @Component({
      selector: 'app-preferences',
      imports: [FormsModule, KxButton, KxSwitch],
      template: DOCS_EXAMPLE_TEMPLATE,
    })
    class PreferencesComponent {
      notifications = signal(true);
      saved = 0;
      save() {
        this.saved++;
      }
    }
    const fixture = mount(PreferencesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const sw = fixture.nativeElement.querySelector('[role="switch"]') as HTMLButtonElement;
    expect(sw.getAttribute('aria-label')).toBe('Email notifications');
    expect(sw.getAttribute('aria-checked')).toBe('true'); // the signal's initial value reached the control

    sw.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.notifications()).toBe(false);

    const save = fixture.nativeElement.querySelector('button[kxButton]') as HTMLButtonElement;
    expect(save.className).toContain('kx-btn--outline');
    save.click();
    expect(fixture.componentInstance.saved).toBe(1);
  });
});

describe('KxTabs', () => {
  const TABS = `
    <kx-tabs>
      <kx-tab-list aria-label="Account">
        <button kxTab value="profile">Profile</button>
        <button kxTab value="billing">Billing</button>
        <button kxTab value="team">Team</button>
      </kx-tab-list>
      <kx-tab-panel value="profile">Profile panel</kx-tab-panel>
      <kx-tab-panel value="billing">Billing panel</kx-tab-panel>
      <kx-tab-panel value="team">Team panel</kx-tab-panel>
    </kx-tabs>`;
  const imports = [KxTabs, KxTabList, KxTab, KxTabPanel];

  const setup = async () => {
    const h = host(TABS, imports);
    await h.fixture.whenStable();
    h.fixture.detectChanges();
    return { ...h, tabs: Array.from(h.el.querySelectorAll('[role="tab"]')) as HTMLButtonElement[] };
  };

  it('selects the first tab when nothing is bound', async () => {
    const { tabs } = await setup();
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('false');
  });

  it('keeps exactly one stop in the page tab order (roving tabindex)', async () => {
    const { tabs } = await setup();
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it('wires aria-controls and aria-labelledby to each other', async () => {
    const { el, tabs } = await setup();
    const panel = el.querySelector('[role="tabpanel"]:not([hidden])')!;
    expect(tabs[0]!.getAttribute('aria-controls')).toBe(panel.id || tabs[0]!.getAttribute('aria-controls'));
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[0]!.id);
  });

  it('moves selection with ArrowRight and wraps at the end', async () => {
    const { fixture, tabs } = await setup();
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);

    tabs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');

    tabs[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('renders only the active panel, so nothing hidden is reachable', async () => {
    const { el } = await setup();
    const visible = Array.from(el.querySelectorAll('[role="tabpanel"]')).filter((p) => !p.hasAttribute('hidden'));
    expect(visible).toHaveLength(1);
    expect(visible[0]!.textContent).toContain('Profile panel');
    expect(el.textContent).not.toContain('Billing panel');
  });

  it('reverses the arrow keys in an RTL document', async () => {
    const h = host(`<div dir="rtl">${TABS}</div>`, imports);
    await h.fixture.whenStable();
    h.fixture.detectChanges();
    const tabs = Array.from(h.el.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    // ArrowLeft moves FORWARD when the writing direction is right-to-left
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await h.fixture.whenStable();
    h.fixture.detectChanges();
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
  });
});
