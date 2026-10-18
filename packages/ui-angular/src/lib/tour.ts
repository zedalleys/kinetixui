import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  afterRenderEffect,
  computed,
  forwardRef,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { KxButton } from './button';
import { KX_DIALOG, KxDialogDescription, KxDialogRoot, KxDialogTitle, KxModalSurface } from './dialog';
import { autoPlace } from './overlay';

/**
 * Tour: a sequence of steps, each pointing at a real element of the page with a spotlight and a card that says
 * what it is — onboarding.
 *
 *   <kx-tour [steps]="steps" [(open)]="touring" [(stepIndex)]="step" />
 *
 *   steps: KxTourStep[] = [
 *     { target: '#search', title: 'Search', content: 'Find any project by name.' },
 *     { target: '[data-tour="new"]', title: 'New project', content: 'Start one from a template.' },
 *   ];
 *
 * ── It is a modal dialog, as React's is ────────────────────────────────────
 *
 * React's Tour is `role="dialog"` with `aria-modal="true"`, moves focus into the dialog on open and on every
 * step (so the new step's title is announced), keeps Tab inside it, closes on Escape and gives focus back to
 * what had it. This port is the same contract built on the family's own modal surface (dialog.ts): a native
 * `<dialog>` opened with `showModal()`, so the page behind is inert for real — not only announced as such — and
 * it is one layer on the C1 overlay stack. Escape therefore closes the TOP layer only: a tour opened from
 * inside a dialog closes alone, and the dialog stays. Focus goes back through the family's chain (what was
 * focused before, else `returnFocus`, else the surface beneath). A press outside the card does nothing:
 * leaving a tour is Skip, Done or Escape, never an accidental click.
 *
 * ── Where the card goes ────────────────────────────────────────────────────
 *
 * `target` is a CSS selector, resolved against the live document when the step shows — steps are written as
 * data before the elements they point at exist. The target is scrolled to the centre of the viewport (instantly
 * under reduced motion: the page travelling is the one motion a reader cannot look away from). The card is
 * placed by the C1 placement engine (`autoPlace`) below the target and aligned to its logical START — the
 * left edge in a left-to-right region, the right edge in a right-to-left one, decided by the target's own
 * direction — flipping above when there is no room below and shifted and capped to stay inside the viewport
 * with an 8px margin; it scrolls inside itself when its content is taller than the room. It follows the target
 * on scroll and resize. The spotlight is drawn round the target after every placement.
 *
 * A target that is missing — never there, `display: none`, or removed while its step is showing — is not an
 * error: the card is centred in the viewport and the whole page is dimmed (`data-target="missing"`). The
 * document is watched while the tour is open, so a target that appears or disappears later is picked up.
 *
 * Steps are data — title and content are text, as the brief for this port settled; rich step content is a
 * follow-up, not a claim.
 */
export interface KxTourStep {
  /** A CSS selector for the element the step points at. */
  target: string;
  title: string;
  content: string;
}

const SPOTLIGHT_PADDING = 8;

/** The tour's own modal surface: the family's modal behaviour, with React's tour policies. */
@Directive({
  selector: 'dialog[kxTourSurface]',
  host: { class: 'kx-tour' },
})
export class KxTourSurface extends KxModalSurface {
  /** A press on the page behind is not a way out of a tour. */
  protected override readonly closesOnOutside = false;
  /** First focus is the dialog itself, as React's: the reader hears the step's title, then Tabs to the buttons. */
  protected override initialFocus(): HTMLElement {
    return this.el;
  }
}

@Component({
  selector: 'kx-tour',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [KxTourSurface, KxDialogTitle, KxDialogDescription, KxButton],
  providers: [{ provide: KX_DIALOG, useExisting: forwardRef(() => KxTour) }],
  template: `
    <dialog kxTourSurface #surface [attr.data-target]="targetState()">
      <div class="kx-tour__spotlight" #spotlight aria-hidden="true"></div>
      <div class="kx-tour__card" #card>
        @if (step(); as s) {
          <h2 kxDialogTitle class="kx-tour__title">{{ s.title }}</h2>
          <p kxDialogDescription class="kx-tour__content">{{ s.content }}</p>
          <div class="kx-tour__footer">
            <span class="kx-tour__counter"><span aria-hidden="true">{{ index() + 1 }} / {{ steps().length }}</span><span class="kx-sr-only">{{ counterLabel()(index() + 1, steps().length) }}</span></span>
            <div class="kx-tour__actions">
              @if (index() > 0) {
                <button kxButton variant="Ghost" size="sm" type="button" (click)="go(index() - 1)">{{ backLabel() }}</button>
              }
              @if (index() < steps().length - 1) {
                <button kxButton variant="Link" size="sm" type="button" (click)="close()">{{ skipLabel() }}</button>
                <button kxButton size="sm" type="button" (click)="go(index() + 1)">{{ nextLabel() }}</button>
              } @else {
                <button kxButton size="sm" type="button" (click)="close()">{{ doneLabel() }}</button>
              }
            </div>
          </div>
        }
      </div>
    </dialog>
  `,
  host: { class: 'kx-overlay-root' },
})
export class KxTour extends KxDialogRoot {
  readonly steps = input<readonly KxTourStep[]>([]);
  /** Two-way: the step showing, from 0. Out of range reads as the nearest step. */
  readonly stepIndex = model(0);
  readonly nextLabel = input('Next');
  readonly backLabel = input('Back');
  readonly skipLabel = input('Skip');
  readonly doneLabel = input('Done');
  /** What a screen reader hears for the visible "2 / 5". */
  readonly counterLabel = input<(step: number, total: number) => string>((step, total) => `Step ${step} of ${total}`);

