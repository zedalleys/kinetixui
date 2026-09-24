import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import type { KxEmptyMediaVariant, KxSpinnerSize, KxSpinnerVariant, KxTagVariant, KxTrend } from './types';

/**
 * The display primitives: avatar, aspect ratio, keyboard glyphs, skeleton, spinner, tag, quote, metric and the
 * empty-state family.
 *
 * Nothing here holds application state. Each is either a directive on the element HTML already has for the
 * job, or a component that renders that element — the same rule the rest of the package follows.
 */

/* ── aspect ratio ───────────────────────────────────────────────────────── */

/**
 *   <kx-aspect-ratio [ratio]="16 / 9"><img src="cover.jpg" alt="" /></kx-aspect-ratio>
 *
 * The CSS `aspect-ratio` property, which every target browser has had for years. There is no padding-top
 * percentage hack here and no ResizeObserver: the platform does this now, and a component that re-implemented
 * it would be slower and would fight the container.
 */
@Component({
  selector: 'kx-aspect-ratio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-aspect-ratio',
    // a custom property rather than `aspect-ratio` directly, so the ratio is an input to the stylesheet and
    // the rule that consumes it stays in CSS with the rest of the component's layout
    '[style.--kx-aspect-ratio]': 'ratio()',
  },
})
export class KxAspectRatio {
  readonly ratio = input(1);
}

/* ── avatar ─────────────────────────────────────────────────────────────── */

/**
 *   <kx-avatar>
 *     <img kxAvatarImage src="/ada.jpg" alt="Ada Lovelace" />
 *     <kx-avatar-fallback>AL</kx-avatar-fallback>
 *   </kx-avatar>
 *
 * The fallback shows until the image reports `load`, and comes back if it reports `error`. That is the whole
 * reason this is a component rather than a styled `<img>`: a broken avatar that leaves a blank circle is the
 * failure users actually hit, and `alt` text alone does not fill the space.
 *
 * The image carries the accessible name. The fallback initials are decorative — announcing "AL" as well would
 * read the person's name twice, so `aria-hidden` is set on it and the caller keeps `alt` meaningful.
 */
@Component({
  selector: 'kx-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    '[class]': 'classes()',
  },
})
export class KxAvatar {
  /** Set by KxAvatarImage as the image loads or fails; the fallback reads it. */
  readonly imageLoaded = signal(false);
  /** Set by KxAvatarGroup on the avatars past its `max`. Not an input: the group owns it, not the caller. */
  readonly collapsed = signal(false);

  protected readonly classes = computed(() => (this.collapsed() ? 'kx-avatar kx-avatar--collapsed' : 'kx-avatar'));
}

/**
 * A directive on a real `<img>`, so `src`, `srcset`, `loading="lazy"`, `alt` and the browser's own decoding
 * are untouched. It only reports load state up to the avatar and hides itself until then.
 */
@Directive({
  selector: 'img[kxAvatarImage]',
  host: {
    class: 'kx-avatar__image',
    '[hidden]': '!avatar.imageLoaded()',
    '(load)': 'avatar.imageLoaded.set(true)',
    '(error)': 'avatar.imageLoaded.set(false)',
  },
})
export class KxAvatarImage {
  constructor(protected readonly avatar: KxAvatar) {}
}

@Component({
  selector: 'kx-avatar-fallback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-avatar__fallback',
    'aria-hidden': 'true',
    '[hidden]': 'avatar.imageLoaded()',
  },
})
export class KxAvatarFallback {
  constructor(protected readonly avatar: KxAvatar) {}
}

/**
 *   <kx-avatar-group [max]="3">
 *     <kx-avatar>…</kx-avatar>
 *     …
 *   </kx-avatar-group>
 *
 * Stacked, overlapping avatars with a "+N" marker for the rest. The group counts its projected avatars with a
 * content query and tells the ones past `max` to collapse; it does not re-wrap or re-render them, because a
 * projected node can only be rendered where it was projected.
 *
 * The overflow marker is announced ("and 4 more") rather than left as the bare glyph, which reads as "plus
 * four" out of context.
 */
