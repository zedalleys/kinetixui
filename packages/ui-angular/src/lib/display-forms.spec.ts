import { Component, provideZonelessChangeDetection } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  KxAspectRatio,
  KxAvatar,
  KxAvatarFallback,
  KxAvatarGroup,
  KxAvatarImage,
  KxEmpty,
  KxEmptyMedia,
  KxEmptyTitle,
  KxKbd,
  KxKbdGroup,
  KxMetric,
  KxQuote,
  KxSkeleton,
  KxSpinner,
  KxTag,
} from './display';
import {
  KxField,
  KxFieldMessage,
  KxNativeSelect,
  KxNumberInput,
  KxPasswordInput,
  KxRadio,
  KxRadioGroup,
  KxSlider,
  KxTextarea,
} from './forms';
import { KxSegment, KxSegmentedControl, KxToggle, KxToggleGroup, KxToggleGroupItem } from './toggles';
import {
  KxUsageDirection,
  KxUsageDisplay,
  KxUsageForms,
  KxUsagePrimitives,
  KxUsageToggles,
  SignupForm,
} from '../usage/examples';

/**
 * Behaviour tests for the wave 1 (display) and wave 2 (form) components.
 *
 * The compiler already proves the templates type-check. What is asserted here is what it cannot see: which
 * element actually carries the semantics, what assistive technology is told, whether the keyboard works
 * because the browser is doing it, and whether the forms integration writes both ways.
 *
 * The last block renders every example the website shows. That is the guardrail that matters most on this
 * package: a snippet on a component page is extracted from those templates, so if one stops rendering the
 * site would otherwise keep publishing it.
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

function mount<T>(type: new () => T) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [type as never], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  return fixture;
}

/* ── display ────────────────────────────────────────────────────────────── */

describe('KxAvatar', () => {
  const TEMPLATE = `
    <kx-avatar>
      <img kxAvatarImage src="/ada.jpg" alt="Ada Lovelace" />
      <kx-avatar-fallback>AL</kx-avatar-fallback>
    </kx-avatar>`;
  const imports = [KxAvatar, KxAvatarImage, KxAvatarFallback];

  it('shows the fallback until the image reports that it loaded', () => {
    const { el } = host(TEMPLATE, imports);
    expect((el.querySelector('img') as HTMLImageElement).hidden).toBe(true);
    expect((el.querySelector('kx-avatar-fallback') as HTMLElement).hidden).toBe(false);
  });

  it('swaps to the image on load, and back to the fallback on error', () => {
    const { el, fixture } = host(TEMPLATE, imports);
    const img = el.querySelector('img') as HTMLImageElement;
    img.dispatchEvent(new Event('load'));
    fixture.detectChanges();
    expect(img.hidden).toBe(false);
    expect((el.querySelector('kx-avatar-fallback') as HTMLElement).hidden).toBe(true);

    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect((el.querySelector('kx-avatar-fallback') as HTMLElement).hidden).toBe(false);
  });

  it('hides the fallback initials from assistive technology, leaving alt as the only name', () => {
    const { el } = host(TEMPLATE, imports);
    expect(el.querySelector('kx-avatar-fallback')!.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('img')!.getAttribute('alt')).toBe('Ada Lovelace');
  });
});

