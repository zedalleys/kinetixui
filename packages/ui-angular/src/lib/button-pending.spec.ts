import { Component, PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { KxButton } from './button';

/**
 * `pending` on `KxButton` — the state for "the action I started is in flight".
 *
 * The same four risks the React slice asserts, in Angular's terms: focus is kept, the announcement is
 * one per transition and lives outside the button's name, the indicator slot is reserved in both
 * states, and every device is suppressed. The negative control is at the bottom: a plain
 * `[disabled]="pending"` button, written out here, failing the focus assertion this one passes.
 *
 * Each pending-aware button owns one `[data-kx-pending-region]` node on `document.body` (the reason
 * is on the constant in button.ts), so these tests read the regions from there and clean up any the
 * fixture's teardown did not.
 */

@Component({
  selector: 'kx-test-host',
  imports: [KxButton],
  template: `
    <button kxButton [pending]="busy()" [pendingLabel]="label()" (click)="hits.push('press')">Save</button>
    <button kxButton (click)="hits.push('plain')">Cancel</button>
  `,
})
class Host {
  readonly busy = signal<boolean | undefined>(false);
  readonly label = signal('Working…');
  readonly hits: string[] = [];
}

function setup() {
  TestBed.configureTestingModule({ imports: [Host], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const buttons = root.querySelectorAll<HTMLButtonElement>('button.kx-btn');
  return { fixture, host: fixture.componentInstance, button: buttons[0]!, plain: buttons[1]! };
}

const regions = () => [...document.querySelectorAll<HTMLElement>('[data-kx-pending-region]')];
const region = () => regions()[0] ?? null;
const announced = () => region()?.textContent ?? null;
/**
 * Every region's text, sorted. Deliberately order-free: which of two buttons' effects runs first in
 * a change-detection flush is Angular's business, not this contract's, and an assertion that
 * depended on it would be asserting the scheduler.
 */
const texts = () => regions().map((node) => node.textContent).sort();

afterEach(() => regions().forEach((node) => node.remove()));

describe('KxButton pending — semantics', () => {
  it('is aria-disabled and aria-busy, and never the disabled attribute', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.hasAttribute('data-pending')).toBe(true);
    expect(button.disabled).toBe(false);
  });

  it('clears everything it owns when a bound pending goes back to undefined', () => {
    // `[pending]="busy()"` where busy is `boolean | undefined` — an async value that resolves to
    // nothing, or a row object that loses the key. The early return for `undefined` exists so a
    // button written before `pending` existed renders byte-identically; it must not also mean that a
    // button which WAS pending stays pending for ever. The activation guard reads `aria-disabled`,
    // so leaving it behind leaves the button permanently unusable.
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-disabled')).toBe('true');

    host.busy.set(undefined);
    fixture.detectChanges();
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.hasAttribute('data-pending')).toBe(false);
    expect(announced()).toBe('');
  });

  it('is pressable again after a bound pending goes back to undefined', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    button.click();
    expect(host.hits).toEqual([]); // suppressed while pending

    host.busy.set(undefined);
    fixture.detectChanges();
    button.click();
    expect(host.hits).toEqual(['press']);
  });

  it('still touches nothing at a call site that never mentions pending', () => {
    // The other half of the same rule: the plain button has no `pending` binding at all, so the
    // directive must not create a region or write an attribute for it.
    const { plain } = setup();
    expect(plain.hasAttribute('aria-busy')).toBe(false);
    expect(plain.hasAttribute('data-pending')).toBe(false);
    expect(plain.hasAttribute('aria-disabled')).toBe(false);
  });

  it('keeps the accessible name out of the announcement', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    // The name is the button's own text, unchanged; the status is in a region outside it.
    expect(button.textContent?.trim()).toBe('Save');
    expect(button.querySelector('[aria-live]')).toBeNull();
    expect(announced()).toBe('Working…');
    expect(region()?.getAttribute('aria-live')).toBe('polite');
  });

  it('takes a localised pendingLabel', () => {
    const { fixture, host } = setup();
    host.label.set('جارٍ الحفظ…');
    host.busy.set(true);
    fixture.detectChanges();
    expect(announced()).toBe('جارٍ الحفظ…');
  });

  it('clears the region on the way out', () => {
    const { fixture, host } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    host.busy.set(false);
    fixture.detectChanges();
    expect(announced()).toBe('');
  });

  it('takes its region with it when a pending button is destroyed', () => {
    const { fixture, host } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    expect(announced()).toBe('Working…');
    fixture.destroy();
    // Not merely cleared — removed. No "Working…" is left in the document for an action whose
    // button no longer exists.
    expect(regions()).toHaveLength(0);
  });
});

