import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  TemplateRef,
  booleanAttribute,
  computed,
  contentChild,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import type {
  KxDescriptionListLayout,
  KxFabSize,
  KxFabVariant,
  KxImageRatio,
  KxInformVariant,
  KxOrientation,
  KxTimelineStatus,
} from './types';

/**
 * The content and layout wave: banner, button group, circular progress, code block, description list, FAB,
 * image, inform, list, marquee, page header and timeline.
 *
 * Two conventions this file follows, both inherited rather than invented:
 *
 * Icons arrive by projection, never by import, with one exception that matters: the dismiss button
 * carries a built-in glyph as `<ng-content>` fallback content. A projected slot that the caller leaves
 * empty is fine for a decorative leading icon and is not fine for a control — an empty button is a few
 * pixels of nothing, so the only people who could find it are the ones reading its `aria-label`. Project
 * `[kxDismissIcon]` to replace the default; leave it out and the control is still visible.
 * The React implementations reach for `lucide-react`, which is a
 * reasonable choice for a package that already depends on React's ecosystem. Adding an icon library to
 * `@kinetixui/angular` would make every consumer carry it to render a banner, so each surface here exposes a
 * slot and the application supplies whatever it already uses. Nothing is hard-coded and nothing is missing:
 * the surfaces that need a decorative glyph lay out correctly with or without one.
 *
 * Callbacks arrive as `output()`, never as object inputs. React passes `action={{ label, onClick }}`, which is
 * idiomatic there. In Angular the label is content and the click is an event, so a caller writes
 * `<button kxBannerAction (click)="…">Retry</button>`. This is the "equivalent capability, idiomatic
 * implementation" rule in RTL.md and types.ts applied to event handling.
 */

/* ── banner ─────────────────────────────────────────────────────────────── */

/**
 *   <kx-banner variant="warning" sticky (dismiss)="hidden = true">
 *     <svg kxIcon …></svg>
 *     Scheduled maintenance at 02:00 UTC.
 *     <button kxBannerAction (click)="more()">Details</button>
 *   </kx-banner>
 *
 * A page-level, full-bleed notice: no radius and no width of its own, so it spans whatever contains it. That
 * is the whole distinction from Inform, which is a contained rounded card, and from a toast, which is
 * transient.
 *
 * `role="status"` rather than `alert`. A banner is persistent and usually present on arrival, and an assertive
 * live region interrupts a screen-reader user mid-sentence to read something that is not urgent. A caller with
 * a genuinely urgent banner can set `role="alert"` on the host, which wins over this default.
 */
