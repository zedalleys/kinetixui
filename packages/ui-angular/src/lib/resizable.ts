import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  booleanAttribute,
  computed,
  contentChildren,
  effect,
  forwardRef,
  inject,
  input,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { inlineKey, isRtl } from './collection';
import { KxPointerDrag, clamp } from './pointer-drag';

/**
 * Resizable: panels separated by handles a reader drags or moves with the keyboard.
 *
 *   <kx-resizable-panel-group direction="horizontal" (layoutChange)="save($event)">
 *     <kx-resizable-panel [defaultSize]="30" [minSize]="20">Navigation</kx-resizable-panel>
 *     <kx-resizable-handle withHandle />
 *     <kx-resizable-panel [defaultSize]="70">Content</kx-resizable-panel>
 *   </kx-resizable-panel-group>
 *
 * React's contract (react-resizable-panels through `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle`):
 * sizes are PERCENTAGES of the group (`defaultSize`, `minSize`, `maxSize`; a panel with no `defaultSize` shares
 * what the others leave), `direction` is the axis the panels are laid along, and a handle is the window-splitter
 * pattern — `role="separator"`, focusable, `aria-orientation` (the handle's own: a vertical bar between panels laid
 * out horizontally), `aria-valuenow` the size of the panel before it, `aria-valuemin` / `aria-valuemax` the sizes it
 * can actually reach given BOTH neighbours' limits, `aria-controls` that panel. Keys: the arrows of the group's axis
 * move it by 5 (React's step), Home and End to the reachable minimum and maximum, F6 / Shift+F6 to the next and
 * previous handle in the group.
 *
 * ── Direction ──────────────────────────────────────────────────────────────
 *
 * A horizontal group is laid out in the reading direction: in a right-to-left context the first panel is on the
 * RIGHT. Both input paths are therefore logical. ArrowRight is "toward the inline end" in LTR and ArrowLeft is in
 * RTL — the key that moves the handle away from the first panel grows it; a pointer dragged toward the inline end
 * grows the first panel, so its physical travel is negated in RTL. React's library reads the physical arrow, so
 * there ArrowRight grows the first panel even when it is on the right; this is a deliberate fix. Direction is the
 * handle's own (the nearest `[dir]`, then the computed style), so a group inside an RTL region of an LTR page
 * behaves as an RTL group.
 *
 * ── The drag ───────────────────────────────────────────────────────────────
 *
 * Measured from where the press started (no jump on the first move), as a fraction of the group's size read at
 * every move (so a group that resizes during the drag still tracks the pointer), clamped to both panels' limits.
 * The handle captures the pointer, so the release arrives wherever it happens — off the handle, off the window —
 * and a cancelled or lost capture ends the drag too (pointer-drag.ts). Disabling the handle mid-drag ends it.
 * `layoutChange` fires once per completed change: at the end of a drag that moved, and after a key that moved.
 *
 * Panels hold their sizes as flex weights, so a group that changes size keeps its proportions with nothing to
 * recompute. A panel's content scrolls rather than being clipped when it no longer fits.
 *
 * Not ported: React's library cascades a drag across further panels once a neighbour reaches its limit, and
 * supports collapsible panels; here a handle moves the two panels beside it only, and there is no collapse.
 */

export type KxResizableDirection = 'horizontal' | 'vertical';

/** React's keyboard step, in percent of the group. */
const STEP = 5;

/**
 * The sizes after moving the boundary after panel `before` by `delta` percent: the panel before it grows by
 * `delta`, the one after shrinks by the same, both held inside their own limits. Pure — unit-tested as logic.
 */
export function resizePair(sizes: readonly number[], before: number, delta: number, mins: readonly number[], maxs: readonly number[]): number[] {
  const after = before + 1;
  const out = sizes.slice();
  if (before < 0 || after >= sizes.length) return out;
  const { lo, hi } = reachable(sizes, before, mins, maxs);
  if (lo > hi) return out;
  const total = sizes[before]! + sizes[after]!;
  const next = clamp(sizes[before]! + delta, lo, hi);
  out[before] = next;
  out[after] = total - next;
  return out;
}

/** The sizes panel `before` can take by moving the boundary after it, given both neighbours' limits. */
export function reachable(sizes: readonly number[], before: number, mins: readonly number[], maxs: readonly number[]): { lo: number; hi: number } {
  const after = before + 1;
  const total = (sizes[before] ?? 0) + (sizes[after] ?? 0);
  return { lo: Math.max(mins[before] ?? 0, total - (maxs[after] ?? 100)), hi: Math.min(maxs[before] ?? 100, total - (mins[after] ?? 0)) };
}