describe('KxButton pending — focus is kept', () => {
  it('stays focusable while pending, which a disabled button is not', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.tabIndex).toBe(0);
  });

  it('holds focus across the transition', () => {
    const { fixture, host, button } = setup();
    button.focus();
    host.busy.set(true);
    fixture.detectChanges();
    expect(document.activeElement).toBe(button);
  });
});

describe('KxButton pending — activation is suppressed', () => {
  it('swallows a click, and the caller’s own (click) with it', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(host.hits).toEqual([]);
  });

  it('swallows Enter and Space', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    for (const key of ['Enter', ' ']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      button.dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(true);
    }
    expect(host.hits).toEqual([]);
  });

  it('leaves Tab alone, so the control stays reachable', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('lets everything through again once pending clears', () => {
    const { fixture, host, button } = setup();
    host.busy.set(true);
    fixture.detectChanges();
    host.busy.set(false);
    fixture.detectChanges();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(host.hits).toEqual(['press']);
  });
});

describe('KxButton pending — a button that never mentions it is untouched', () => {
  it('gets no slot class and no attributes', () => {
    const { plain } = setup();
    expect(plain.className).not.toContain('kx-btn--pending-aware');
    expect(plain.hasAttribute('aria-busy')).toBe(false);
    expect(plain.hasAttribute('data-pending')).toBe(false);
  });

  it('the aware button creates its region empty, and says nothing yet', () => {
    setup();
    // Created on the first render of a pending-aware button rather than at the first announcement:
    // a live region inserted and filled in the same task is unreliably announced.
    expect(region()).not.toBeNull();
    expect(announced()).toBe('');
  });

  it('reserves the slot as soon as the input is bound, even at false', () => {
    const { button } = setup();
    // Bound and false: opted in, not pending. The slot exists so the label cannot jump later.
    expect(button.className).toContain('kx-btn--pending-aware');
    expect(button.hasAttribute('data-pending')).toBe(false);
  });
});

describe("KxButton pending — doesn't take over an aria-disabled the caller wrote", () => {
  it('leaves a caller-owned aria-disabled in place when pending clears', () => {
    const { fixture, host, button } = setup();
    button.setAttribute('aria-disabled', 'true');
    host.busy.set(true);
    fixture.detectChanges();
    host.busy.set(false);
    fixture.detectChanges();
    // The directive only removes the attribute it set itself.
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });
});

/* ---------------------------------------------------------------------------------------------- *
 * The shared live region's lifecycle, with more than one button on the page.
 *
 * One node is shared by every pending-aware button, and that is a design decision (see the comment
 * on the region in button.ts): a child would join the button's accessible name, a sibling would be a
 * flex item in the caller's row. The cost is that the node has to be owned rather than written to,
 * and these are the eight transitions that prove it is.
 *
 * What is asserted here is which text the region holds after each transition. Whether a screen
 * reader reads two rapid polite announcements, and in what order, is the AT's decision and is NOT
 * claimed — nothing here ran against one.
 * ---------------------------------------------------------------------------------------------- */

@Component({
  selector: 'kx-two-host',
  imports: [KxButton],
  template: `
    @if (showFirst()) {
      <button kxButton [pending]="firstBusy()" [pendingLabel]="firstLabel()">Save</button>
    }
    <button kxButton [pending]="secondBusy()" pendingLabel="Uploading…">Upload</button>
  `,
})
class TwoHost {
  readonly showFirst = signal(true);
  readonly firstBusy = signal(false);
  readonly firstLabel = signal('Saving…');
  readonly secondBusy = signal(false);
}