describe('KxAvatarGroup', () => {
  const TEMPLATE = `
    <kx-avatar-group [max]="max">
      <kx-avatar>A</kx-avatar>
      <kx-avatar>B</kx-avatar>
      <kx-avatar>C</kx-avatar>
      <kx-avatar>D</kx-avatar>
      <kx-avatar>E</kx-avatar>
    </kx-avatar-group>`;
  const imports = [KxAvatarGroup, KxAvatar];

  it('collapses the avatars past max and counts them in the overflow marker', () => {
    const { el } = host(TEMPLATE, imports, { max: 3 });
    const collapsed = el.querySelectorAll('.kx-avatar--collapsed');
    expect(collapsed.length).toBe(2);
    expect(el.querySelector('.kx-avatar-group__overflow')!.textContent).toContain('+2');
  });

  it('announces the overflow as words, not as the bare "+2" glyph', () => {
    const { el } = host(TEMPLATE, imports, { max: 3 });
    const marker = el.querySelector('.kx-avatar-group__overflow')!;
    expect(marker.querySelector('[aria-hidden="true"]')!.textContent).toContain('+2');
    expect(marker.querySelector('.kx-sr-only')!.textContent).toContain('and 2 more');
  });

  it('shows every avatar and no marker when max is not set', () => {
    const { el } = host(TEMPLATE, imports, { max: null });
    expect(el.querySelectorAll('.kx-avatar--collapsed').length).toBe(0);
    expect(el.querySelector('.kx-avatar-group__overflow')).toBeNull();
  });
});

describe('KxSpinner', () => {
  it('is a status region carrying its own label, not a silent animation', () => {
    const { el } = host('<kx-spinner label="Saving…" />', [KxSpinner]);
    const spinner = el.querySelector('kx-spinner')!;
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.textContent).toContain('Saving…');
    expect(spinner.querySelector('.kx-sr-only')).not.toBeNull();
  });
});