/** The starting layout: each `defaultSize`, and an equal share of what is left for the panels without one. */
export function defaultLayout(defaults: readonly (number | undefined)[], mins: readonly number[], maxs: readonly number[]): number[] {
  const given = defaults.reduce<number>((t, d) => t + (d ?? 0), 0);
  const open = defaults.filter((d) => d === undefined).length;
  const share = open ? Math.max(0, 100 - given) / open : 0;
  return defaults.map((d, i) => clamp(d ?? share, mins[i] ?? 0, maxs[i] ?? 100));
}

let nextId = 0;

/** A panel. Sizes are percentages of the group. */
@Component({
  selector: 'kx-resizable-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-resizable__panel',
    '[attr.id]': 'id',
    '[style.flex]': 'flex()',
  },
})
export class KxResizablePanel {
  readonly group = inject(forwardRef(() => KxResizablePanelGroup));
  readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly defaultSize = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  readonly minSize = input(0, { transform: numberAttribute });
  readonly maxSize = input(100, { transform: numberAttribute });
  /** The id a handle's `aria-controls` names: the host's own, or a generated one. */
  readonly id = this.element.id || `kx-resizable-panel-${nextId++}`;
  protected readonly flex = computed(() => `${this.group.sizeOf(this)} 1 0px`);
}

