import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  forwardRef,
  Injector,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { inlineKey, isRtl } from './collection';
import { KxPointerDrag, clamp } from './pointer-drag';

/**
 * Carousel: slides in a viewport, moved one position at a time by buttons, the keyboard or a swipe.
 *
 *   <kx-carousel aria-label="Featured work">
 *     <kx-carousel-content>
 *       @for (item of items; track item) { <kx-carousel-item>…</kx-carousel-item> }
 *     </kx-carousel-content>
 *     <button kxCarouselPrevious></button>
 *     <button kxCarouselNext></button>
 *   </kx-carousel>
 *
 * React's Carousel (Embla through `Carousel` / `CarouselContent` / `CarouselItem` / `CarouselPrevious` /
 * `CarouselNext`): a `region` with `aria-roledescription="carousel"`, slides as `group`s with
 * `aria-roledescription="slide"`, Previous / Next buttons named "Previous slide" / "Next slide", ArrowLeft and
 * ArrowRight on the region, drag and swipe, `horizontal` or `vertical`, no loop and no autoplay by default. All of
 * that is kept. There is no autoplay here at all, because React's carousel has none unless a plugin adds it.
 *
 * ── Positions ──────────────────────────────────────────────────────────────
 *
 * A carousel moves between SNAP positions, measured from the rendered slides: one per slide, except that the end
 * is trimmed so the last view is full (three slides to a view over five slides gives three positions, as Embla's
 * `containScroll: "trimSnaps"`). `index` (two-way) is the position; `count`, `canPrevious` and `canNext` are
 * readable through `#c="kxCarousel"`. With `loop`, Next at the end goes back to the first position and Previous at
 * the start to the last — a rewind, not an endless strip. Slides are measured by a `ResizeObserver` (the viewport
 * and every slide), created after the first render and disconnected on destroy, so a container or slide that
 * changes size re-measures, and the current position is kept. A direction change resizes nothing, so every move
 * (a control, a key, `scrollTo`, a press) also measures again first.
 *
 * ── What a reader can reach ────────────────────────────────────────────────
 *
 * Slides outside the view are `inert`: not in the Tab order and not read, so Tab never lands on a link that is
 * off-screen. Each slide is named "N of M" unless it has its own `aria-label`. A change made by the reader is
 * announced politely ("Slide 2 of 5", or "Slides 2 to 4 of 5"), once, when it lands — never during a drag.
 *
 * Focus is never lost. Previous and Next are `aria-disabled` at a non-looping end rather than `disabled`, so the
 * button pressed to reach the end keeps focus (a natively disabled button drops focus to the page). When focus is
 * inside a slide that a key moves out of view, it moves to the first slide now in view.
 *
 * ── Direction ──────────────────────────────────────────────────────────────
 *
 * Horizontal slides run in the reading direction, so in a right-to-left context the first slide is on the right,
 * "Next" is toward the left, ArrowLeft is Next, and a swipe toward the inline START shows the next slide — all
 * resolved against the carousel's own direction (the nearest `[dir]`, then the computed style). The buttons'
 * glyphs are the bidi-mirrored ‹ ›, so they point the right way with no code; in a vertical carousel they turn to
 * point up and down and do not mirror. React's keys and glyphs are physical; this is a deliberate fix. Vertical
 * carousels use ArrowUp and ArrowDown.
 *
 * ── The pointer ────────────────────────────────────────────────────────────
 *
 * A press becomes a drag only after it travels `--interaction-drag-threshold` along the carousel's axis (the
 * token: 4px); before that, a press on a link or button in a slide is still a click. Once dragging, the slides
 * follow the pointer (with resistance past either end) and the click that would follow the release is swallowed.
 * The release moves one position if it travelled a fifth of the view or was a quick flick, and settles back
 * otherwise; a touch the browser takes over for scrolling (the other axis, `touch-action`) settles back. The
 * pointer is not captured, so the slides' own controls receive their presses (pointer-drag.ts, `page` mode);
 * the document listeners exist only during a press.
 *
 * ── Motion ─────────────────────────────────────────────────────────────────
 *
 * Moving between positions is a `transform` transition (`--duration-base`, `--easing-standard`): it shows the
 * reader where the next slide came from. Under reduced motion there is none: the slide is simply there, at the
 * same final position. While dragging nothing transitions.
 */

/** The Embla-default `dragFree: false` decision: a release that travelled this fraction of the view moves on. */
const MOVE_FRACTION = 0.2;
/** …or a flick faster than this (px per ms) over the last moments of the drag. */
const FLICK = 0.4;
/** A flick's speed counts only when the pointer was still moving this close to the release (ms). */
const FLICK_WINDOW = 100;

