import { Component, signal } from '@angular/core';
import {
  KxButton,
  KxCarousel,
  KxCarouselContent,
  KxCarouselItem,
  KxCarouselNext,
  KxCarouselPrevious,
  KxComparisonSlider,
  KxResizableHandle,
  KxResizablePanel,
  KxResizablePanelGroup,
  KxScrollArea,
} from '../public-api';

/**
 * The layout, pointer and scroll tranche, wired to state the page can read back — the subject of
 * `scripts/angular-layout.mjs` (keyboard, pointer, touch, resize, direction, 200% text, motion, axe) and of
 * `scripts/layout-visual.mjs` (rendered states).
 *
 * behaviour.ts's conventions: one `<section data-kx-subject>` per component (a gate sets `dir` on it for the region
 * cases), every value a subject changes bound into an `<output data-kx-out="…">`, and ids on what a gate drives.
 * `?region=rtl|ltr` wraps the whole page in a region of that direction, set before the first render, so the gate
 * can run the four direction cases (page × region). Buttons beside a subject change it from outside — content that grows, a container that narrows, a value bound
 * out of range, a handle disabled mid-drag — so the gate measures what a reader's own page would do to it. The
 * last section is removed and added again (`#lc-toggle`), mid-drag if the gate likes, to measure teardown.
 */
