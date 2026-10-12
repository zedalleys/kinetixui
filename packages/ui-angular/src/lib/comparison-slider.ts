import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, model } from '@angular/core';
import { isRtl } from './collection';
import { KxPointerDrag, clamp } from './pointer-drag';

/**
 * Comparison slider: a divider wiping between two stacked layers — a before/after image, a redesign preview.
 *
 *   <kx-comparison-slider [(value)]="split" beforeLabel="Before" afterLabel="After">
 *     <img kxComparisonBefore src="/before.jpg" alt="The kitchen before the renovation" />
 *     <img kxComparisonAfter src="/after.jpg" alt="The kitchen after the renovation" />
 *   </kx-comparison-slider>
 *
 * React's ComparisonSlider puts Radix's Slider over the layers for the drag, the keyboard and the ARIA, and draws
 * the divider from the same value. Here the control is the browser's own range input, stretched over the whole
 * area and painted transparent, the same choice `kx-slider` made: the pointer (press anywhere, drag), touch, the
 * keyboard (arrows by 1, Page Up/Down by 10, Home/End), the value semantics a screen reader reads
 * (`role="slider"`, `aria-valuemin` 0, `aria-valuemax` 100, `aria-valuenow`), clamping to 0–100 and the direction
 * flip are all the browser's. There is ONE interactive element: the drawn handle is a picture of the input's
 * position and takes no focus and no pointer events of its own; the input's focus ring is drawn on it.
 *
 * ── The value and direction ────────────────────────────────────────────────
 *
 * `value` (two-way, default 50, React's) is the divider's distance from the INLINE START, in percent. The before
 * layer shows from the inline start up to the divider and the after layer from the divider to the inline end, so
 * in a right-to-left context the before layer is on the right — and the input, in the same direction, puts its
 * minimum on the right and moves its value up with ArrowLeft. Everything is drawn with logical properties (the
 * divider's `inset-inline-start`, the after layer's inline offset), so the picture and the value agree in both
 * directions with nothing read from the page. React's divider and clip are physical (`left`, `inset(0 0 0 x%)`),
 * so there the picture and the slider disagree in RTL; this is a deliberate fix.
 *
 * A value bound from outside the range is drawn at the nearest end (the input clamps it too), and the after
 * layer is laid out at the area's full size so the picture inside it does not move as the divider does.
 *
 * Horizontal only, as React's is. There is no motion: the divider follows the value as it changes.
 *
 * ── A pen ──────────────────────────────────────────────────────────────────
 *
 * Chromium's range input sets its value where a pen presses but does not follow a pen DRAG (measured on a bare
 * `<input type="range">`; mouse and touch both drag). So a pen press is the one input handled here: the input is
 * focused, the value follows the pen across the area (from the inline start, so in RTL too), with the pointer
 * captured until it is lifted, cancelled or the component is destroyed.
 */
@Component({
  selector: 'kx-comparison-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="kx-comparison-slider__layer kx-comparison-slider__before"><ng-content select="[kxComparisonBefore]" /></div>
    <div class="kx-comparison-slider__after">
      <div class="kx-comparison-slider__layer kx-comparison-slider__after-layer"><ng-content select="[kxComparisonAfter]" /></div>
    </div>
    <div class="kx-comparison-slider__divider" aria-hidden="true"></div>
    @if (beforeLabel()) {
      <span class="kx-comparison-slider__label kx-comparison-slider__label--before">{{ beforeLabel() }}</span>
    }
    @if (afterLabel()) {
      <span class="kx-comparison-slider__label kx-comparison-slider__label--after">{{ afterLabel() }}</span>
    }
    <input
      type="range"
      class="kx-comparison-slider__input"
      min="0"
      max="100"
      step="any"
      [value]="position()"
      [attr.aria-label]="label()"
      (input)="changed($event)"
      (pointerdown)="pen($event)"
    />
    <span class="kx-comparison-slider__handle" aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false"><path d="M6 4v8M10 4v8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
    </span>
  `,
  host: {
    class: 'kx-comparison-slider',
    '[style.--kx-comparison-position]': 'position() + "%"',
  },
})
export class KxComparisonSlider {
  /** Two-way: the divider's distance from the inline start, 0–100. */
  readonly value = model(50);
  readonly beforeLabel = input<string | null>(null);
  readonly afterLabel = input<string | null>(null);
  /** The control's accessible name. */
  readonly label = input('Comparison position');
  /** The value drawn and given to the input: held to 0–100. */
  protected readonly position = computed(() => {
    const v = Number(this.value());
    return Number.isFinite(v) ? clamp(v, 0, 100) : 50;
  });

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly drag = new KxPointerDrag();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.drag.dispose());
  }

  /** A pen press: set the value under it and follow the pen (see "A pen" above). */
  protected pen(event: PointerEvent): void {
    if (event.pointerType !== 'pen' || event.button !== 0 || !event.isPrimary) return;
    const input = event.currentTarget as HTMLInputElement;
    event.preventDefault();
    input.focus({ preventScroll: true });
    const rtl = isRtl(this.host);
    const at = (clientX: number) => {
      const r = this.host.getBoundingClientRect();
      if (r.width <= 0) return;
      this.value.set(clamp(((rtl ? r.right - clientX : clientX - r.left) / r.width) * 100, 0, 100));
    };
    at(event.clientX);
    this.drag.start(input, event, { move: (dx) => at(event.clientX + dx), end: () => undefined });
  }

  protected changed(event: Event): void {
    const v = (event.target as HTMLInputElement).valueAsNumber;
    if (Number.isFinite(v)) this.value.set(v);
  }
}
