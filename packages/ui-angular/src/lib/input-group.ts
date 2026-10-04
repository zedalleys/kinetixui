import { ChangeDetectionStrategy, Component, Directive, input } from '@angular/core';

/* ── input group ────────────────────────────────────────────────────────── */

/**
 *   <kx-input-group>
 *     <kx-input-group-text>https://</kx-input-group-text>
 *     <input kxInputGroupInput aria-label="Website" placeholder="kinetixui.com" />
 *     <button kxInputGroupButton>Copy</button>
 *   </kx-input-group>
 *
 * One bordered field that hosts an input plus fixed add-ons (an icon, text, a button) on either side — React's
 * InputGroup. The input is a real `<input>` carrying `kxInputGroupInput`, so `ngModel`, `formControlName`,
 * `type`, `autocomplete`, `readonly` and the browser's validation all work on it untouched, and it is the only
 * thing in the group a label has to name.
 *
 * The shell follows the text-entry state contract (TOKENS.md, "Composite fields"): it is ONE field, and it reads
 * its edge, hover, focus, invalid, read-only and disabled states from the input inside it — `aria-invalid`,
 * `readonly` and `disabled` go on the input, where assistive technology reads them, and the shell follows. A
 * focused add-on button draws its own inset ring and leaves the shell at rest, so the ring says which part has
 * focus.
 */
@Component({
  selector: 'kx-input-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-input-group' },
})
export class KxInputGroup {}

/** The group's input. Put it on a real `<input>`; every native and Angular forms attribute still applies. */
@Directive({ selector: 'input[kxInputGroupInput]', host: { class: 'kx-input-group__input' } })
export class KxInputGroupInput {}

/**
 * An icon or a cluster of add-ons at one end of the group. `align` is logical: `start` is the reading start,
 * so the add-on follows the page into right-to-left without a separate RTL rule.
 */
@Component({
  selector: 'kx-input-group-addon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { '[class]': '"kx-input-group__addon kx-input-group__addon--" + align()' },
})
export class KxInputGroupAddon {
  readonly align = input<'start' | 'end'>('start');
}

/** Fixed text beside the input — a protocol, a unit, a domain. Not announced as part of the input's value. */
@Component({
  selector: 'kx-input-group-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-input-group__text' },
})
export class KxInputGroupText {}

/**
 * A real `<button>` inside the group, divided from the input by a quiet internal line. `type` defaults to
 * `button`, so a button in a group inside a `<form>` never submits it by accident.
 */
@Directive({
  selector: 'button[kxInputGroupButton]',
  host: { class: 'kx-input-group__button', '[attr.type]': 'type()' },
})
export class KxInputGroupButton {
  readonly type = input<'button' | 'submit' | 'reset'>('button');
}