@Component({
  selector: 'kx-avatar-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content />
    @if (overflow() > 0) {
      <span class="kx-avatar kx-avatar-group__overflow">
        <span class="kx-avatar__fallback" aria-hidden="true">+{{ overflow() }}</span>
        <span class="kx-sr-only">and {{ overflow() }} more</span>
      </span>
    }
  `,
  host: { class: 'kx-avatar-group' },
})
export class KxAvatarGroup {
  /** Visible avatars before the rest fold into the marker. Null (the default) shows every one. */
  readonly max = input<number | null>(null);

  private readonly avatars = contentChildren(KxAvatar);

  protected readonly overflow = computed(() => {
    const max = this.max();
    return max === null ? 0 : Math.max(0, this.avatars().length - max);
  });

  constructor() {
    effect(() => {
      const max = this.max();
      this.avatars().forEach((avatar, i) => avatar.collapsed.set(max !== null && i >= max));
    });
  }
}

/* ── keyboard keys ──────────────────────────────────────────────────────── */

/**
 *   <kbd kxKbdGroup><kbd kxKbd>Ctrl</kbd><kbd kxKbd>K</kbd></kbd>
 *
 * Directives on real `<kbd>` elements. `<kbd>` already means "keyboard input" to assistive technology and to
 * every reader of the markup, so there is nothing for a wrapper component to add.
 */
@Directive({ selector: 'kbd[kxKbd]', host: { class: 'kx-kbd' } })
export class KxKbd {}

@Directive({ selector: 'kbd[kxKbdGroup]', host: { class: 'kx-kbd-group' } })
export class KxKbdGroup {}

/* ── skeleton ───────────────────────────────────────────────────────────── */

/**
 *   <kx-skeleton style="block-size: 1rem; inline-size: 60%" />
 *
 * A loading placeholder, sized by the caller because only the caller knows the shape of the content it stands
 * in for. Hidden from assistive technology: the meaningful announcement is the "loading" state on the region
 * that owns it, not a stack of grey rectangles.
 *
 * The shimmer is a CSS animation wrapped in `prefers-reduced-motion`, so it stops for users who ask it to.
 */
@Component({
  selector: 'kx-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { class: 'kx-skeleton', 'aria-hidden': 'true' },
})
export class KxSkeleton {}

/* ── spinner ────────────────────────────────────────────────────────────── */

/**
 *   <kx-spinner />
 *   <kx-spinner size="lg" variant="muted" label="Saving…" />
 *
 * A `role="status"` live region carrying its own label, so a screen reader is told that something is in
 * progress instead of being shown a spinning border it cannot perceive. The ring is a CSS border animation —
 * no icon dependency, and it degrades to a static ring under reduced motion rather than disappearing.
 */
@Component({
  selector: 'kx-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span class="kx-sr-only">{{ label() }}</span>',
  host: {
    '[class]': '"kx-spinner kx-spinner--" + size() + " kx-spinner--" + variant()',
    role: 'status',
  },
})
export class KxSpinner {
  readonly size = input<KxSpinnerSize>('md');
  readonly variant = input<KxSpinnerVariant>('default');
  readonly label = input('Loading…');
}

/* ── tag ────────────────────────────────────────────────────────────────── */

/**
 *   <kx-tag>Design</kx-tag>
 *   <kx-tag variant="outline" removable (removed)="drop('design')">Design</kx-tag>
 *
 * A container-tinted chip, distinct from Badge (a solid pill). The dismiss button is opt-in and carries an
 * accessible name built from the tag's own text, so a list of them does not announce "Remove, Remove,
 * Remove" — `removeLabel` overrides it where the text is not the right name.
 */
@Component({
  selector: 'kx-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="kx-tag__text" #text><ng-content /></span>
    @if (removable()) {
      <button
        type="button"
        class="kx-tag__remove"
        [attr.aria-label]="removeLabel() ?? 'Remove ' + text.textContent?.trim()"
        (click)="removed.emit()"
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
    }
  `,
  host: { '[class]': '"kx-tag kx-tag--" + variant()' },
})
export class KxTag {
  readonly variant = input<KxTagVariant>('default');
  readonly removable = input(false, { transform: booleanAttribute });
  readonly removeLabel = input<string | null>(null);
  readonly removed = output<void>();
}

