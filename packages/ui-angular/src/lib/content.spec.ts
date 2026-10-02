import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KxBanner,
  KxButtonGroup,
  KxButtonGroupSeparator,
  KxButtonGroupText,
  KxCircularProgress,
  KxCodeBlock,
  KxDescriptionList,
  KxDescriptionListItem,
  KxFab,
  KxImage,
  KxInform,
  KxList,
  KxListItem,
  KxMarquee,
  KxMarqueeContent,
  KxPageHeader,
  KxTimeline,
  KxTimelineItem,
} from './content';
import {
  BannerDemo,
  ButtonGroupDemo,
  CircularProgressDemo,
  CodeBlockDemo,
  DescriptionListDemo,
  FabDemo,
  ImageDemo,
  InformDemo,
  ListDemo,
  MarqueeDemo,
  PageHeaderDemo,
  TimelineDemo,
} from '../usage/examples';

/**
 * The content wave's behaviour, not its appearance.
 *
 * Every assertion here is about something a user can perceive or operate: the role a surface reports, whether
 * an indeterminate progressbar withholds a value it does not have, whether a pressable row is a real button,
 * whether a list stays a list. Class names are asserted only where the class IS the contract (a variant
 * modifier), never as a proxy for behaviour — a test that checks `kx-banner--warning` exists proves the
 * variant was wired, and proves nothing about contrast, which is `check:contrast`'s job.
 */

const render = <T,>(type: new (...args: never[]) => T) => {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  return fixture;
};

// kx-verify: interaction, accessibility

describe('KxBanner', () => {
  @Component({
    imports: [KxBanner],
    template: `
      <kx-banner [variant]="variant()" [dismissible]="dismissible()" (dismiss)="dismissed = dismissed + 1">
        Scheduled maintenance.
      </kx-banner>
    `,
  })
  class Host {
    readonly variant = signal<'information' | 'warning'>('information');
    readonly dismissible = signal(false);
    dismissed = 0;
  }

  it('is a polite live region, not an assertive one', () => {
    const el = render(Host).nativeElement.querySelector('kx-banner')!;
    // A banner is persistent and usually present on arrival. role="alert" would interrupt a screen-reader
    // user mid-sentence to announce something that is not urgent.
    expect(el.getAttribute('role')).toBe('status');
  });

  it('carries the variant as a modifier class so the intent is in the DOM', () => {
    const f = render(Host);
    const el = f.nativeElement.querySelector('kx-banner')!;
    expect(el.className).toContain('kx-banner--information');
    f.componentInstance.variant.set('warning');
    f.detectChanges();
    expect(el.className).toContain('kx-banner--warning');
    expect(el.className).not.toContain('kx-banner--information');
  });

  it('renders a visible dismiss glyph when the caller projects none', () => {
    const f = render(Host);
    f.componentInstance.dismissible.set(true);
    f.detectChanges();
    const button = f.nativeElement.querySelector('.kx-banner__dismiss')!;
    // An empty button is a few pixels of nothing: only someone reading the aria-label could find it,
    // which is precisely backwards. The glyph is ng-content FALLBACK, so projecting replaces it.
    expect(button.querySelector('.kx-dismiss-glyph')).not.toBeNull();
    expect(button.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows no dismiss control unless asked, and emits rather than hiding itself', () => {
    const f = render(Host);
    expect(f.nativeElement.querySelector('.kx-banner__dismiss')).toBeNull();
    f.componentInstance.dismissible.set(true);
    f.detectChanges();
    const button: HTMLButtonElement = f.nativeElement.querySelector('.kx-banner__dismiss')!;
    // A named button, because an icon-only control with no name is unusable by anyone who cannot see it.
    expect(button.getAttribute('aria-label')).toBe('Dismiss');
    button.click();
    expect(f.componentInstance.dismissed).toBe(1);
    // Still in the DOM: the caller owns the visibility, which is what lets it animate or persist the choice.
    expect(f.nativeElement.querySelector('kx-banner')).not.toBeNull();
  });
});

describe('KxInform', () => {
  @Component({
    imports: [KxInform],
    template: `<kx-inform variant="error" dismissible (dismiss)="dismissed = true">Could not save.</kx-inform>`,
  })
  class Host {
    dismissed = false;
  }

  it('reports status and renders its message in a paragraph', () => {
    const el = render(Host).nativeElement.querySelector('kx-inform')!;
    expect(el.getAttribute('role')).toBe('status');
    expect(el.querySelector('.kx-inform__message')?.textContent?.trim()).toBe('Could not save.');
  });

  it('emits dismiss', () => {
    const f = render(Host);
    f.nativeElement.querySelector<HTMLButtonElement>('.kx-inform__dismiss')!.click();
    expect(f.componentInstance.dismissed).toBe(true);
  });
});

describe('KxButtonGroup', () => {
  @Component({
    imports: [KxButtonGroup, KxButtonGroupSeparator, KxButtonGroupText],
    template: `
      <div kxButtonGroup [orientation]="'vertical'">
        <kx-button-group-text>Qty</kx-button-group-text>
        <button type="button">One</button>
        <kx-button-group-separator orientation="horizontal" />
        <button type="button">Two</button>
      </div>
    `,
  })
  class Host {}

  it('is a group, and says which way it runs', () => {
    const el = render(Host).nativeElement.querySelector('[kxButtonGroup]')!;
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('data-orientation')).toBe('vertical');
    expect(el.className).toContain('kx-button-group--vertical');
  });

  it('leaves each button individually tabbable', () => {
    const buttons = render(Host).nativeElement.querySelectorAll('button');
    // No roving tabindex: these are buttons in a cluster, not a toolbar. Managing focus here would take
    // Tab away from callers who already rely on it.
    for (const b of buttons) expect(b.getAttribute('tabindex')).toBeNull();
  });

  it('gives the separator an orientation a screen reader can use', () => {
    const sep = render(Host).nativeElement.querySelector('kx-button-group-separator')!;
    expect(sep.getAttribute('role')).toBe('separator');
    expect(sep.getAttribute('aria-orientation')).toBe('horizontal');
  });
});