describe('KxSkeleton', () => {
  it('is hidden from assistive technology — the loading announcement belongs to the region, not the shape', () => {
    const { el } = host('<kx-skeleton />', [KxSkeleton]);
    expect(el.querySelector('kx-skeleton')!.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('KxTag', () => {
  it('has no dismiss button unless it is asked for', () => {
    const { el } = host('<kx-tag>Design</kx-tag>', [KxTag]);
    expect(el.querySelector('button')).toBeNull();
  });

  it('names the dismiss button after the tag, so a list of them does not announce "Remove" five times', () => {
    const { el } = host('<kx-tag removable>Design</kx-tag>', [KxTag]);
    expect(el.querySelector('button')!.getAttribute('aria-label')).toBe('Remove Design');
  });

  it('lets removeLabel override the name where the text is not the right one', () => {
    const { el } = host('<kx-tag removable removeLabel="Clear filter">Design</kx-tag>', [KxTag]);
    expect(el.querySelector('button')!.getAttribute('aria-label')).toBe('Clear filter');
  });
});

describe('KxKbd, KxQuote, KxMetric, KxEmpty, KxAspectRatio', () => {
  it('renders keyboard keys as real <kbd> elements', () => {
    const { el } = host('<kbd kxKbdGroup><kbd kxKbd>Ctrl</kbd><kbd kxKbd>K</kbd></kbd>', [KxKbd, KxKbdGroup]);
    expect(el.querySelectorAll('kbd').length).toBe(3);
    expect(el.querySelector('.kx-kbd-group')!.tagName).toBe('KBD');
  });

  it('renders a quote as figure/blockquote/figcaption, with the quotation marks decorative', () => {
    const { el } = host('<kx-quote author="Ada">Weaves patterns.</kx-quote>', [KxQuote]);
    expect(el.querySelector('figure')).not.toBeNull();
    expect(el.querySelector('blockquote')!.textContent).toContain('Weaves patterns.');
    expect(el.querySelector('figcaption')!.textContent).toContain('Ada');
    expect(el.querySelectorAll('blockquote [aria-hidden="true"]').length).toBe(2);
  });

  it('omits the metric trend entirely when there is none, rather than showing a flat arrow', () => {
    const plain = host('<kx-metric label="Revenue" value="$1" />', [KxMetric]);
    expect(plain.el.querySelector('.kx-metric__trend')).toBeNull();
    const trending = host('<kx-metric label="Revenue" value="$1" trend="down" change="-4%" />', [KxMetric]);
    expect(trending.el.querySelector('.kx-metric__trend')!.getAttribute('data-trend')).toBe('down');
  });

  it('gives the empty-state title a real heading role at a level the page chooses', () => {
    const { el } = host('<kx-empty><kx-empty-title [level]="2">Nothing here</kx-empty-title></kx-empty>', [KxEmpty, KxEmptyTitle]);
    const title = el.querySelector('kx-empty-title')!;
    expect(title.getAttribute('role')).toBe('heading');
    expect(title.getAttribute('aria-level')).toBe('2');
  });

  it('hides empty-state media, which is decoration beside a title that already says it', () => {
    const { el } = host('<kx-empty-media variant="icon">x</kx-empty-media>', [KxEmptyMedia]);
    expect(el.querySelector('kx-empty-media')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('sets the CSS aspect-ratio property rather than re-implementing it with padding', () => {
    const { el } = host('<kx-aspect-ratio [ratio]="2" />', [KxAspectRatio]);
    // asserted through the custom property the stylesheet reads: jsdom drops `aspect-ratio` itself
    expect((el.querySelector('kx-aspect-ratio') as HTMLElement).style.getPropertyValue('--kx-aspect-ratio')).toBe('2');
  });
});

/* ── forms ──────────────────────────────────────────────────────────────── */

describe('KxTextarea and KxNativeSelect', () => {
  it('stay the real elements, so rows, options and native validation keep working', () => {
    const { el } = host('<textarea kxTextarea rows="4"></textarea>', [KxTextarea]);
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea.rows).toBe(4);
    expect(textarea.className).toContain('kx-textarea');
  });

  it('drops the resize affordance only when asked, rather than removing it by default', () => {
    const on = host('<textarea kxTextarea></textarea>', [KxTextarea]);
    expect((on.el.querySelector('textarea') as HTMLTextAreaElement).style.resize).toBe('');
    const off = host('<textarea kxTextarea resize="none"></textarea>', [KxTextarea]);
    expect((off.el.querySelector('textarea') as HTMLTextAreaElement).style.resize).toBe('none');
  });

  it('leaves the select a <select>, so the platform picker is the one that opens', () => {
    const { el } = host('<select kxNativeSelect><option>a</option></select>', [KxNativeSelect]);
    const select = el.querySelector('select') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect(select.className).toContain('kx-native-select--default');
  });
});

describe('KxRadioGroup', () => {
  const TEMPLATE = `
    <kx-radio-group [(value)]="plan" aria-label="Plan">
      <kx-radio value="free">Free</kx-radio>
      <kx-radio value="pro">Pro</kx-radio>
    </kx-radio-group>`;
  const imports = [KxRadioGroup, KxRadio];

  it('is a radiogroup of real radio inputs sharing one name, so the browser does the grouping', () => {
    const { el } = host(TEMPLATE, imports, { plan: 'pro' });
    expect(el.querySelector('kx-radio-group')!.getAttribute('role')).toBe('radiogroup');
    const inputs = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(inputs.map((i) => i.type)).toEqual(['radio', 'radio']);
    expect(new Set(inputs.map((i) => i.name)).size).toBe(1);
  });

  it('reflects the bound value, and writes the user choice back out', () => {
    const { el, fixture } = host(TEMPLATE, imports, { plan: 'pro' });
    const [free, pro] = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(pro!.checked).toBe(true);

    free!.click();
    fixture.detectChanges();
    expect((fixture.componentInstance as Record<string, unknown>)['plan']).toBe('free');
  });

  it('associates each label with its own input, so the whole row is a target', () => {
    const { el } = host(TEMPLATE, imports, { plan: null });
    const label = el.querySelector('label') as HTMLLabelElement;
    const input = el.querySelector('input') as HTMLInputElement;
    expect(label.htmlFor).toBe(input.id);
    expect(input.id).not.toBe('');
  });

  it('gives two groups on one page different names, so they do not merge', () => {
    const { el } = host(`${TEMPLATE}${TEMPLATE}`, imports, { plan: null });
    const names = Array.from(el.querySelectorAll('input')).map((i) => (i as HTMLInputElement).name);
    expect(new Set(names).size).toBe(2);
  });

  it('binds through reactive forms, including disabled from the form model', () => {
    @Component({
      imports: [ReactiveFormsModule, KxRadioGroup, KxRadio],
      template: `<kx-radio-group [formControl]="control"><kx-radio value="a">A</kx-radio></kx-radio-group>`,
    })
    class Host {
      readonly control = new FormControl<string | null>('a');
    }
    const fixture = mount(Host);
    expect((fixture.nativeElement as HTMLElement).querySelector('input')!.checked).toBe(true);

    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('input')!.disabled).toBe(true);
  });
});

describe('KxSlider', () => {
  it('is a real range input, so arrow keys and the value semantics are the browser\'s', () => {
    const { el } = host('<kx-slider [value]="40" [max]="80" aria-label="Volume" />', [KxSlider]);
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('range');
    expect(input.value).toBe('40');
    expect(input.max).toBe('80');
    expect(input.getAttribute('aria-label')).toBe('Volume');
  });

  it('drives the fill custom property from the real value, not from a second copy of it', () => {
    const { el } = host('<kx-slider [value]="25" [max]="100" />', [KxSlider]);
    expect((el.querySelector('kx-slider') as HTMLElement).style.getPropertyValue('--kx-slider-fill')).toBe('25%');
  });

  it('writes the user value back through the model', () => {
    const { el, fixture } = host('<kx-slider [(value)]="volume" />', [KxSlider], { volume: 10 });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = '70';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect((fixture.componentInstance as Record<string, unknown>)['volume']).toBe(70);
  });
});

describe('KxNumberInput', () => {
  it('keeps a real number input and hides the duplicate step buttons from the tab order', () => {
    const { el } = host('<kx-number-input [value]="3" aria-label="Quantity" />', [KxNumberInput]);
    expect((el.querySelector('input') as HTMLInputElement).type).toBe('number');
    for (const button of Array.from(el.querySelectorAll('button'))) {
      expect(button.getAttribute('tabindex')).toBe('-1');
      expect(button.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('clamps to min and max instead of letting the buttons walk past them', () => {
    const { el, fixture } = host('<kx-number-input [(value)]="n" [min]="1" [max]="3" />', [KxNumberInput], { n: 3 });
    const [down, up] = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    up!.click();
    fixture.detectChanges();
    expect((fixture.componentInstance as Record<string, unknown>)['n']).toBe(3);
    for (let i = 0; i < 5; i++) {
      down!.click();
      fixture.detectChanges();
    }
    expect((fixture.componentInstance as Record<string, unknown>)['n']).toBe(1);
  });

  it('treats an emptied field as null, not as zero', () => {
    const { el, fixture } = host('<kx-number-input [(value)]="n" />', [KxNumberInput], { n: 5 });
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect((fixture.componentInstance as Record<string, unknown>)['n']).toBeNull();
  });
});

describe('KxPasswordInput', () => {
  it('starts masked, with an autocomplete hint password managers recognise', () => {
    const { el } = host('<kx-password-input aria-label="Password" />', [KxPasswordInput]);
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(input.getAttribute('autocomplete')).toBe('current-password');
  });

  it('announces the reveal toggle state through aria-pressed, and really unmasks', () => {
    const { el, fixture } = host('<kx-password-input />', [KxPasswordInput]);
    const button = el.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect((el.querySelector('input') as HTMLInputElement).type).toBe('text');
  });
});

describe('KxField', () => {
  it('makes an error message a live region so a validation result is announced, not just drawn', () => {
    const { el } = host('<kx-field><kx-field-message variant="error">Bad</kx-field-message></kx-field>', [KxField, KxFieldMessage]);
    expect(el.querySelector('kx-field-message')!.getAttribute('role')).toBe('alert');
  });

  it('leaves the non-error tones silent — a hint is not an interruption', () => {
    const { el } = host('<kx-field-message variant="info">Hint</kx-field-message>', [KxFieldMessage]);
    expect(el.querySelector('kx-field-message')!.getAttribute('role')).toBeNull();
  });
});

/* ── toggles ────────────────────────────────────────────────────────────── */

describe('KxToggle', () => {
  it('is a button carrying aria-pressed, and flips it on click', () => {
    const { el, fixture } = host('<button kxToggle [(pressed)]="on">B</button>', [KxToggle], { on: false });
    const button = el.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect((fixture.componentInstance as Record<string, unknown>)['on']).toBe(true);
  });
});

describe('KxToggleGroup', () => {
  const MULTI = `
    <kx-toggle-group [(value)]="marks" aria-label="Style">
      <kx-toggle-group-item value="bold">B</kx-toggle-group-item>
      <kx-toggle-group-item value="italic">I</kx-toggle-group-item>
    </kx-toggle-group>`;
  const imports = [KxToggleGroup, KxToggleGroupItem];

  it('is a group of independent pressed buttons when several may be on at once', () => {
    const { el, fixture } = host(MULTI, imports, { marks: ['bold'] });
    expect(el.querySelector('kx-toggle-group')!.getAttribute('role')).toBe('group');
    const [bold, italic] = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    expect(bold!.getAttribute('aria-pressed')).toBe('true');

    italic!.click();
    fixture.detectChanges();
    expect((fixture.componentInstance as Record<string, unknown>)['marks']).toEqual(['bold', 'italic']);
  });

  it('becomes a radiogroup of real radios when only one may be on, rather than faking it with ARIA', () => {
    const { el } = host(MULTI.replace('<kx-toggle-group ', '<kx-toggle-group type="single" '), imports, { marks: 'bold' });
    expect(el.querySelector('kx-toggle-group')!.getAttribute('role')).toBe('radiogroup');
    const inputs = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(inputs.map((i) => i.type)).toEqual(['radio', 'radio']);
    expect(inputs[0]!.checked).toBe(true);
  });
});

describe('KxSegmentedControl', () => {
  const TEMPLATE = `
    <kx-segmented-control [(value)]="range" aria-label="Range">
      <kx-segment value="7d">7 days</kx-segment>
      <kx-segment value="30d">30 days</kx-segment>
    </kx-segmented-control>`;
  const imports = [KxSegmentedControl, KxSegment];

  it('is a radiogroup, so arrow keys move between segments without any key handling of ours', () => {
    const { el } = host(TEMPLATE, imports, { range: '30d' });
    expect(el.querySelector('kx-segmented-control')!.getAttribute('role')).toBe('radiogroup');
    const inputs = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(inputs[1]!.checked).toBe(true);
  });

  it('cannot be emptied by re-selecting the chosen segment', () => {
    const { el, fixture } = host(TEMPLATE, imports, { range: '7d' });
    const first = el.querySelector('input') as HTMLInputElement;
    first.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect((fixture.componentInstance as Record<string, unknown>)['range']).toBe('7d');
  });
});

/* ── the examples the website publishes ─────────────────────────────────── */

describe('the usage examples shown on component pages', () => {
  it.each([
    ['primitives', KxUsagePrimitives],
    ['display', KxUsageDisplay],
    ['forms', KxUsageForms],
    ['toggles', KxUsageToggles],
    ['direction (native equivalent)', KxUsageDirection],
    ['reactive form (native equivalent)', SignupForm],
  ])('renders the %s examples', (_name, type) => {
    const fixture = mount(type as new () => unknown);
    expect((fixture.nativeElement as HTMLElement).innerHTML.length).toBeGreaterThan(0);
  });

  it('shows the direction example using the DOM\'s own dir attribute, with no provider component', () => {
    const fixture = mount(KxUsageDirection);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[dir="rtl"]')).not.toBeNull();
    expect(el.querySelector('kx-direction-provider')).toBeNull();
  });
});