/* ── quote ──────────────────────────────────────────────────────────────── */

/**
 *   <kx-quote author="Ada Lovelace" authorTitle="Mathematician">
 *     The Analytical Engine weaves algebraic patterns.
 *   </kx-quote>
 *
 * A real `<figure>` / `<blockquote>` / `<figcaption>`, which is the markup a quotation with an attribution
 * already has in HTML. The curly quotation marks are decorative punctuation and are hidden from assistive
 * technology — a screen reader announces a blockquote as one already.
 */
@Component({
  selector: 'kx-quote',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="kx-quote">
      <blockquote class="kx-quote__body">
        <span aria-hidden="true">&ldquo;</span><ng-content /><span aria-hidden="true">&rdquo;</span>
      </blockquote>
      @if (author() || authorTitle()) {
        <figcaption class="kx-quote__caption">
          <ng-content select="[kxQuoteAvatar]" />
          <span>
            @if (author()) {
              <span class="kx-quote__author">{{ author() }}</span>
            }
            @if (authorTitle()) {
              <span class="kx-quote__author-title">{{ authorTitle() }}</span>
            }
          </span>
        </figcaption>
      }
    </figure>
  `,
})
export class KxQuote {
  readonly author = input<string | null>(null);
  readonly authorTitle = input<string | null>(null);
}

/* ── metric ─────────────────────────────────────────────────────────────── */

/**
 *   <kx-metric label="Revenue" value="$48,120" trend="up" change="+12.4%" />
 *
 * A stat tile. The trend arrow is decorative — the direction is already in the `change` text, and an arrow
 * announced as "up" next to "+12.4%" is noise. Colour is not the only carrier of meaning here for the same
 * reason: the sign is in the text.
 */
@Component({
  selector: 'kx-metric',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kx-metric__head">
      <p class="kx-metric__label">{{ label() }}</p>
      <ng-content select="[kxMetricIcon]" />
    </div>
    <div class="kx-metric__body">
      <p class="kx-metric__value">{{ value() }}</p>
      @if (trend()) {
        <span class="kx-metric__trend" [attr.data-trend]="trend()">
          <span aria-hidden="true">{{ trend() === 'up' ? '▲' : trend() === 'down' ? '▼' : '—' }}</span>
          {{ change() }}
        </span>
      }
    </div>
    <ng-content select="[kxMetricChart]" />
  `,
  host: { class: 'kx-metric' },
})
export class KxMetric {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly trend = input<KxTrend | null>(null);
  readonly change = input<string | null>(null);
}

/* ── empty state ────────────────────────────────────────────────────────── */

/**
 *   <kx-empty>
 *     <kx-empty-header>
 *       <kx-empty-media variant="icon">…</kx-empty-media>
 *       <kx-empty-title>No projects yet</kx-empty-title>
 *       <kx-empty-description>Create one to get started.</kx-empty-description>
 *     </kx-empty-header>
 *     <kx-empty-content><button kxButton>New project</button></kx-empty-content>
 *   </kx-empty>
 *
 * Composed rather than prop-driven, like Card, so it drops into whatever already has a border — a table cell,
 * a card, a bare section — without forcing its own.
 */
@Component({
  selector: 'kx-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-empty' },
})
export class KxEmpty {}

@Component({
  selector: 'kx-empty-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-empty__header' },
})
export class KxEmptyHeader {}

@Component({
  selector: 'kx-empty-media',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { '[class]': '"kx-empty__media kx-empty__media--" + variant()', 'aria-hidden': 'true' },
})
export class KxEmptyMedia {
  readonly variant = input<KxEmptyMediaVariant>('default');
}

@Component({
  selector: 'kx-empty-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-empty__title', role: 'heading', '[attr.aria-level]': 'level()' },
})
export class KxEmptyTitle {
  readonly level = input<1 | 2 | 3 | 4 | 5 | 6>(3);
}

@Component({
  selector: 'kx-empty-description',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-empty__description' },
})
export class KxEmptyDescription {}

@Component({
  selector: 'kx-empty-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: { class: 'kx-empty__content' },
})
export class KxEmptyContent {}