@Component({
  selector: 'kx-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content select="[kxIcon]" />
    <div class="kx-banner__body">
      <span><ng-content /></span>
      <ng-content select="[kxBannerAction]" />
    </div>
    @if (dismissible()) {
      <button type="button" class="kx-banner__dismiss" [attr.aria-label]="dismissLabel()" (click)="dismiss.emit()">
        <ng-content select="[kxDismissIcon]">
          <svg class="kx-dismiss-glyph" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </ng-content>
      </button>
    }
  `,
  host: {
    role: 'status',
    '[class]': '"kx-banner kx-banner--" + variant() + (sticky() ? " kx-banner--sticky" : "")',
  },
})
export class KxBanner {
  readonly variant = input<KxInformVariant>('information');
  readonly sticky = input(false, { transform: booleanAttribute });
  /** Renders the dismiss control. The banner does not hide itself — the caller owns that state. */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /**
   * The dismiss button's accessible name. An input rather than a hard-coded "Dismiss" because this package
   * ships no translations, and a button whose only label is in the wrong language is worse than one the
   * application names itself.
   */
  readonly dismissLabel = input('Dismiss');
  readonly dismiss = output<void>();
}

/* ── button group ───────────────────────────────────────────────────────── */

/**
 *   <div kxButtonGroup>
 *     <button kxButton variant="Outline">Day</button>
 *     <button kxButton variant="Outline">Week</button>
 *   </div>
 *
 * Joins adjacent controls into one cluster: inner corners squared, shared borders overlapped so they do not
 * double, and the focused child raised so its ring is not clipped by its neighbour.
 *
 * A directive on the caller's element, not a wrapper component, because the group contributes layout and
 * nothing else — the same reason `kxButton` is a directive on `<button>`. `role="group"` is set, but no
 * roving tabindex: these are buttons, each is individually tabbable, and a toolbar's arrow-key navigation is
 * `kx-segmented-control`'s job. Pretending otherwise would break Tab for every existing caller.
 */
@Directive({
  selector: '[kxButtonGroup]',
  host: {
    role: 'group',
    '[class]': '"kx-button-group kx-button-group--" + orientation()',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class KxButtonGroup {
  readonly orientation = input<KxOrientation>('horizontal');
}

/** A thin divider between segments, for fills with no shared border for the overlap trick to lean on. */
@Component({
  selector: 'kx-button-group-separator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    role: 'separator',
    '[attr.aria-orientation]': 'orientation()',
    '[class]': '"kx-button-group-separator kx-button-group-separator--" + orientation()',
  },
})
export class KxButtonGroupSeparator {
  readonly orientation = input<KxOrientation>('vertical');
}

/** A static, non-interactive segment — a unit, a prefix, a count. Not a button, so not focusable. */
@Component({
  selector: 'kx-button-group-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-button-group-text' },
})
export class KxButtonGroupText {}

/* ── circular progress ──────────────────────────────────────────────────── */

/**
 *   <kx-circular-progress [value]="72" showValue />
 *   <kx-circular-progress />                           <!-- indeterminate -->
 *
 * The ring is two SVG circles, the indicator revealed by `stroke-dashoffset`. `aria-valuenow` is omitted when
 * no value is given, which is how ARIA spells an indeterminate progressbar — a determinate bar reporting 0
 * says "nothing has happened", which is a different and usually wrong claim.
 */
@Component({
  selector: 'kx-circular-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" aria-hidden="true" focusable="false">
      <circle class="kx-circular-progress__track" [attr.cx]="centre()" [attr.cy]="centre()" [attr.r]="radius()" [attr.stroke-width]="strokeWidth()" fill="none" />
      <circle
        class="kx-circular-progress__indicator"
        [attr.cx]="centre()"
        [attr.cy]="centre()"
        [attr.r]="radius()"
        [attr.stroke-width]="strokeWidth()"
        [attr.stroke-dasharray]="circumference()"
        [attr.stroke-dashoffset]="offset()"
        stroke-linecap="round"
        fill="none"
      />
    </svg>
    @if (showValue() && value() !== undefined) {
      <span class="kx-circular-progress__value">{{ clamped() }}%</span>
    }
  `,
  host: {
    role: 'progressbar',
    class: 'kx-circular-progress',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'value() === undefined ? null : clamped()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
})
export class KxCircularProgress {
  /** 0–100. Left undefined for an indeterminate ring. */
  readonly value = input<number | undefined>(undefined);
  /** Diameter in px. A number, not a token, because a ring's size is a layout decision at the call site. */
  readonly size = input(48);
  readonly strokeWidth = input(4);
  readonly showValue = input(false, { transform: booleanAttribute });

  protected readonly clamped = computed(() => Math.max(0, Math.min(100, this.value() ?? 0)));
  protected readonly centre = computed(() => this.size() / 2);
  protected readonly radius = computed(() => (this.size() - this.strokeWidth()) / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly offset = computed(() => {
    const c = this.circumference();
    // An indeterminate ring shows a quarter arc and is spun by CSS; a determinate one is filled to value.
    return this.value() === undefined ? c * 0.75 : c - (this.clamped() / 100) * c;
  });
}

/* ── code block ─────────────────────────────────────────────────────────── */

export interface KxCodeBlockFile {
  name: string;
  code: string;
  language?: string;
}

/**
 *   <kx-code-block [code]="snippet" filename="main.ts" />
 *   <kx-code-block [files]="[{ name: 'app.ts', code: a }, { name: 'app.html', code: b }]" />
 *
 * Shows code and copies it. Deliberately does not highlight: syntax highlighting needs a grammar per language
 * and is a build-time concern, and a component that shipped one would force the choice on every consumer.
 * `<pre><code>` keeps the whitespace and lets the application bring Shiki or Prism if it wants colour.
 *
 * The file switcher is a real tablist with arrow-key navigation, because that is what a row of tabs is. The
 * copy button reports its result through `aria-live` rather than only swapping an icon, so the outcome is
 * available to someone who cannot see the tick.
 */
@Component({
  selector: 'kx-code-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasHeader()) {
      <div class="kx-code-block__header">
        <div class="kx-code-block__tabs" role="tablist">
          @for (tab of tabs(); track tab.name; let i = $index) {
            <button
              type="button"
              role="tab"
              class="kx-code-block__tab"
              [class.kx-code-block__tab--active]="i === active()"
              [attr.aria-selected]="i === active()"
              [attr.tabindex]="i === active() ? 0 : -1"
              (click)="select(i)"
              (keydown)="onTabKeydown($event, i)"
            >
              {{ tab.name || 'code' }}
            </button>
          }
        </div>
        @if (!hideCopy()) {
          <button type="button" class="kx-code-block__copy" [attr.aria-label]="copyLabel()" (click)="copy()">
            <ng-content select="[kxCopyIcon]">
              <svg class="kx-copy-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <rect x="5.75" y="5.75" width="7.5" height="7.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" />
                <path d="M10.25 5.75V4.25a1.5 1.5 0 0 0-1.5-1.5h-4.5a1.5 1.5 0 0 0-1.5 1.5v4.5a1.5 1.5 0 0 0 1.5 1.5h1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </ng-content>
          </button>
        }
      </div>
    }
    <div class="kx-code-block__body">
      @if (!hasHeader() && !hideCopy()) {
        <!-- With no filename and no tabs there is no header to put the copy button in, and the button is
             the component's whole reason for existing beyond a <pre>. It sits over the code instead. -->
        <button type="button" class="kx-code-block__copy kx-code-block__copy--floating" [attr.aria-label]="copyLabel()" (click)="copy()">
          <ng-content select="[kxCopyIcon]">
            <svg class="kx-copy-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <rect x="5.75" y="5.75" width="7.5" height="7.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" />
              <path d="M10.25 5.75V4.25a1.5 1.5 0 0 0-1.5-1.5h-4.5a1.5 1.5 0 0 0-1.5 1.5v4.5a1.5 1.5 0 0 0 1.5 1.5h1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </ng-content>
        </button>
      }
      <pre class="kx-code-block__pre" tabindex="0"><code>{{ current().code }}</code></pre>
    </div>
    <span class="kx-sr-only" role="status">{{ copied() ? copiedLabel() : '' }}</span>
  `,
  host: { class: 'kx-code-block' },
})
export class KxCodeBlock {
  readonly code = input('');
  readonly language = input<string | undefined>(undefined);
  readonly filename = input<string | undefined>(undefined);
  readonly files = input<readonly KxCodeBlockFile[]>([]);
  readonly hideCopy = input(false, { transform: booleanAttribute });
  readonly copyLabel = input('Copy code');
  readonly copiedLabel = input('Copied');

  protected readonly active = signal(0);
  protected readonly copied = signal(false);

  protected readonly tabs = computed<readonly KxCodeBlockFile[]>(() =>
    this.files().length ? this.files() : [{ name: this.filename() ?? this.language() ?? '', code: this.code() }],
  );
  protected readonly current = computed(() => this.tabs()[this.active()] ?? this.tabs()[0]!);
  protected readonly hasHeader = computed(() => this.tabs().length > 1 || !!this.tabs()[0]?.name);

  protected select(i: number): void {
    this.active.set(i);
  }

  /** Home/End and the arrows, mirrored for direction: in an RTL page ArrowRight moves toward the start. */
  protected onTabKeydown(event: KeyboardEvent, i: number): void {
    const n = this.tabs().length;
    const rtl = getComputedStyle(event.currentTarget as Element).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next = i;
    if (event.key === forward) next = (i + 1) % n;
    else if (event.key === back) next = (i - 1 + n) % n;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = n - 1;
    else return;
    event.preventDefault();
    this.active.set(next);
    const tabs = (event.currentTarget as Element).parentElement?.querySelectorAll<HTMLElement>('[role="tab"]');
    tabs?.[next]?.focus();
  }

  private readonly host = inject(ElementRef<HTMLElement>);

  protected async copy(): Promise<void> {
    // Reached through the host element's own document rather than the `navigator` global: this package is
    // rendered on the server too, and a bare global makes the bundle unusable outside a browser. The
    // publication-readiness gate checks exactly this, and caught it here.
    const clipboard = (this.host.nativeElement as HTMLElement).ownerDocument?.defaultView?.navigator?.clipboard;
    if (!clipboard) return;
    try {
      await clipboard.writeText(this.current().code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {
      // No clipboard permission: the code is still selectable in the <pre>, which is why that element is
      // focusable. Swallowing this is deliberate — there is nothing useful to tell the user.
    }
  }
}

/* ── description list ───────────────────────────────────────────────────── */

/**
 *   <dl kxDescriptionList>
 *     <kx-description-list-item term="Status">Active</kx-description-list-item>
 *   </dl>
 *
 * A directive on a real `<dl>`, and each item is a component with an ATTRIBUTE selector on a `<div>`, so the
 * rendered tree is `<dl><div><dt>…</dt><dd>…</dd></div></dl>`. That distinction is the whole point: a `dl`'s
 * content model allows `dt`/`dd` directly or wrapped in a `div`, and nothing else. An earlier spelling used a
 * `<kx-description-list-item>` element as the wrapper, which is neither — the grouping was invalid and the
 * term/description association was left to chance. The term is an input rather than a slot because a `<dt>`
 * takes text, and two projection slots in one item would let a caller put the value in the term position.
 */
@Directive({
  selector: 'dl[kxDescriptionList]',
  host: { class: 'kx-description-list' },
})
export class KxDescriptionList {}

@Component({
  selector: 'div[kxDescriptionListItem]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dt class="kx-description-list__term">{{ term() }}</dt>
    <dd class="kx-description-list__value"><ng-content /></dd>
  `,
  host: { '[class]': '"kx-description-list__item kx-description-list__item--" + layout()' },
})
export class KxDescriptionListItem {
  readonly term = input.required<string>();
  readonly layout = input<KxDescriptionListLayout>('row');
}

/* ── fab ────────────────────────────────────────────────────────────────── */

/**
 *   <button kxFab aria-label="New message"><svg …></svg></button>
 *   <button kxFab extended>New message</button>
 *
 * A directive on a real `<button>`: the element already has the activation behaviour, the disabled semantics
 * and the keyboard contract, and a component wrapping one would have to re-expose all three.
 *
 * An icon-only FAB has no text, so it needs `aria-label` from the caller. This does not supply a default —
 * "Action" is not a useful accessible name, and a wrong one is harder to notice than a missing one. The
 * `extended` form has a visible label and needs nothing.
 */
@Directive({
  selector: 'button[kxFab]',
  host: {
    '[class]':
      '"kx-fab kx-fab--" + variant() + " kx-fab--" + size() + (extended() ? " kx-fab--extended" : "")',
  },
})
export class KxFab {
  readonly variant = input<KxFabVariant>('Primary');
  readonly size = input<KxFabSize>('default');
  readonly extended = input(false, { transform: booleanAttribute });
}

/* ── image ──────────────────────────────────────────────────────────────── */

const RATIOS: Record<KxImageRatio, number> = {
  '1:1': 1,
  '3:2': 3 / 2,
  '4:3': 4 / 3,
  '3:4': 3 / 4,
  '3:1': 3,
  '16:9': 16 / 9,
};

/**
 *   <kx-image src="cover.jpg" alt="Harbour at dusk" ratio="16:9" />
 *   <kx-image src="broken.png" alt="" ><svg kxImageFallback …></svg></kx-image>
 *
 * Holds the aspect ratio before the image arrives so the page does not reflow, fades it in once decoded, and
 * swaps to a fallback slot on error.
 *
 * `alt` is required, not optional with an empty default. An empty alt is the correct answer for a decorative
 * image and a silent failure for every other one, so the caller states which it is — `alt=""` is still one
 * character to type, and now it is a decision rather than an omission.
 */
@Component({
  selector: 'kx-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (status() === 'error') {
      <div class="kx-image__fallback"><ng-content select="[kxImageFallback]" /></div>
    } @else {
      <img
        class="kx-image__img"
        [class.kx-image__img--loaded]="status() === 'loaded'"
        [attr.src]="src()"
        [attr.alt]="alt()"
        [attr.loading]="loading()"
        [attr.decoding]="'async'"
        (load)="status.set('loaded')"
        (error)="status.set('error')"
      />
    }
  `,
  host: {
    '[class]': '"kx-image" + (rounded() ? " kx-image--rounded" : "")',
    // A custom property rather than `aspect-ratio` directly, matching `kx-aspect-ratio`: the ratio is an
    // input to the stylesheet and the rule that consumes it stays in CSS with the rest of the layout.
    '[style.--kx-image-ratio]': 'ratioValue()',
  },
})
export class KxImage {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  readonly ratio = input<KxImageRatio | number>('1:1');
  readonly rounded = input(true, { transform: booleanAttribute });
  /** Native lazy loading. Defaults to `lazy`; pass `eager` for an image above the fold. */
  readonly loading = input<'lazy' | 'eager'>('lazy');

  /**
   * Reset to `loading` whenever `src` changes. A plain signal kept the old verdict: once a source had
   * failed, the fallback branch stayed rendered and a later, valid URL was never even requested — and a
   * previously loaded image kept its loaded styling while its replacement was still arriving.
   */
  protected readonly status = linkedSignal<string, 'loading' | 'loaded' | 'error'>({
    source: this.src,
    computation: () => 'loading',
  });
  protected readonly ratioValue = computed(() => {
    const r = this.ratio();
    return typeof r === 'number' ? r : (RATIOS[r] ?? 1);
  });
}

/* ── inform ─────────────────────────────────────────────────────────────── */

/**
 *   <kx-inform variant="success">Your changes were saved.</kx-inform>
 *
 * The contained counterpart to Banner: rounded, in flow, sized by its container. Same intents and the same
 * `role="status"` reasoning — persistent, not urgent, so polite rather than assertive.
 */
@Component({
  selector: 'kx-inform',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content select="[kxIcon]" />
    <div class="kx-inform__body">
      <p class="kx-inform__message"><ng-content /></p>
      <ng-content select="[kxInformAction]" />
    </div>
    @if (dismissible()) {
      <button type="button" class="kx-inform__dismiss" [attr.aria-label]="dismissLabel()" (click)="dismiss.emit()">
        <ng-content select="[kxDismissIcon]">
          <svg class="kx-dismiss-glyph" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </ng-content>
      </button>
    }
  `,
  host: {
    role: 'status',
    '[class]': '"kx-inform kx-inform--" + variant()',
  },
})
export class KxInform {
  readonly variant = input<KxInformVariant>('information');
  readonly dismissible = input(false, { transform: booleanAttribute });
  readonly dismissLabel = input('Dismiss');
  readonly dismiss = output<void>();
}