  protected readonly index = computed(() => Math.min(Math.max(0, this.stepIndex()), Math.max(0, this.steps().length - 1)));
  protected readonly step = computed(() => this.steps()[this.index()] ?? null);
  /** Whether the current step's target was found: `found`, `missing`, or null while closed. */
  protected readonly targetState = computed(() => (this.open() && this.step() ? (this.found() ? 'found' : 'missing') : null));

  private readonly surface = viewChild.required('surface', { read: ElementRef<HTMLDialogElement> });
  private readonly card = viewChild.required('card', { read: ElementRef<HTMLElement> });
  private readonly spotlight = viewChild.required('spotlight', { read: ElementRef<HTMLElement> });
  private readonly doc = inject(DOCUMENT);
  private readonly found = signal(false);

  private release: (() => void) | null = null;
  private watcher: MutationObserver | null = null;
  private frame = 0;
  private target: Element | null = null;
  private shownIndex = -1;

  constructor() {
    super();
    // After every write phase: the surface's own effect has run showModal() by now, so the card has a size.
    afterRenderEffect({
      mixedReadWrite: () => {
        const open = this.open();
        const step = this.step();
        const index = this.index();
        untracked(() => this.sync(open, step, index));
      },
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  protected go(index: number): void {
    this.stepIndex.set(index);
  }

  private sync(open: boolean, step: KxTourStep | null, index: number): void {
    if (!open || !step) {
      this.stop();
      return;
    }
    if (!this.watcher) this.watch();
    this.place(step, true);
    // every step after the first takes focus back to the dialog, so the new title is what is announced
    if (this.shownIndex !== -1 && this.shownIndex !== index) this.surface().nativeElement.focus();
    this.shownIndex = index;
  }

  private place(step: KxTourStep, scroll: boolean): void {
    this.release?.();
    this.release = null;
    const card = this.card().nativeElement;
    const target = this.resolve(step.target);
    this.target = target;
    this.found.set(!!target);
    if (!target) {
      // centred by the stylesheet; nothing left over from the last placement
      for (const el of [card, this.spotlight().nativeElement]) {
        for (const p of ['left', 'top', 'width', 'height']) el.style.removeProperty(p);
      }
      card.removeAttribute('data-placement');
      return;
    }
    if (scroll) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: this.reducedMotion() ? 'auto' : 'smooth' });
    this.release = autoPlace(target, card, {
      side: () => 'bottom',
      align: () => 'start',
      offset: () => SPOTLIGHT_PADDING + 8,
      placed: () => this.light(target),
    });
  }

  /** Draw the spotlight round the target, padded. Physical numbers: they are measured, not authored. */
  private light(target: Element): void {
    const r = target.getBoundingClientRect();
    const s = this.spotlight().nativeElement.style;
    s.left = `${r.left - SPOTLIGHT_PADDING}px`;
    s.top = `${r.top - SPOTLIGHT_PADDING}px`;
    s.width = `${r.width + SPOTLIGHT_PADDING * 2}px`;
    s.height = `${r.height + SPOTLIGHT_PADDING * 2}px`;
  }

  /** The element a selector names, if it is there and rendered. A selector that does not parse names nothing. */
  private resolve(selector: string): HTMLElement | null {
    let el: HTMLElement | null = null;
    try {
      el = this.doc.querySelector<HTMLElement>(selector);
    } catch {
      return null;
    }
    if (!el || this.surface().nativeElement.contains(el) || el.getClientRects().length === 0) return null;
    return el;
  }

  /** While open, notice the target appearing, disappearing or being replaced — at most once a frame. */
  private watch(): void {
    const view = this.doc.defaultView;
    const Observer = (view as (Window & typeof globalThis) | null)?.MutationObserver;
    if (!view || typeof Observer !== 'function') return;
    const dialog = this.surface().nativeElement;
    this.watcher = new Observer((records) => {
      // the tour's own writes (the card's position, the spotlight) are not news
      if (records.every((r) => dialog.contains(r.target))) return;
      if (this.frame) return;
      this.frame = view.requestAnimationFrame(() => {
        this.frame = 0;
        const step = this.step();
        if (!this.open() || !step) return;
        const now = this.resolve(step.target);
        if (now !== this.target) this.place(step, false);
      });
    });
    this.watcher.observe(this.doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
  }

  private stop(): void {
    this.release?.();
    this.release = null;
    this.watcher?.disconnect();
    this.watcher = null;
    if (this.frame) this.doc.defaultView?.cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.target = null;
    this.shownIndex = -1;
  }

  private reducedMotion(): boolean {
    try {
      return !!this.doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }
}
