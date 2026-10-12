import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { isRtl } from './collection';
import { KxPointerDrag, clamp } from './pointer-drag';

/**
 * Scroll area: a scrolling region with drawn scrollbars.
 *
 *   <kx-scroll-area label="Tags" style="block-size: 12rem">…long content…</kx-scroll-area>
 *
 * React's ScrollArea (Radix) keeps the browser's scrolling and draws its own scrollbars over it. So does this:
 * the viewport is an ordinary `overflow: auto` element with the native scrollbars hidden, so the wheel, touch
 * panning, momentum, keyboard scrolling, scroll chaining into an outer scroller (nothing is trapped), find-in-page,
 * focus scrolling into view and `scrollIntoView` are all the browser's. Nothing here moves the content except a
 * drag on a drawn scrollbar, which sets the viewport's scroll position the way the browser's own scrollbar would.
 *
 * ── What is drawn ──────────────────────────────────────────────────────────
 *
 * A scrollbar appears for each axis that actually overflows, and only then; the area itself never decides that
 * content may be cut off — both axes scroll when they need to (React's ScrollArea draws only the vertical bar by
 * default and scrolls the other axis invisibly). The bars sit in their own grid tracks beside the viewport rather
 * than over its edge, so they never cover content, and the vertical bar is at the inline END: on the left in a
 * right-to-left context, as the browser's own is.
 *
 * The thumb is two numbers — how much of the content is visible, and how far along it the view is — turned into
 * CSS. Horizontal progress is LOGICAL: measured from the inline start, so in RTL (where `scrollLeft` runs from 0
 * at the right edge to negative values) the thumb starts at the right and moves left as the reader moves toward
 * the end. A drag on the thumb moves the content by the same proportion; a press on the track jumps the thumb's
 * centre there and keeps dragging (Radix's behaviour). The bars are `aria-hidden`: they draw the scroll position,
 * and every way of changing it already exists without them.
 *
 * ── What keeps it current ──────────────────────────────────────────────────
 *
 * Scroll events update the thumb. A `ResizeObserver`, created after the first render and disconnected on destroy,
 * watches the viewport and the content, so content that grows or shrinks and a container that changes size both
 * re-measure (and a bar appears or disappears). Measuring only reads; the only layout it causes is a bar's track
 * appearing, which can only keep the overflow it was added for, so it cannot oscillate.
 *
 * ── Keyboard ───────────────────────────────────────────────────────────────
 *
 * When — and only when — something overflows, the viewport is a Tab stop, so a keyboard reader can scroll it with
 * the arrows, Page Up/Down, Home/End and Space, as the browser does for a focused scroller. It is then a named
 * `region` when `label` is given. Content that fits is not given a Tab stop that would do nothing. Its focus ring
 * is drawn inside its own edge, where nothing clips it.
 */