/* ── list ───────────────────────────────────────────────────────────────── */

/**
 *   <ul kxList>
 *     <li kxListItem title="Billing" description="Invoices and receipts" />
 *   </ul>
 *
 * A directive on a real `<ul>`, and items on real `<li>`s, so the list semantics are the platform's rather
 * than three ARIA roles standing in for them. A pressable row puts a `<button>` inside the `<li>` instead of
 * giving the `<li>` itself `role="button"`: a list's children must be list items, and an element cannot be
 * both. That also means the keyboard contract is the button's — Enter and Space, for free and correct.
 */
@Directive({
  selector: 'ul[kxList], ol[kxList]',
  host: { class: 'kx-list' },
})
export class KxList {}

@Component({
  selector: 'li[kxListItem]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    @if (pressable()) {
      <button type="button" class="kx-list__row kx-list__row--pressable" [disabled]="disabled()" (click)="select.emit()">
        <ng-container [ngTemplateOutlet]="row" />
      </button>
    } @else {
      <div class="kx-list__row" [attr.aria-disabled]="disabled() ? 'true' : null">
        <ng-container [ngTemplateOutlet]="row" />
      </div>
    }

    <ng-template #row>
      <span class="kx-list__leading"><ng-content select="[kxListLeading]" /></span>
      <span class="kx-list__text">
        <span class="kx-list__title">{{ title() }}</span>
        @if (description()) {
          <span class="kx-list__description">{{ description() }}</span>
        }
      </span>
      <span class="kx-list__trailing"><ng-content select="[kxListTrailing]" /></span>
    </ng-template>
  `,
  host: { '[class]': '"kx-list__item" + (disabled() ? " kx-list__item--disabled" : "")' },
})
export class KxListItem {
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Set to render the row as a button. Without it the row is static text and not focusable. */
  readonly pressable = input(false, { transform: booleanAttribute });
  readonly select = output<void>();
}

/* ── marquee ────────────────────────────────────────────────────────────── */

/**
 *   <kx-marquee [durationSeconds]="24" pauseOnHover>
 *     <ng-template kxMarqueeContent>
 *       <span>Shipping to 48 countries</span>
 *     </ng-template>
 *   </kx-marquee>
 *
 * Scrolls its content on a loop. A seamless loop needs the content rendered twice, and the content is the
 * caller's — so it arrives as a `<ng-template>` and this component renders it twice itself. Asking the caller
 * to paste their own markup twice would make the duplicate their problem and let the two copies drift.
 *
 * The second copy is `aria-hidden`, so assistive technology reads the row once instead of stuttering.
 *
 * Under `prefers-reduced-motion: reduce` the animation is removed in CSS and the row becomes an ordinary
 * horizontally scrollable strip — the content stays reachable, which is the part that matters. Continuous
 * motion is what WCAG 2.2.2 is about, and the reader's own setting is the control, so this exposes no
 * "pause" affordance that would only work for people who can see it move.
 */
@Directive({ selector: '[kxMarqueeContent]' })
export class KxMarqueeContent {
  constructor(readonly template: TemplateRef<unknown>) {}
}

@Component({
  selector: 'kx-marquee',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    <div class="kx-marquee__track" [style.animation-duration.s]="durationSeconds()">
      <div class="kx-marquee__group">
        <ng-container [ngTemplateOutlet]="content()?.template ?? null" />
      </div>
      <div class="kx-marquee__group" aria-hidden="true">
        <ng-container [ngTemplateOutlet]="content()?.template ?? null" />
      </div>
    </div>
  `,
  host: {
    '[class]': '"kx-marquee" + (pauseOnHover() ? " kx-marquee--pause-on-hover" : "")',
  },
})
export class KxMarquee {
  /** Seconds for one full loop. Slower is calmer; this is a readability decision, not a style one. */
  readonly durationSeconds = input(20);
  readonly pauseOnHover = input(false, { transform: booleanAttribute });
  protected readonly content = contentChild(KxMarqueeContent);
}