/** The boundary between two panels: a focusable window splitter. */
@Component({
  selector: 'kx-resizable-handle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (withHandle()) {
      <span class="kx-resizable__grip" aria-hidden="true">
        <svg viewBox="0 0 8 16" focusable="false"><circle cx="2" cy="4" r="1" /><circle cx="6" cy="4" r="1" /><circle cx="2" cy="8" r="1" /><circle cx="6" cy="8" r="1" /><circle cx="2" cy="12" r="1" /><circle cx="6" cy="12" r="1" /></svg>
      </span>
    }
  `,
  host: {
    class: 'kx-resizable__handle',
    role: 'separator',
    '[attr.tabindex]': 'disabled() ? -1 : 0',
    '[attr.aria-label]': 'label()',
    '[attr.aria-orientation]': 'group.direction() === "horizontal" ? "vertical" : "horizontal"',
    '[attr.aria-controls]': 'value()?.controls ?? null',
    '[attr.aria-valuenow]': 'value()?.now ?? null',
    '[attr.aria-valuemin]': 'value()?.min ?? null',
    '[attr.aria-valuemax]': 'value()?.max ?? null',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-dragging]': 'dragging() ? "" : null',
    '(pointerdown)': 'press($event)',
    '(keydown)': 'key($event)',
  },
})
export class KxResizableHandle {
  readonly group = inject(forwardRef(() => KxResizablePanelGroup));
  readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Draw a grip on the bar. */
  readonly withHandle = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The handle's accessible name. */
  readonly label = input('Resize');
  /** A pointer drag is running. */
  readonly dragging = signal(false);
  private readonly drag = new KxPointerDrag();
  protected readonly value = computed(() => this.group.valueOf(this));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.drag.dispose());
    // disabled while a drag runs: the drag ends where it is
    effect(() => {
      if (this.disabled()) this.drag.cancel();
    });
  }

  protected press(event: PointerEvent): void {
    if (this.disabled() || event.button !== 0 || !event.isPrimary) return;
    const pivot = this.group.pivotOf(this);
    if (pivot < 0) return;
    // no text selection and no native drag starts under the pointer; focus moves to the handle explicitly
    event.preventDefault();
    this.element.focus({ preventScroll: true });
    const horizontal = this.group.direction() === 'horizontal';
    const rtl = horizontal && isRtl(this.element);
    const from = this.group.layout().slice();
    const started = this.drag.start(this.element, event, {
      move: (dx, dy) => {
        const size = this.group.extent();
        if (size <= 0) return;
        const travel = horizontal ? (rtl ? -dx : dx) : dy;
        this.group.apply(resizePair(from, pivot, (travel / size) * 100, this.group.mins(), this.group.maxs()));
      },
      end: () => {
        this.dragging.set(false);
        this.group.commit(from);
      },
    });
    if (started) this.dragging.set(true);
  }

  protected key(event: KeyboardEvent): void {
    if (this.disabled() || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'F6') {
      event.preventDefault();
      this.group.cycle(this, event.shiftKey ? -1 : 1);
      return;
    }
    const pivot = this.group.pivotOf(this);
    if (pivot < 0) return;
    const horizontal = this.group.direction() === 'horizontal';
    let delta: number | null = null;
    if (event.key === 'Home') delta = -100;
    else if (event.key === 'End') delta = 100;
    else if (horizontal) {
      const along = inlineKey(event.key, isRtl(this.element));
      delta = along === 'forward' ? STEP : along === 'backward' ? -STEP : null;
    } else if (event.key === 'ArrowDown') delta = STEP;
    else if (event.key === 'ArrowUp') delta = -STEP;
    if (delta === null) return;
    event.preventDefault();
    const from = this.group.layout().slice();
    this.group.apply(resizePair(from, pivot, delta, this.group.mins(), this.group.maxs()));
    this.group.commit(from);
  }
}

/** A row or column of panels and the handles between them. */
@Component({
  selector: 'kx-resizable-panel-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    class: 'kx-resizable',
    '[attr.data-direction]': 'direction()',
    '[attr.data-dragging]': 'dragging() ? "" : null',
  },
})
export class KxResizablePanelGroup {
  readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** The axis the panels are laid along. */
  readonly direction = input<KxResizableDirection>('horizontal');
  /** The panels' sizes, in percent, after each completed change (the end of a drag, a key). */
  readonly layoutChange = output<number[]>();

  // descendants, kept to the ones this group owns: a nested group's panels are not this group's
  private readonly allPanels = contentChildren(KxResizablePanel, { descendants: true });
  private readonly allHandles = contentChildren(KxResizableHandle, { descendants: true });
  readonly panels = computed(() => this.allPanels().filter((p) => p.group === this));
  private readonly handles = computed(() => this.allHandles().filter((h) => h.group === this));
  readonly mins = computed(() => this.panels().map((p) => p.minSize()));
  readonly maxs = computed(() => this.panels().map((p) => p.maxSize()));
  private readonly sizes = signal<number[] | null>(null);
  /** The current sizes: the last applied layout, or the panels' defaults until anything moved. */
  readonly layout = computed(() => {
    const sizes = this.sizes();
    const panels = this.panels();
    return sizes && sizes.length === panels.length ? sizes : defaultLayout(panels.map((p) => p.defaultSize()), this.mins(), this.maxs());
  });
  protected readonly dragging = computed(() => this.handles().some((h) => h.dragging()));

  sizeOf(panel: KxResizablePanel): number {
    const i = this.panels().indexOf(panel);
    return i < 0 ? 1 : this.layout()[i]!;
  }

  /** The index of the panel BEFORE a handle (the handle resizes it and the next one), or -1. */
  pivotOf(handle: KxResizableHandle): number {
    const panels = this.panels();
    let before = -1;
    for (let i = 0; i < panels.length; i++) {
      if (panels[i]!.element.compareDocumentPosition(handle.element) & Node.DOCUMENT_POSITION_FOLLOWING) before = i;
    }
    return before >= 0 && before + 1 < panels.length ? before : -1;
  }

  /** What a handle announces: the size of the panel before it, and the sizes it can reach. */
  valueOf(handle: KxResizableHandle): { now: number; min: number; max: number; controls: string } | null {
    const pivot = this.pivotOf(handle);
    if (pivot < 0) return null;
    const layout = this.layout();
    const { lo, hi } = reachable(layout, pivot, this.mins(), this.maxs());
    return { now: Math.round(layout[pivot]!), min: Math.round(lo), max: Math.round(hi), controls: this.panels()[pivot]!.id };
  }

  /** The group's length along its axis, in CSS pixels, read now. */
  extent(): number {
    const r = this.element.getBoundingClientRect();
    return this.direction() === 'horizontal' ? r.width : r.height;
  }

  apply(layout: number[]): void {
    this.sizes.set(layout);
  }

  /** Report a completed change, if anything moved since `from`. */
  commit(from: readonly number[]): void {
    const now = this.layout();
    if (now.some((v, i) => Math.abs(v - (from[i] ?? v)) > 1e-9)) this.layoutChange.emit(now.slice());
  }

  /** F6: focus moves to the next (or previous) enabled handle of this group, wrapping. */
  cycle(from: KxResizableHandle, step: 1 | -1): void {
    const handles = this.handles().filter((h) => !h.disabled());
    const at = handles.indexOf(from);
    if (handles.length < 2 || at < 0) return;
    handles[(at + step + handles.length) % handles.length]!.element.focus();
  }
}

function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null || value === '' ? undefined : numberAttribute(value);
}