interface KxSlideExtent {
  start: number;
  size: number;
}

/**
 * The positions a carousel moves between, from each slide's logical start and size and the view's size: one per
 * slide, clamped so the last view is full, with duplicates removed. Pure — unit-tested as logic.
 */
export function snapPositions(slides: readonly KxSlideExtent[], view: number): number[] {
  if (!slides.length || view <= 0) return [0];
  const end = Math.max(...slides.map((s) => s.start + s.size));
  const first = Math.min(...slides.map((s) => s.start));
  const max = Math.max(first, end - view);
  const out: number[] = [];
  for (const s of slides) {
    const at = clamp(s.start, first, max);
    if (!out.some((p) => Math.abs(p - at) < 1)) out.push(at);
  }
  return out.sort((a, b) => a - b).map((p) => p - first);
}

/** The slides at least partly in a view that starts at `offset`. */
export function slidesInView(slides: readonly KxSlideExtent[], offset: number, view: number): number[] {
  if (!slides.length) return [];
  const first = Math.min(...slides.map((s) => s.start));
  const out: number[] = [];
  slides.forEach((s, i) => {
    const start = s.start - first;
    if (start < offset + view - 1 && start + s.size > offset + 1) out.push(i);
  });
  return out;
}

const isEditable = (el: EventTarget | null): boolean =>
  el instanceof Element && !!el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');

@Component({
  selector: 'kx-carousel-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-carousel__item',
    role: 'group',
    'aria-roledescription': 'slide',
    tabindex: '-1',
    '[attr.aria-label]': 'name()',
    '[attr.inert]': 'hidden() ? "" : null',
  },
})
export class KxCarouselItem {
  readonly carousel = inject(forwardRef(() => KxCarousel));
  readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** The slide's own name; "N of M" when not given. */
  readonly ariaLabel = input<string | null>(null, { alias: 'aria-label' });
  private readonly index = computed(() => this.carousel.items().indexOf(this));
  protected readonly name = computed(() => this.ariaLabel() ?? `${this.index() + 1} of ${this.carousel.items().length}`);
  protected readonly hidden = computed(() => this.carousel.measured() && !this.carousel.inView().includes(this.index()));
}

/** The viewport the slides move in. */
@Component({
  selector: 'kx-carousel-content',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<div #track class="kx-carousel__track" [style.transform]="carousel.transform()"><ng-content /></div>',
  host: {
    class: 'kx-carousel__viewport',
    '(pointerdown)': 'carousel.press($event)',
    '(dragstart)': '$event.preventDefault()',
  },
})
export class KxCarouselContent {
  readonly carousel = inject(forwardRef(() => KxCarousel));
  readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
}

/** Moves to the previous position. Named "Previous slide"; put your own text inside to rename it. */
@Component({
  selector: 'button[kxCarouselPrevious]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="kx-carousel__glyph" aria-hidden="true" [attr.dir]="carousel.orientation() === 'vertical' ? 'ltr' : null">‹</span><span class="kx-sr-only"><ng-content>Previous slide</ng-content></span>`,
  host: {
    type: 'button',
    class: 'kx-btn kx-btn--outline kx-btn--icon kx-carousel__control kx-carousel__previous',
    '[attr.aria-disabled]': 'carousel.canPrevious() ? null : "true"',
    '(click)': 'carousel.previous("button")',
  },
})
export class KxCarouselPrevious {
  readonly carousel = inject(forwardRef(() => KxCarousel));
}

/** Moves to the next position. Named "Next slide"; put your own text inside to rename it. */
@Component({
  selector: 'button[kxCarouselNext]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="kx-carousel__glyph" aria-hidden="true" [attr.dir]="carousel.orientation() === 'vertical' ? 'ltr' : null">›</span><span class="kx-sr-only"><ng-content>Next slide</ng-content></span>`,
  host: {
    type: 'button',
    class: 'kx-btn kx-btn--outline kx-btn--icon kx-carousel__control kx-carousel__next',
    '[attr.aria-disabled]': 'carousel.canNext() ? null : "true"',
    '(click)': 'carousel.next("button")',
  },
})
export class KxCarouselNext {
  readonly carousel = inject(forwardRef(() => KxCarousel));
}

type Origin = 'button' | 'key' | 'drag' | 'code';