@Component({
  selector: 'kx-fixture',
  imports: [
    KxButton,
    KxCarousel,
    KxCarouselContent,
    KxCarouselItem,
    KxCarouselNext,
    KxCarouselPrevious,
    KxComparisonSlider,
    KxResizableHandle,
    KxResizablePanel,
    KxResizablePanelGroup,
    KxScrollArea,
  ],
  template: `
    <h1 class="kx-sr-only">Layout, pointer and scroll</h1>
    <div class="kx-layout-fixture" id="region" [attr.dir]="region">

    <section data-kx-subject="scroll-area" id="sa">
      <h2>Scroll area</h2>
      <div class="row top">
        <kx-scroll-area id="sa-vertical" label="Tags" class="box tall">
          @for (tag of tags; track tag) {
            <div class="tag">{{ tag }}</div>
          }
        </kx-scroll-area>
        <kx-scroll-area id="sa-horizontal" label="Albums" class="box">
          <div class="strip">
            @for (n of twelve; track n) {
              <div class="tile">Album {{ n }}</div>
            }
          </div>
        </kx-scroll-area>
        <kx-scroll-area id="sa-both" label="Matrix" class="box tall">
          <div class="grid">
            @for (n of sixty; track n) {
              <div class="cell">R{{ n }}</div>
            }
          </div>
        </kx-scroll-area>
        <kx-scroll-area id="sa-fits" label="Short" class="box tall">
          <p class="pad">Two lines that fit.</p>
        </kx-scroll-area>
      </div>
      <div class="row top">
        <div>
          <div class="row">
            <button kxButton variant="Outline" id="sa-grow-add" (click)="grow.set(grow() + 8)">Add rows</button>
            <button kxButton variant="Outline" id="sa-grow-reset" (click)="grow.set(2)">Two rows</button>
            <button kxButton variant="Outline" id="sa-resize" (click)="tallBox.set(!tallBox())">Resize box</button>
          </div>
          <kx-scroll-area id="sa-grow" label="Growing" class="box" [style.block-size]="tallBox() ? '24rem' : '8rem'">
            @for (n of rows(); track n) {
              <div class="tag">Row {{ n }}</div>
            }
          </kx-scroll-area>
        </div>
        <kx-scroll-area id="sa-outer" label="Outer" class="box tall">
          <p class="pad">Above the inner area.</p>
          <kx-scroll-area id="sa-inner" label="Inner" class="box inner">
            @for (n of twelve; track n) {
              <div class="tag">Inner {{ n }}</div>
            }
          </kx-scroll-area>
          @for (n of twelve; track n) {
            <div class="tag">Outer {{ n }}</div>
          }
        </kx-scroll-area>
        <kx-scroll-area id="sa-links" label="Links" class="box tall">
          @for (n of twelve; track n) {
            <a class="link" href="#sa-links" [attr.id]="'sa-link-' + n">Link {{ n }}</a>
          }
        </kx-scroll-area>
      </div>
    </section>

    <section data-kx-subject="resizable" id="rz">
      <h2>Resizable</h2>
      <div class="row">
        <button kxButton variant="Outline" id="rz-narrow" (click)="narrow.set(!narrow())">Narrow</button>
        <button kxButton variant="Outline" id="rz-disable" (click)="handleDisabled.set(!handleDisabled())">Disable handle</button>
      </div>
      <div class="frame-h" [style.inline-size]="narrow() ? '20rem' : '40rem'">
        <kx-resizable-panel-group id="rz-h" direction="horizontal" (layoutChange)="onLayout($event)">
          <kx-resizable-panel id="rz-h-a" [defaultSize]="50" [minSize]="20" [maxSize]="80"><div class="pane">One</div></kx-resizable-panel>
          <kx-resizable-handle id="rz-h-handle" withHandle [disabled]="handleDisabled()" />
          <kx-resizable-panel id="rz-h-b" [defaultSize]="50" [minSize]="25"><div class="pane">Two</div></kx-resizable-panel>
        </kx-resizable-panel-group>
      </div>
      <p>layout <output data-kx-out="rz-h">{{ hLayout() }}</output>, changes <output data-kx-out="rz-h-count">{{ hCount() }}</output></p>
      <div class="frame-v">
        <kx-resizable-panel-group id="rz-v" direction="vertical" (layoutChange)="vLayout.set($event.map(round).join(','))">
          <kx-resizable-panel id="rz-v-a" [defaultSize]="25" [minSize]="10"><div class="pane">Top</div></kx-resizable-panel>
          <kx-resizable-handle id="rz-v-handle-1" />
          <kx-resizable-panel id="rz-v-b" [defaultSize]="50" [minSize]="10"><div class="pane">Middle</div></kx-resizable-panel>
          <kx-resizable-handle id="rz-v-handle-2" withHandle />
          <kx-resizable-panel id="rz-v-c" [minSize]="10"><div class="pane">Bottom</div></kx-resizable-panel>
        </kx-resizable-panel-group>
      </div>
      <p>layout <output data-kx-out="rz-v">{{ vLayout() }}</output></p>
    </section>

    <section data-kx-subject="carousel" id="cr">
      <h2>Carousel</h2>
      <kx-carousel id="cr-basic" aria-label="Featured" class="carousel" [(index)]="basicIndex">
        <kx-carousel-content id="cr-basic-content">
          @for (n of five; track n) {
            <kx-carousel-item [attr.id]="'cr-basic-' + n"><div class="slide">{{ n }}</div></kx-carousel-item>
          }
        </kx-carousel-content>
        <button kxCarouselPrevious id="cr-basic-prev"></button>
        <button kxCarouselNext id="cr-basic-next"></button>
      </kx-carousel>
      <p>index <output data-kx-out="cr-basic">{{ basicIndex }}</output></p>

      <kx-carousel id="cr-multi" aria-label="Gallery" class="carousel multi" #multi="kxCarousel">
        <kx-carousel-content>
          @for (n of five; track n) {
            <kx-carousel-item [attr.id]="'cr-multi-' + n"><div class="slide small">{{ n }}</div></kx-carousel-item>
          }
        </kx-carousel-content>
        <button kxCarouselPrevious id="cr-multi-prev"></button>
        <button kxCarouselNext id="cr-multi-next"></button>
      </kx-carousel>
      <p>positions <output data-kx-out="cr-multi-count">{{ multi.count() }}</output>, at <output data-kx-out="cr-multi">{{ multi.current() }}</output></p>

      <kx-carousel id="cr-interactive" aria-label="Offers" class="carousel">
        <kx-carousel-content>
          @for (n of three; track n) {
            <kx-carousel-item [attr.id]="'cr-int-' + n">
              <div class="slide stack">
                <span>Offer {{ n }}</span>
                <button kxButton variant="Outline" [attr.id]="'cr-int-btn-' + n" (click)="clicks.set(clicks() + 1)">Claim {{ n }}</button>
                <input [attr.id]="'cr-int-input-' + n" [attr.aria-label]="'Note ' + n" value="text" />
              </div>
            </kx-carousel-item>
          }
        </kx-carousel-content>
        <button kxCarouselPrevious id="cr-int-prev"></button>
        <button kxCarouselNext id="cr-int-next"></button>
      </kx-carousel>
      <p>clicks <output data-kx-out="cr-clicks">{{ clicks() }}</output></p>

      <kx-carousel id="cr-loop" aria-label="Looping" class="carousel" loop [(index)]="loopIndex">
        <kx-carousel-content>
          @for (n of three; track n) {
            <kx-carousel-item [attr.id]="'cr-loop-' + n"><div class="slide">{{ n }}</div></kx-carousel-item>
          }
        </kx-carousel-content>
        <button kxCarouselPrevious id="cr-loop-prev"></button>
        <button kxCarouselNext id="cr-loop-next"></button>
      </kx-carousel>
      <p>index <output data-kx-out="cr-loop">{{ loopIndex }}</output></p>

      <kx-carousel id="cr-vertical" aria-label="Vertical" class="carousel vertical" orientation="vertical" [(index)]="verticalIndex">
        <kx-carousel-content class="v-view">
          @for (n of five; track n) {
            <kx-carousel-item [attr.id]="'cr-vertical-' + n"><div class="slide short">{{ n }}</div></kx-carousel-item>
          }
        </kx-carousel-content>
        <button kxCarouselPrevious id="cr-vertical-prev"></button>
        <button kxCarouselNext id="cr-vertical-next"></button>
      </kx-carousel>
      <p>index <output data-kx-out="cr-vertical">{{ verticalIndex }}</output></p>
    </section>

    <section data-kx-subject="comparison-slider" id="cs">
      <h2>Comparison slider</h2>
      <div class="row">
        <button kxButton variant="Outline" id="cs-set-150" (click)="split = 150">150</button>
        <button kxButton variant="Outline" id="cs-set-minus" (click)="split = -20">−20</button>
        <button kxButton variant="Outline" id="cs-set-30" (click)="split = 30">30</button>
        <button kxButton variant="Outline" id="cs-narrow" (click)="csNarrow.set(!csNarrow())">Narrow</button>
      </div>
      <div class="frame-cs" [style.inline-size]="csNarrow() ? '16rem' : '32rem'">
        <kx-comparison-slider id="cs-default" [(value)]="split" beforeLabel="Before" afterLabel="After">
          <div kxComparisonBefore class="layer before">Original</div>
          <div kxComparisonAfter class="layer after">Redesign</div>
        </kx-comparison-slider>
      </div>
      <p>value <output data-kx-out="cs">{{ split }}</output></p>
    </section>

    <section id="lc">
      <h2>Added and removed</h2>
      <button kxButton variant="Outline" id="lc-toggle" (click)="mounted.set(!mounted())">{{ mounted() ? 'Remove' : 'Add' }}</button>
      @if (mounted()) {
        <div class="row top">
          <kx-scroll-area id="lc-scroll" label="Temporary" class="box tall">
            @for (tag of tags; track tag) {
              <div class="tag">{{ tag }}</div>
            }
          </kx-scroll-area>
          <div class="frame-h lc-frame">
            <kx-resizable-panel-group id="lc-group">
              <kx-resizable-panel><div class="pane">A</div></kx-resizable-panel>
              <kx-resizable-handle id="lc-handle" />
              <kx-resizable-panel><div class="pane">B</div></kx-resizable-panel>
            </kx-resizable-panel-group>
          </div>
          <kx-carousel id="lc-carousel" aria-label="Temporary slides" class="carousel lc-carousel">
            <kx-carousel-content id="lc-carousel-content">
              @for (n of three; track n) {
                <kx-carousel-item><div class="slide">{{ n }}</div></kx-carousel-item>
              }
            </kx-carousel-content>
          </kx-carousel>
        </div>
      }
    </section>
    </div>
  `,
  styles: `
    :host { display: block; max-inline-size: 60rem; }
    .kx-layout-fixture { display: flex; flex-direction: column; gap: var(--spacing-8); }
    h2 { margin: 0 0 var(--spacing-2); font: var(--text-title-sm); }
    p { margin: var(--spacing-1) 0 0; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-2); }
    .top { align-items: flex-start; }
    .box { inline-size: min(14rem, 100%); border: 1px solid hsl(var(--border)); border-radius: var(--radius-md); }
    .tall { block-size: 10rem; }
    .inner { block-size: 6rem; inline-size: min(12rem, 100% - 2 * var(--spacing-2)); margin: var(--spacing-2); }
    .tag { padding: var(--spacing-1) var(--spacing-3); font: var(--text-body-sm); border-block-end: 1px solid hsl(var(--border)); }
    .pad { margin: 0; padding: var(--spacing-3); font: var(--text-body-sm); }
    .strip { display: flex; gap: var(--spacing-2); padding: var(--spacing-3); }
    .tile { flex: none; inline-size: 6rem; block-size: 4rem; display: grid; place-items: center; border-radius: var(--radius-sm); background: hsl(var(--muted)); font: var(--text-body-sm); }
    .grid { display: grid; grid-template-columns: repeat(10, 5rem); gap: var(--spacing-1); padding: var(--spacing-2); }
    .cell { padding: var(--spacing-1); background: hsl(var(--muted)); font: var(--text-body-sm); }
    .link { display: block; margin: var(--spacing-1) var(--spacing-2); font: var(--text-body-sm); color: hsl(var(--link)); }
    .frame-h { block-size: 10rem; max-inline-size: 100%; border: 1px solid hsl(var(--border)); border-radius: var(--radius-md); }
    .frame-v { block-size: 18rem; inline-size: min(24rem, 100%); border: 1px solid hsl(var(--border)); border-radius: var(--radius-md); }
    .pane { display: grid; place-items: center; min-block-size: 100%; padding: var(--spacing-3); font: var(--text-body-sm); }
    .carousel { inline-size: min(28rem, 100%); }
    .multi { --kx-carousel-item-size: calc((100% - 2 * var(--spacing-4)) / 3); }
    .slide { display: grid; place-items: center; aspect-ratio: 2 / 1; border: 1px solid hsl(var(--border)); border-radius: var(--radius-md); background: hsl(var(--muted)); font: var(--text-title-lg); }
    .slide.small { aspect-ratio: 1; }
    .slide.short { aspect-ratio: auto; block-size: 8rem; }
    .stack { display: flex; flex-direction: column; gap: var(--spacing-2); aspect-ratio: auto; padding: var(--spacing-4); font: var(--text-body-md); }
    .vertical { block-size: 16rem; }
    .v-view { block-size: 8rem; }
    .frame-cs { max-inline-size: 100%; }
    .lc-frame { inline-size: min(16rem, 100%); }
    .lc-carousel { inline-size: min(14rem, 100%); }
    .layer { display: grid; place-items: center; block-size: 100%; font: var(--text-body-sm); }
    .before { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); }
    .after { background: hsl(var(--accent)); color: hsl(var(--foreground)); }
  `,
})
export class LayoutFixture {
  protected readonly region = new URLSearchParams(globalThis.location?.search ?? '').get('region');
  protected readonly tags = Array.from({ length: 30 }, (_, i) => `Tag ${i + 1}`);
  protected readonly twelve = Array.from({ length: 12 }, (_, i) => i + 1);
  protected readonly sixty = Array.from({ length: 60 }, (_, i) => i + 1);
  protected readonly five = [1, 2, 3, 4, 5];
  protected readonly three = [1, 2, 3];
  protected readonly round = (v: number) => Math.round(v);

  protected readonly grow = signal(2);
  protected readonly rows = () => Array.from({ length: this.grow() }, (_, i) => i + 1);
  protected readonly tallBox = signal(false);

  protected readonly narrow = signal(false);
  protected readonly handleDisabled = signal(false);
  protected readonly hLayout = signal('50,50');
  protected readonly vLayout = signal('25,50,25');
  protected readonly hCount = signal(0);
  protected onLayout(layout: number[]): void {
    this.hLayout.set(layout.map(this.round).join(','));
    this.hCount.update((n) => n + 1);
  }

  basicIndex = 0;
  loopIndex = 0;
  verticalIndex = 0;
  protected readonly clicks = signal(0);

  split = 50;
  protected readonly mounted = signal(true);
  protected readonly csNarrow = signal(false);
}