function setupTwo() {
  TestBed.configureTestingModule({ imports: [TwoHost], providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(TwoHost);
  fixture.detectChanges();
  const at = (i: number) => (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button.kx-btn')[i]!;
  return { fixture, host: fixture.componentInstance, at };
}

describe('KxButton pending — two buttons, two regions', () => {
  it('1. each enters pending on its own, and each carries its own busy state', () => {
    const { fixture, host, at } = setupTwo();
    host.firstBusy.set(true);
    fixture.detectChanges();
    expect(texts()).toEqual(['', 'Saving…']);

    host.secondBusy.set(true);
    fixture.detectChanges();
    expect(at(0).getAttribute('aria-busy')).toBe('true');
    expect(at(1).getAttribute('aria-busy')).toBe('true');
    expect(texts()).toEqual(['Saving…', 'Uploading…']);
  });

  it('2. the second entering pending announces itself without disturbing the first', () => {
    const { fixture, host, at } = setupTwo();
    host.firstBusy.set(true);
    fixture.detectChanges();
    host.secondBusy.set(true);
    fixture.detectChanges();
    // Each status is its own line. Neither overwrote the other, and both elements report busy.
    expect(texts()).toEqual(['Saving…', 'Uploading…']);
    expect(at(0).hasAttribute('data-pending')).toBe(true);
    expect(at(1).hasAttribute('data-pending')).toBe(true);
  });

  it('3. the first settling clears only its own status', () => {
    const { fixture, host } = setupTwo();
    host.firstBusy.set(true);
    host.secondBusy.set(true);
    fixture.detectChanges();
    host.firstBusy.set(false);
    fixture.detectChanges();
    // This is the defect a per-button region exists for: one shared node wrote '' here, and an
    // ownership set over one shared node would have left it holding the SETTLED button's label.
    expect(texts()).toEqual(['', 'Uploading…']);
  });

  it('4. destroying a pending button takes its region with it and leaves the other alone', () => {
    const { fixture, host } = setupTwo();
    host.firstBusy.set(true);
    host.secondBusy.set(true);
    fixture.detectChanges();
    expect(regions()).toHaveLength(2);

    host.showFirst.set(false);
    fixture.detectChanges();

    // No "Saving…" left in the document for an action that no longer has a button.
    expect(regions()).toHaveLength(1);
    expect(texts()).toEqual(['Uploading…']);
  });

  it('5. both settling leaves both regions empty', () => {
    const { fixture, host } = setupTwo();
    host.firstBusy.set(true);
    host.secondBusy.set(true);
    fixture.detectChanges();
    host.firstBusy.set(false);
    host.secondBusy.set(false);
    fixture.detectChanges();
    expect(texts()).toEqual(['', '']);
  });

  it('6. an unrelated change-detection cycle announces nothing', () => {
    const { fixture, host } = setupTwo();
    host.secondBusy.set(true);
    fixture.detectChanges();

    // Count writes to the region rather than its text: a re-write of the SAME text is still a second
    // announcement to a screen reader, and only a mutation record can see it.
    let writes = 0;
    const observer = new MutationObserver((records) => {
      writes += records.length;
    });
    for (const node of regions()) observer.observe(node, { childList: true, characterData: true, subtree: true });

    host.firstLabel.set('Storing…'); // the idle button's label: it is not pending, so nothing is said
    fixture.detectChanges();
    fixture.detectChanges();
    observer.disconnect();

    expect(writes).toBe(0);
    expect(texts()).toEqual(['', 'Uploading…']);
  });

  it('7. a label that changes mid-flight is announced, because the status changed', () => {
    const { fixture, host } = setupTwo();
    host.firstBusy.set(true);
    fixture.detectChanges();
    expect(texts()).toEqual(['', 'Saving…']);
    host.firstLabel.set('Still saving…');
    fixture.detectChanges();
    expect(texts()).toEqual(['', 'Still saving…']);
  });

  it('8. an idle pending-aware button does not erase a live announcement', () => {
    const { fixture, host } = setupTwo();
    host.firstBusy.set(true);
    fixture.detectChanges();
    expect(texts()).toEqual(['', 'Saving…']);

    // The second button is opted in and idle — the shape that used to write '' over whatever the
    // shared node was holding.
    host.secondBusy.set(false);
    fixture.detectChanges();
    expect(texts()).toEqual(['', 'Saving…']);
  });
});

@Component({
  selector: 'kx-server-host',
  imports: [KxButton],
  // An element-level provider, so the directive resolves `PLATFORM_ID` from here while Angular's own
  // machinery keeps the root one — the closest this environment gets to a server render.
  providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
  template: `<button kxButton [pending]="busy()">Save</button>`,
})
class ServerHost {
  readonly busy = signal(false);
}

describe('KxButton pending — on the server', () => {
  it('writes the element state, creates no region, and throws nothing', () => {
    TestBed.configureTestingModule({ imports: [ServerHost], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ServerHost);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(() => {
      fixture.componentInstance.busy.set(true);
      fixture.detectChanges();
    }).not.toThrow();

    // The semantics are on the element, which exists on the server too.
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    // The announcement is not. No node, so nothing to serialize and nothing to duplicate on
    // hydration — the client directive creates its own region when it takes over.
    expect(regions()).toHaveLength(0);

    // NOT a real server render: this proves the platform guard, not that Angular Universal renders a
    // page carrying this directive. No platform-server run stands behind that.
  });
});

describe('KxButton pending — disabled wins', () => {
  it('a disabled pending button is not reported as working', () => {
    TestBed.configureTestingModule({ imports: [DisabledHost], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(DisabledHost);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();

    expect(button.disabled).toBe(true);
    expect(button.hasAttribute('data-pending')).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(announced()).toBe('');
  });

  it('becoming disabled WHILE pending withdraws the busy state and the announcement', async () => {
    TestBed.configureTestingModule({ imports: [DisabledHost], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(DisabledHost);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    fixture.componentInstance.off.set(false);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    expect(button.getAttribute('aria-busy')).toBe('true');

    fixture.componentInstance.off.set(true);
    fixture.detectChanges();
    // `disabled` is a property binding, not a signal, so this is picked up by the attribute observer
    // rather than by the effect — which is asynchronous. One microtask is enough.
    await Promise.resolve();

    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.hasAttribute('data-pending')).toBe(false);
    expect(announced()).toBe('');
  });
});

/**
 * THE NEGATIVE CONTROL — the obvious implementation, and what it costs.
 */
@Component({
  selector: 'kx-naive-host',
  imports: [KxButton],
  template: `<button kxButton [disabled]="busy()">Save</button>`,
})
class NaiveHost {
  readonly busy = signal(false);
}

describe('negative control: [disabled]="pending"', () => {
  it('cannot be focused while pending, and drops out of the tab order', () => {
    TestBed.configureTestingModule({ imports: [NaiveHost], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(NaiveHost);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();

    button.focus();
    // The failure, recorded. A browser also blurs it retroactively at the moment the attribute lands,
    // returning a user who had just pressed it to the top of the document; jsdom does not model that
    // blur, so this asserts the property which causes it.
    expect(document.activeElement).not.toBe(button);
    expect(button.disabled).toBe(true);
  });

  it('and announces nothing at all while it works', () => {
    TestBed.configureTestingModule({ imports: [NaiveHost], providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(NaiveHost);
    fixture.detectChanges();
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    expect(region()).toBeNull();
  });
});


@Component({
  selector: 'kx-disabled-host',
  imports: [KxButton],
  template: `<button kxButton [pending]="busy()" [disabled]="off()">Save</button>`,
})
class DisabledHost {
  readonly busy = signal(false);
  readonly off = signal(true);
}

/**
 * THE SECOND NEGATIVE CONTROL — one shared region, written to without ownership.
 *
 * This is the previous implementation's policy, reproduced here over its own node rather than left
 * in the component: every pending-aware button writes `pending ? label : ''`. It is the version that
 * passed every single-button test above, which is exactly why it needs a control of its own.
 */
function unownedAnnounce(node: HTMLElement, pending: boolean, label: string): void {
  node.textContent = pending ? label : '';
}

describe('negative control: a shared region written to without ownership', () => {
  it('lets a settling button erase the status of one that is still working', () => {
    const node = document.createElement('div');
    document.body.appendChild(node);
    try {
      unownedAnnounce(node, true, 'Saving…'); // button A starts
      unownedAnnounce(node, true, 'Uploading…'); // button B starts
      unownedAnnounce(node, false, 'Saving…'); // button A finishes — B is still working

      // The failure, recorded: B is pending and the region says nothing.
      expect(node.textContent).toBe('');
      // The real implementation keeps B's status here; see scenario 3 above.
    } finally {
      node.remove();
    }
  });

  it('lets an idle button erase an announcement just made by another', () => {
    const node = document.createElement('div');
    document.body.appendChild(node);
    try {
      unownedAnnounce(node, true, 'Saving…'); // button A starts
      unownedAnnounce(node, false, 'Uploading…'); // button B mounts, not pending
      expect(node.textContent).toBe('');
      // The real implementation keeps A's status here; see scenario 8 above.
    } finally {
      node.remove();
    }
  });
});