/* ── page header ────────────────────────────────────────────────────────── */

/**
 *   <kx-page-header title="Billing" description="Plan, invoices and payment method" [level]="1">
 *     <nav kxPageHeaderBreadcrumb>…</nav>
 *     <button kxButton kxPageHeaderActions>Upgrade</button>
 *   </kx-page-header>
 *
 * `level` exists for the same reason `kx-card-title` has one: a page header is usually the `<h1>`, but a
 * component that hard-codes a heading level produces a broken document outline the moment it is used twice or
 * nested. The level is carried by `role="heading"` + `aria-level`, because `<ng-content>` projects once and a
 * template with one heading tag per branch silently renders every branch after the first empty — the same
 * trade-off `primitives.ts` documents, resolved the same way.
 */
@Component({
  selector: 'kx-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kx-page-header__breadcrumb"><ng-content select="[kxPageHeaderBreadcrumb]" /></div>
    <div class="kx-page-header__main">
      <div class="kx-page-header__titles">
        <span class="kx-page-header__title" role="heading" [attr.aria-level]="level()">{{ title() }}</span>
        @if (description()) {
          <p class="kx-page-header__description">{{ description() }}</p>
        }
      </div>
      <div class="kx-page-header__actions"><ng-content select="[kxPageHeaderActions]" /></div>
    </div>
    <ng-content />
  `,
  host: { class: 'kx-page-header' },
})
export class KxPageHeader {
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly level = input(1);
}

/* ── timeline ───────────────────────────────────────────────────────────── */

/**
 *   <ol kxTimeline>
 *     <li kxTimelineItem title="Shipped" description="14 March" status="success" />
 *   </ol>
 *
 * An ordered list, because a timeline is ordered and the platform already says so — losing that to a stack of
 * `<div>`s would mean a screen reader no longer announces "3 of 5".
 *
 * `status` is carried by a class on a decorative marker plus text, never by colour alone: the item's state is
 * in `title`/`description`, which is what WCAG 1.4.1 asks for. The connecting line is drawn with logical
 * insets so it stays on the start edge in an RTL page.
 */
@Directive({
  selector: 'ol[kxTimeline]',
  host: { class: 'kx-timeline' },
})
export class KxTimeline {}

@Component({
  selector: 'li[kxTimelineItem]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="kx-timeline__marker" [class]="'kx-timeline__marker--' + status()" aria-hidden="true">
      <ng-content select="[kxTimelineIcon]" />
    </span>
    <span class="kx-timeline__content">
      <span class="kx-timeline__title">{{ title() }}</span>
      @if (description()) {
        <span class="kx-timeline__description">{{ description() }}</span>
      }
      <ng-content />
    </span>
  `,
  host: { class: 'kx-timeline__item' },
})
export class KxTimelineItem {
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly status = input<KxTimelineStatus>('default');
}