describe('KxCircularProgress', () => {
  @Component({
    imports: [KxCircularProgress],
    template: `<kx-circular-progress [value]="value()" [showValue]="true" />`,
  })
  class Host {
    readonly value = signal<number | undefined>(40);
  }

  it('reports the value, clamped to the range it advertises', () => {
    const f = render(Host);
    const el = f.nativeElement.querySelector('kx-circular-progress')!;
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
    expect(el.getAttribute('aria-valuenow')).toBe('40');
    f.componentInstance.value.set(180);
    f.detectChanges();
    expect(el.getAttribute('aria-valuenow')).toBe('100');
  });

  it('omits aria-valuenow when indeterminate instead of claiming zero', () => {
    const f = render(Host);
    f.componentInstance.value.set(undefined);
    f.detectChanges();
    const el = f.nativeElement.querySelector('kx-circular-progress')!;
    // "0%" and "we do not know yet" are different claims, and ARIA spells the second as no value at all.
    expect(el.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('hides the ring from assistive technology, since the value is already on the host', () => {
    const svg = render(Host).nativeElement.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('KxCodeBlock', () => {
  @Component({
    imports: [KxCodeBlock],
    template: `<kx-code-block [files]="files" />`,
  })
  class Host {
    readonly files = [
      { name: 'app.ts', code: 'const a = 1;' },
      { name: 'app.html', code: '<p>hi</p>' },
    ];
  }

  it('preserves the code verbatim inside pre > code', () => {
    const pre = render(Host).nativeElement.querySelector('pre > code')!;
    expect(pre.textContent).toBe('const a = 1;');
  });

  it('is a real tablist, and only the selected tab is in the tab order', () => {
    const f = render(Host);
    const tabs = f.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]');
    expect(f.nativeElement.querySelector('[role="tablist"]')).not.toBeNull();
    expect(tabs.length).toBe(2);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]!.getAttribute('tabindex')).toBe('0');
    expect(tabs[1]!.getAttribute('tabindex')).toBe('-1');
  });

  it('moves between files with the arrow keys and switches the shown code', () => {
    const f = render(Host);
    const tabs = f.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    f.detectChanges();
    expect(f.nativeElement.querySelector('pre > code')!.textContent).toBe('<p>hi</p>');
    tabs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    f.detectChanges();
    expect(f.nativeElement.querySelector('pre > code')!.textContent).toBe('const a = 1;');
  });

  it('offers the copy button with no filename and no tabs', async () => {
    @Component({ imports: [KxCodeBlock], template: `<kx-code-block [code]="'const a = 1;'" />` })
    class Bare {}
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const f = render(Bare);
    // The bare form is the documented basic usage; copying is the component's reason to exist beyond a
    // <pre>, so it cannot depend on supplying optional metadata.
    expect(f.nativeElement.querySelector('.kx-code-block__header')).toBeNull();
    const copy = f.nativeElement.querySelector<HTMLButtonElement>('.kx-code-block__copy');
    expect(copy).not.toBeNull();
    expect(copy!.querySelector('.kx-copy-glyph')).not.toBeNull();
    copy!.click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('const a = 1;');
  });

  it('announces the copy result rather than only swapping an icon', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const f = render(Host);
    f.nativeElement.querySelector<HTMLButtonElement>('.kx-code-block__copy')!.click();
    await Promise.resolve();
    f.detectChanges();
    expect(writeText).toHaveBeenCalledWith('const a = 1;');
    // The tick is invisible to a screen reader; the live region is what makes the outcome available.
    expect(f.nativeElement.querySelector('[role="status"]')!.textContent!.trim()).toBe('Copied');
  });

  it('survives a clipboard that refuses, leaving the code selectable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const f = render(Host);
    f.nativeElement.querySelector<HTMLButtonElement>('.kx-code-block__copy')!.click();
    await Promise.resolve();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="status"]')!.textContent!.trim()).toBe('');
    expect(f.nativeElement.querySelector('pre')!.getAttribute('tabindex')).toBe('0');
  });
});

describe('KxDescriptionList', () => {
  @Component({
    imports: [KxDescriptionList, KxDescriptionListItem],
    template: `
      <dl kxDescriptionList>
        <div kxDescriptionListItem term="Status">Active</div>
        <div kxDescriptionListItem term="Notes" layout="stacked">Renews annually.</div>
      </dl>
    `,
  })
  class Host {}

  it('groups each pair in a div, which is the only wrapper a dl allows', () => {
    const el = render(Host).nativeElement;
    const dl = el.querySelector('dl')!;
    // A dl's content model is dt/dd directly, or grouped in a div. A custom element is neither, and an
    // earlier spelling used one — the grouping was invalid and the association left to chance.
    for (const child of dl.children) expect(child.tagName.toLowerCase()).toBe('div');
    expect(dl.querySelector('div > dt')).not.toBeNull();
    expect(dl.querySelector('div > dd')).not.toBeNull();
  });

  it('uses real dt/dd pairs inside a real dl', () => {
    const el = render(Host).nativeElement;
    expect(el.querySelector('dl')).not.toBeNull();
    const terms = [...el.querySelectorAll('dt')].map((d: Element) => d.textContent!.trim());
    const values = [...el.querySelectorAll('dd')].map((d: Element) => d.textContent!.trim());
    expect(terms).toEqual(['Status', 'Notes']);
    expect(values).toEqual(['Active', 'Renews annually.']);
  });

  it('carries the layout as a modifier', () => {
    const items = render(Host).nativeElement.querySelectorAll('[kxDescriptionListItem]');
    expect(items[0]!.className).toContain('kx-description-list__item--row');
    expect(items[1]!.className).toContain('kx-description-list__item--stacked');
  });
});

describe('KxFab', () => {
  @Component({
    imports: [KxFab],
    template: `
      <button kxFab type="button" aria-label="New message" [disabled]="disabled()">+</button>
      <button kxFab extended size="sm" variant="Secondary" type="button">New message</button>
    `,
  })
  class Host {
    readonly disabled = signal(false);
  }

  it('is a real button, so disabled is the element’s own', () => {
    const f = render(Host);
    const fab: HTMLButtonElement = f.nativeElement.querySelector('button[kxFab]')!;
    expect(fab.disabled).toBe(false);
    f.componentInstance.disabled.set(true);
    f.detectChanges();
    expect(fab.disabled).toBe(true);
  });

  it('applies variant, size and the extended form as classes', () => {
    const [, second] = render(Host).nativeElement.querySelectorAll('button[kxFab]');
    expect(second!.className).toContain('kx-fab--Secondary');
    expect(second!.className).toContain('kx-fab--sm');
    expect(second!.className).toContain('kx-fab--extended');
  });
});

describe('KxImage', () => {
  @Component({
    imports: [KxImage],
    template: `
      <kx-image [src]="src()" alt="Harbour at dusk" ratio="16:9">
        <span kxImageFallback>Unavailable</span>
      </kx-image>
    `,
  })
  class Host {
    readonly src = signal('/cover.jpg');
  }

  it('reserves the aspect ratio before the image arrives, so the page does not reflow', () => {
    const el = render(Host).nativeElement.querySelector('kx-image')!;
    // The ratio is published as a custom property and applied by the stylesheet, the same way
    // `kx-aspect-ratio` does it. Asserting the property is also the only thing jsdom can see: its CSS
    // engine silently drops `aspect-ratio`, so a test against the shorthand would pass vacuously.
    expect(el.style.getPropertyValue('--kx-image-ratio')).toBe(String(16 / 9));
  });

  it('passes alt through and lazy-loads by default', () => {
    const img = render(Host).nativeElement.querySelector('img')!;
    expect(img.getAttribute('alt')).toBe('Harbour at dusk');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('swaps to the fallback slot on error, dropping the broken img', () => {
    const f = render(Host);
    f.nativeElement.querySelector('img')!.dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(f.nativeElement.querySelector('img')).toBeNull();
    expect(f.nativeElement.querySelector('.kx-image__fallback')!.textContent).toContain('Unavailable');
  });

  it('forgets a failed source when a new one arrives', () => {
    const f = render(Host);
    f.nativeElement.querySelector('img')!.dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(f.nativeElement.querySelector('img')).toBeNull();
    f.componentInstance.src.set('/other.jpg');
    f.detectChanges();
    // Without a reset the fallback stayed rendered for ever and the new URL was never requested.
    const img = f.nativeElement.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('/other.jpg');
    expect(img!.className).not.toContain('kx-image__img--loaded');
  });

  it('marks the image loaded so the fade-in has something to key off', () => {
    const f = render(Host);
    const img = f.nativeElement.querySelector('img')!;
    expect(img.className).not.toContain('kx-image__img--loaded');
    img.dispatchEvent(new Event('load'));
    f.detectChanges();
    expect(f.nativeElement.querySelector('img')!.className).toContain('kx-image__img--loaded');
  });
});

describe('KxList', () => {
  @Component({
    imports: [KxList, KxListItem],
    template: `
      <ul kxList>
        <li kxListItem title="Billing" description="Invoices" pressable (select)="opened = opened + 1"></li>
        <li kxListItem title="Audit log" disabled pressable></li>
        <li kxListItem title="Plain row"></li>
      </ul>
    `,
  })
  class Host {
    opened = 0;
  }

  it('stays a real list of real list items', () => {
    const el = render(Host).nativeElement;
    // Not role="list" on a div: the element that already means list is the one that survives every
    // assistive-technology quirk, and it gives "3 of 3" for free.
    expect(el.querySelector('ul')).not.toBeNull();
    expect(el.querySelectorAll('li').length).toBe(3);
  });

  it('makes a pressable row a button inside the item, not the item itself', () => {
    const li = render(Host).nativeElement.querySelector('li')!;
    const button = li.querySelector('button');
    expect(button).not.toBeNull();
    // An element cannot be both a listitem and a button, and the list's children must be listitems.
    expect(li.getAttribute('role')).toBeNull();
  });

  it('activates on click, and therefore on Enter and Space, because it is a button', () => {
    const f = render(Host);
    f.nativeElement.querySelector<HTMLButtonElement>('li button')!.click();
    expect(f.componentInstance.opened).toBe(1);
  });

  it('disables the row through the button, so it leaves the tab order', () => {
    const rows = render(Host).nativeElement.querySelectorAll<HTMLButtonElement>('li button');
    expect(rows[1]!.disabled).toBe(true);
  });

  it('renders a static row without a button at all', () => {
    const items = render(Host).nativeElement.querySelectorAll('li');
    expect(items[2]!.querySelector('button')).toBeNull();
    expect(items[2]!.textContent).toContain('Plain row');
  });
});

describe('KxMarquee', () => {
  @Component({
    imports: [KxMarquee, KxMarqueeContent],
    template: `
      <kx-marquee [durationSeconds]="30" pauseOnHover>
        <ng-template kxMarqueeContent><span>Ships worldwide</span></ng-template>
      </kx-marquee>
    `,
  })
  class Host {}

  it('renders the content twice for a seamless loop and hides the duplicate', () => {
    const groups = render(Host).nativeElement.querySelectorAll('.kx-marquee__group');
    expect(groups.length).toBe(2);
    expect(groups[0]!.getAttribute('aria-hidden')).toBeNull();
    // Read once, not twice: the second copy exists only so the loop has no gap.
    expect(groups[1]!.getAttribute('aria-hidden')).toBe('true');
    expect(groups[0]!.textContent).toContain('Ships worldwide');
    expect(groups[1]!.textContent).toContain('Ships worldwide');
  });

  it('puts the duration on the animation rather than in a stylesheet', () => {
    const track = render(Host).nativeElement.querySelector('.kx-marquee__track')!;
    expect(track.style.animationDuration).toBe('30s');
  });
});

describe('KxPageHeader', () => {
  @Component({
    imports: [KxPageHeader],
    template: `
      <kx-page-header [title]="'Billing'" description="Plan and invoices" [level]="level()">
        <button kxPageHeaderActions type="button">Upgrade</button>
      </kx-page-header>
    `,
  })
  class Host {
    readonly level = signal(1);
  }

  it('exposes a heading at the level the page chose', () => {
    const f = render(Host);
    const heading = f.nativeElement.querySelector('[role="heading"]')!;
    expect(heading.getAttribute('aria-level')).toBe('1');
    expect(heading.textContent!.trim()).toBe('Billing');
    f.componentInstance.level.set(2);
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="heading"]')!.getAttribute('aria-level')).toBe('2');
  });

  it('projects actions into the action slot', () => {
    const actions = render(Host).nativeElement.querySelector('.kx-page-header__actions')!;
    expect(actions.textContent).toContain('Upgrade');
  });
});

describe('KxTimeline', () => {
  @Component({
    imports: [KxTimeline, KxTimelineItem],
    template: `
      <ol kxTimeline>
        <li kxTimelineItem title="Shipped" description="14 March" status="success"></li>
        <li kxTimelineItem title="In transit" status="active"></li>
      </ol>
    `,
  })
  class Host {}

  it('is an ordered list, so position is announced', () => {
    const el = render(Host).nativeElement;
    expect(el.querySelector('ol')).not.toBeNull();
    expect(el.querySelectorAll('li').length).toBe(2);
  });

  it('keeps the state in text, not only in the marker colour', () => {
    const items = render(Host).nativeElement.querySelectorAll('li');
    // WCAG 1.4.1: the marker is decorative and hidden; the title and description carry the meaning.
    expect(items[0]!.querySelector('.kx-timeline__marker')!.getAttribute('aria-hidden')).toBe('true');
    expect(items[0]!.textContent).toContain('Shipped');
    expect(items[0]!.textContent).toContain('14 March');
  });

  it('carries status as a marker modifier', () => {
    const items = render(Host).nativeElement.querySelectorAll('li');
    expect(items[0]!.querySelector('.kx-timeline__marker')!.className).toContain('kx-timeline__marker--success');
    expect(items[1]!.querySelector('.kx-timeline__marker')!.className).toContain('kx-timeline__marker--active');
  });
});

/* ── direction ──────────────────────────────────────────────────────────── */

// kx-verify: interaction, accessibility, rtl
// Only KxCodeBlock is named below, so only code-block earns the rtl claim here. The other eleven mirror
// through logical properties in styles.css, which `check:rtl` reads statically — that is a different kind
// of proof from a direction-dependent keypress, and it is not claimed as this one.

describe('under dir="rtl"', () => {
  /**
   * These assert the mechanism, not the mirroring. Mirroring is CSS — logical properties throughout, which
   * `check:rtl` reads statically. What a test can prove is that a directional *interaction* resolves against
   * the document direction rather than against a hard-coded side.
   */
  @Component({
    imports: [KxCodeBlock],
    template: `
      <div dir="rtl" style="direction: rtl">
        <kx-code-block [files]="files" />
      </div>
    `,
  })
  class RtlHost {
    readonly files = [
      { name: 'one', code: '1' },
      { name: 'two', code: '2' },
    ];
  }

  it('moves the code-block tabs toward the start on ArrowLeft', () => {
    const f = render(RtlHost);
    const tabs = f.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]');
    // In an RTL page the next tab is to the LEFT, so ArrowLeft must advance rather than go back.
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    f.detectChanges();
    expect(f.nativeElement.querySelector('pre > code')!.textContent).toBe('2');
  });
});

/* ── the examples the website publishes ─────────────────────────────────── */

describe('the usage examples shown on component pages', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it.each([
    ['banner', BannerDemo],
    ['button group', ButtonGroupDemo],
    ['circular progress', CircularProgressDemo],
    ['code block', CodeBlockDemo],
    ['description list', DescriptionListDemo],
    ['fab', FabDemo],
    ['image', ImageDemo],
    ['inform', InformDemo],
    ['list', ListDemo],
    ['marquee', MarqueeDemo],
    ['page header', PageHeaderDemo],
    ['timeline', TimelineDemo],
  ])('renders the %s example', (_name, type) => {
    // The snippet on the website is extracted from these templates. If one stops rendering, the page is
    // publishing markup that does not work — which is the failure this whole file exists to prevent.
    const fixture = render(type as never);
    expect(fixture.nativeElement.children.length).toBeGreaterThan(0);
  });
});