@Component({
  selector: 'kx-carousel',
  exportAs: 'kxCarousel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content /><div class="kx-sr-only" aria-live="polite" aria-atomic="true">{{ announcement() }}</div>',
  host: {
    class: 'kx-carousel',
    role: 'region',
    'aria-roledescription': 'carousel',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-dragging]': 'dragging() ? "" : null',
    '(keydown)': 'key($event)',
  },
})
export class KxCarousel {
  readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  /** Next at the end returns to the start, and Previous at the start goes to the end. */
  readonly loop = input(false, { transform: booleanAttribute });
  /** Two-way: the current position. */
  readonly index = model(0);

  private readonly allItems = contentChildren(KxCarouselItem, { descendants: true });
  private readonly contents = contentChildren(KxCarouselContent, { descendants: true });
  /** The slides this carousel owns, in order (a nested carousel's are its own). */
  readonly items = computed(() => this.allItems().filter((i) => i.carousel === this));
  private readonly content = computed(() => this.contents().find((c) => c.carousel === this) ?? null);

  private readonly extents = signal<KxSlideExtent[]>([]);
  private readonly view = signal(0);
  private readonly rtl = signal(false);
  /** The slides have been measured at least once (until then none is hidden). */
  readonly measured = signal(false);
  private readonly snaps = computed(() => snapPositions(this.extents(), this.view()));
  /** How many positions there are. */
  readonly count = computed(() => this.snaps().length);
  /** The current position, held inside the positions that exist. */
  readonly current = computed(() => clamp(Math.round(this.index()), 0, this.count() - 1));
  readonly canPrevious = computed(() => this.count() > 1 && (this.loop() || this.current() > 0));
  readonly canNext = computed(() => this.count() > 1 && (this.loop() || this.current() < this.count() - 1));
  /** The slides in view at the current position. */
  readonly inView = computed(() => slidesInView(this.extents(), this.snaps()[this.current()] ?? 0, this.view()));

  /** Logical travel of a running drag, in px (positive toward the inline end / the bottom). */
  private readonly travel = signal(0);
  protected readonly dragging = signal(false);
  protected readonly announcement = signal('');
  private readonly drag = new KxPointerDrag();
  private readonly injector = inject(Injector);

  readonly transform = computed(() => {
    const offset = (this.snaps()[this.current()] ?? 0) - this.travel();
    if (this.orientation() === 'vertical') return `translate3d(0, ${-offset}px, 0)`;
    return `translate3d(${this.rtl() ? offset : -offset}px, 0, 0)`;
  });

