import { Component, provideZonelessChangeDetection } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { KxNumberInput } from './forms';
import { KxInputGroup, KxInputGroupAddon, KxInputGroupButton, KxInputGroupInput, KxInputGroupText } from './input-group';
import { KxInputOtp } from './input-otp';
import { KxRating } from './rating';

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

/** Type into an input the way the browser reports it: the value changes, then `input` fires. */
function type(el: HTMLInputElement, value: string) {
  el.value = value;
  el.dispatchEvent(new Event('input'));
}

// The input family's Wave A: semantics and model wiring in jsdom. Keyboard, focus rings, layout, direction and
// 200% text are asserted in a real browser by scripts/angular-browser.mjs.
// kx-verify: interaction, accessibility

describe('KxInputGroup', () => {
  const imports = [KxInputGroup, KxInputGroupInput, KxInputGroupAddon, KxInputGroupText, KxInputGroupButton, ReactiveFormsModule];

  it('keeps a real input as the one control, so forms and labels work on it untouched', () => {
    const control = new FormControl('kinetixui');
    const { el, fixture } = host(
      `<kx-input-group>
         <kx-input-group-text>https://</kx-input-group-text>
         <input kxInputGroupInput aria-label="Website" [formControl]="control" />
       </kx-input-group>`,
      imports,
      { control },
    );
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.classList.contains('kx-input-group__input')).toBe(true);
    expect(input.value).toBe('kinetixui');
    type(input, 'kinetix.dev');
    fixture.detectChanges();
    expect(control.value).toBe('kinetix.dev');
  });

  it('gives an add-on button type="button", so it never submits the surrounding form', () => {
    const { el } = host(
      `<form><kx-input-group><input kxInputGroupInput aria-label="Invite link" /><button kxInputGroupButton>Copy</button></kx-input-group></form>`,
      imports,
    );
    const button = el.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.classList.contains('kx-input-group__button')).toBe(true);
  });

  it('places add-ons by logical side, not by left and right', () => {
    const { el } = host(
      `<kx-input-group><kx-input-group-addon align="end">kg</kx-input-group-addon><input kxInputGroupInput aria-label="Weight" /></kx-input-group>`,
      imports,
    );
    expect(el.querySelector('kx-input-group-addon')!.className).toBe('kx-input-group__addon kx-input-group__addon--end');
  });
});

describe('KxInputOtp', () => {
  const imports = [KxInputOtp, ReactiveFormsModule];

  it('is one labelled text field with one-time-code autofill, not a row of unlabelled boxes', () => {
    const { el } = host(`<kx-input-otp aria-label="Verification code" />`, imports);
    const inputs = el.querySelectorAll('input');
    expect(inputs).toHaveLength(1);
    const input = inputs[0]!;
    expect(input.getAttribute('aria-label')).toBe('Verification code');
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(input.getAttribute('maxlength')).toBe('6');
    expect(el.querySelector('.kx-input-otp__cells')!.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('.kx-input-otp__slot')).toHaveLength(6);
  });

  it('drops characters it does not accept, keeps the length, and reports a complete code once', () => {
    const control = new FormControl('');
    const { el, fixture } = host(`<kx-input-otp aria-label="Code" [length]="4" [formControl]="control" (completed)="done = $event" />`, imports, {
      control,
      done: null,
    });
    const input = el.querySelector('input') as HTMLInputElement;
    type(input, '12a-3');
    fixture.detectChanges();
    expect(control.value).toBe('123');
    expect(input.value).toBe('123');
    expect(fixture.componentInstance['done']).toBe(null);
    type(input, '123456');
    fixture.detectChanges();
    expect(control.value).toBe('1234');
    expect(fixture.componentInstance['done']).toBe('1234');
    expect(Array.from(el.querySelectorAll('.kx-input-otp__slot')).map((s) => s.textContent!.trim())).toEqual(['1', '2', '3', '4']);
  });

  it('splits the cells into the requested groups', () => {
    const { el } = host(`<kx-input-otp aria-label="Code" [groups]="[3, 3]" />`, imports);
    expect(Array.from(el.querySelectorAll('.kx-input-otp__group')).map((g) => g.children.length)).toEqual([3, 3]);
    expect(el.querySelectorAll('.kx-input-otp__separator')).toHaveLength(1);
  });

  it('forwards the invalid state and a description to the input assistive technology reads', () => {
    const { el } = host(`<kx-input-otp aria-label="Code" aria-invalid="true" aria-describedby="code-error" />`, imports);
    const input = el.querySelector('input')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('code-error');
  });
});

describe('KxRating', () => {
  const imports = [KxRating, ReactiveFormsModule];

  it('is a named radiogroup of real radios, one per star', () => {
    const { el } = host(`<kx-rating aria-label="Rate this article" [value]="3" />`, imports);
    const group = el.querySelector('kx-rating')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Rate this article');
    const radios = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(radios.map((r) => r.type)).toEqual(['radio', 'radio', 'radio', 'radio', 'radio']);
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual(['1 star', '2 stars', '3 stars', '4 stars', '5 stars']);
    expect(radios.map((r) => r.checked)).toEqual([false, false, true, false, false]);
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
  });

  it('chooses a star into the form model', () => {
    const control = new FormControl(0);
    const { el, fixture } = host(`<kx-rating [formControl]="control" />`, imports, { control });
    expect(el.querySelector('kx-rating')!.getAttribute('aria-label')).toBe('Rating');
    (el.querySelectorAll('input')[3] as HTMLInputElement).click();
    fixture.detectChanges();
    expect(control.value).toBe(4);
    control.disable();
    fixture.detectChanges();
    expect(Array.from(el.querySelectorAll('input')).every((r) => r.disabled)).toBe(true);
  });

  it('read-only is a single image with the score as its name, and no controls', () => {
    const { el } = host(`<kx-rating [value]="4" readonly />`, imports);
    const group = el.querySelector('kx-rating')!;
    expect(group.getAttribute('role')).toBe('img');
    expect(group.getAttribute('aria-label')).toBe('Rated 4 out of 5');
    expect(el.querySelectorAll('input')).toHaveLength(0);
    expect(el.querySelectorAll('.kx-rating__star--on')).toHaveLength(4);
  });
});

describe('KxNumberInput read-only', () => {
  it('keeps the value but disables both steppers and the input itself', () => {
    const { el } = host(`<kx-number-input aria-label="Seats" [value]="20" readonly />`, [KxNumberInput]);
    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe('20');
    expect(Array.from(el.querySelectorAll('button')).every((b) => b.disabled)).toBe(true);
  });
});