@Component({
  selector: 'kx-scroll-area',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #viewport
      class="kx-scroll-area__viewport"
      [attr.tabindex]="scrollable() ? 0 : null"
      [attr.role]="scrollable() && label() ? 'region' : null"
      [attr.aria-label]="scrollable() ? label() : null"
      (scroll)="measure()"
    >
      <div #content class="kx-scroll-area__content"><ng-content /></div>
    </div>
    @if (metrics().y) {
      <div class="kx-scroll-area__scrollbar" data-orientation="vertical" aria-hidden="true" (pointerdown)="press($event, 'y')">
        <div class="kx-scroll-area__thumb" [style.--kx-scroll-size]="metrics().ySize" [style.--kx-scroll-progress]="metrics().yProgress"></div>
      </div>
    }
    @if (metrics().x) {
      <div class="kx-scroll-area__scrollbar" data-orientation="horizontal" aria-hidden="true" (pointerdown)="press($event, 'x')">
        <div class="kx-scroll-area__thumb" [style.--kx-scroll-size]="metrics().xSize" [style.--kx-scroll-progress]="metrics().xProgress"></div>
      </div>
    }
    @if (metrics().x && metrics().y) {
      <div class="kx-scroll-area__corner" aria-hidden="true"></div>
    }
  `,
  host: {
    class: 'kx-scroll-area',
    '[attr.data-overflow-x]': 'metrics().x ? "" : null',
    '[attr.data-overflow-y]': 'metrics().y ? "" : null',
    '[attr.data-dragging]': 'dragging() ? "" : null',
  },
})
export class KxScrollArea {
  /** The scrolling region's accessible name. Used only while it scrolls (and is therefore a Tab stop). */
  readonly label = input<string | null>(null);

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');
  /** What overflows, how much of each axis is visible (0–1) and how far along it the view is (0–1, logical). */
  protected readonly metrics = signal({ x: false, y: false, xSize: 1, ySize: 1, xProgress: 0, yProgress: 0 });
  protected readonly scrollable = computed(() => this.metrics().x || this.metrics().y);
  protected readonly dragging = signal(false);
  private readonly drag = new KxPointerDrag();

  constructor() {
    let observer: ResizeObserver | null = null;
    afterNextRender(() => {
      const viewport = this.viewport().nativeElement;
      this.measure();
      const Observer = viewport.ownerDocument.defaultView?.ResizeObserver;
      if (!Observer) return;
      observer = new Observer(() => this.measure());
      observer.observe(viewport);
      observer.observe(this.content().nativeElement);
    });
    inject(DestroyRef).onDestroy(() => {
      observer?.disconnect();
      this.drag.dispose();
    });
  }

  /** Read the viewport's scroll geometry into the bars. Reads only. */
  protected measure(): void {
    const v = this.viewport().nativeElement;
    const rangeY = v.scrollHeight - v.clientHeight;
    const rangeX = v.scrollWidth - v.clientWidth;
    const y = rangeY > 1;
    const x = rangeX > 1;
    // RTL scrollLeft runs 0 → −range; the logical distance from the inline start is its magnitude
    const along = isRtl(v) ? -v.scrollLeft : v.scrollLeft;
    const next = {
      x,
      y,
      xSize: x ? v.clientWidth / v.scrollWidth : 1,
      ySize: y ? v.clientHeight / v.scrollHeight : 1,
      xProgress: x ? clamp(along / rangeX, 0, 1) : 0,
      yProgress: y ? clamp(v.scrollTop / rangeY, 0, 1) : 0,
    };
    const now = this.metrics();
    if ((Object.keys(next) as (keyof typeof next)[]).some((k) => next[k] !== now[k])) this.metrics.set(next);
  }

  /** A press on a scrollbar: on the thumb, drag it; on the track, jump the thumb's centre there, then drag. */
  protected press(event: PointerEvent, axis: 'x' | 'y'): void {
    if (event.button !== 0 || !event.isPrimary) return;
    const bar = event.currentTarget as HTMLElement;
    const thumb = bar.firstElementChild as HTMLElement | null;
    if (!thumb) return;
    event.preventDefault();
    const v = this.viewport().nativeElement;
    const rtl = axis === 'x' && isRtl(v);
    const barRect = bar.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const track = axis === 'x' ? barRect.width : barRect.height;
    const thumbLength = axis === 'x' ? thumbRect.width : thumbRect.height;
    const range = axis === 'x' ? v.scrollWidth - v.clientWidth : v.scrollHeight - v.clientHeight;
    const free = track - thumbLength;
    if (range <= 0 || free <= 0) return;
    // logical positions along the bar: 0 at the inline start (or the top)
    const pointer = axis === 'x' ? (rtl ? barRect.right - event.clientX : event.clientX - barRect.left) : event.clientY - barRect.top;
    const thumbStart = axis === 'x' ? (rtl ? barRect.right - thumbRect.right : thumbRect.left - barRect.left) : thumbRect.top - barRect.top;
    const onThumb = event.target === thumb || thumb.contains(event.target as Node);
    const startAt = onThumb ? thumbStart : clamp(pointer - thumbLength / 2, 0, free);
    const scrollTo = (logicalThumbStart: number) => {
      const position = (clamp(logicalThumbStart, 0, free) / free) * range;
      if (axis === 'y') v.scrollTop = position;
      else v.scrollLeft = rtl ? -position : position;
    };
    if (!onThumb) scrollTo(startAt);
    const started = this.drag.start(bar, event, {
      move: (dx, dy) => scrollTo(startAt + (axis === 'y' ? dy : rtl ? -dx : dx)),
      end: () => this.dragging.set(false),
    });
    if (started) this.dragging.set(true);
  }
}