  constructor() {
    let observer: ResizeObserver | null = null;
    afterNextRender(() => {
      this.measure();
      const Observer = this.element.ownerDocument.defaultView?.ResizeObserver;
      if (!Observer) return;
      observer = new Observer(() => this.measure());
      this.observe(observer);
    });
    // slides added or removed: observe the new set and measure again
    effect(() => {
      this.items();
      untracked(() => {
        if (!observer) return;
        observer.disconnect();
        this.observe(observer);
        this.measure();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      observer?.disconnect();
      this.drag.dispose();
    });
  }

  private observe(observer: ResizeObserver): void {
    const content = this.content();
    if (content) observer.observe(content.element);
    for (const item of this.items()) observer.observe(item.element);
  }

  /** Read every slide's logical start and size, and the view's size. Reads only. */
  measure(): void {
    const content = this.content();
    if (!content) return;
    const vertical = this.orientation() === 'vertical';
    const rtl = !vertical && isRtl(this.element);
    const track = content.track().nativeElement.getBoundingClientRect();
    const view = content.element.getBoundingClientRect();
    const extents = this.items().map((item) => {
      const r = item.element.getBoundingClientRect();
      if (vertical) return { start: r.top - track.top, size: r.height };
      return { start: rtl ? track.right - r.right : r.left - track.left, size: r.width };
    });
    this.rtl.set(rtl);
    this.view.set(vertical ? view.height : view.width);
    const same = extents.length === this.extents().length && extents.every((e, i) => Math.abs(e.start - this.extents()[i]!.start) < 0.5 && Math.abs(e.size - this.extents()[i]!.size) < 0.5);
    if (!same) this.extents.set(extents);
    this.measured.set(true);
  }

  next(origin: Origin = 'code'): void {
    this.measure();
    if (!this.canNext()) return;
    this.go(this.current() + 1 >= this.count() ? 0 : this.current() + 1, origin);
  }

  previous(origin: Origin = 'code'): void {
    this.measure();
    if (!this.canPrevious()) return;
    this.go(this.current() - 1 < 0 ? this.count() - 1 : this.current() - 1, origin);
  }

  /** Go to a position. */
  scrollTo(position: number): void {
    this.measure();
    this.go(clamp(Math.round(position), 0, this.count() - 1), 'code');
  }

  private go(position: number, origin: Origin): void {
    const doc = this.element.ownerDocument;
    const focused = doc.activeElement;
    this.index.set(position);
    const shown = this.inView();
    const items = this.items();
    if (origin !== 'code') {
      const total = items.length;
      this.announcement.set(shown.length > 1 ? `Slides ${shown[0]! + 1} to ${shown.at(-1)! + 1} of ${total}` : `Slide ${(shown[0] ?? position) + 1} of ${total}`);
    }
    // focus inside a slide that is about to leave the view would be lost to the page when it turns inert; the
    // slide taking it is still inert until this change renders, so focus moves once it has
    const holder = items.findIndex((i) => focused instanceof Node && i.element.contains(focused));
    const target = items[shown[0] ?? position];
    if (holder >= 0 && !shown.includes(holder) && target) {
      afterNextRender(() => target.element.focus({ preventScroll: true }), { injector: this.injector });
    }
  }

  protected key(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isEditable(event.target)) return;
    let move: 'forward' | 'backward' | null = null;
    if (this.orientation() === 'vertical') move = event.key === 'ArrowDown' ? 'forward' : event.key === 'ArrowUp' ? 'backward' : null;
    else move = inlineKey(event.key, isRtl(this.element));
    if (!move) return;
    event.preventDefault();
    if (move === 'forward') this.next('key');
    else this.previous('key');
  }

  /** A press in the viewport: becomes a drag once it travels along the axis. */
  press(event: PointerEvent): void {
    const content = this.content();
    if (!content || event.button !== 0 || !event.isPrimary || isEditable(event.target) || this.drag.active) return;
    // a direction changed since the last resize (an ancestor's `dir`) resizes nothing: read it again before moving
    this.measure();
    const vertical = this.orientation() === 'vertical';
    const rtl = !vertical && isRtl(this.element);
    const view = this.view();
    const threshold = dragThreshold(this.element);
    let moving = false;
    let last = { t: event.timeStamp, d: 0 };
    let velocity = 0;
    const atStart = () => !this.loop() && this.current() === 0;
    const atEnd = () => !this.loop() && this.current() === this.count() - 1;
    this.drag.start(
      content.element,
      event,
      {
        move: (dx, dy, e) => {
          const along = vertical ? dy : rtl ? -dx : dx;
          const across = vertical ? dx : dy;
          if (!moving) {
            if (Math.abs(along) < threshold) return;
            // a gesture along the other axis is not this carousel's
            if (Math.abs(across) > Math.abs(along)) return this.drag.cancel();
            moving = true;
            this.dragging.set(true);
            content.element.ownerDocument.getSelection()?.removeAllRanges();
          }
          const resisted = (along > 0 && atStart()) || (along < 0 && atEnd()) ? along * 0.3 : along;
          this.travel.set(resisted);
          const dt = e.timeStamp - last.t;
          if (dt > 0) velocity = (along - last.d) / dt;
          last = { t: e.timeStamp, d: along };
        },
        end: (released, e) => {
          const travelled = this.travel();
          // a pointer held still before the release is not a flick, however fast it moved before
          if (e && e.timeStamp - last.t > FLICK_WINDOW) velocity = 0;
          this.travel.set(0);
          this.dragging.set(false);
          if (!moving) return;
          swallowClick(content.element);
          if (!released) return;
          const far = Math.abs(travelled) >= view * MOVE_FRACTION || Math.abs(velocity) >= FLICK;
          if (!far) return;
          if (travelled < 0) this.next('drag');
          else this.previous('drag');
        },
      },
      'page',
    );
  }
}

/** The `--interaction-drag-threshold` token (px, unitless), read where the carousel is; 4 when it is not set. */
function dragThreshold(el: Element): number {
  const raw = el.ownerDocument.defaultView?.getComputedStyle(el).getPropertyValue('--interaction-drag-threshold');
  const n = parseFloat(raw ?? '');
  return Number.isFinite(n) && n > 0 ? n : 4;
}

/** After a drag, the click the release would produce lands on whatever was under the pointer: swallow that one. */
function swallowClick(el: HTMLElement): void {
  const view = el.ownerDocument.defaultView;
  const stop = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  el.addEventListener('click', stop, { capture: true, once: true });
  view?.setTimeout(() => el.removeEventListener('click', stop, { capture: true }), 0);
}
