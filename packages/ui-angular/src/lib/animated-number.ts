import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';

/** No initial count-up. One accessible target, independently from the visual frames. SSR-safe. */
@Component({
  selector: 'kx-animated-number',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span aria-hidden="true">{{ format()(display()) }}</span><span class="kx-sr-only">{{ format()(value()) }}</span>',
  styles: '.kx-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
})
export class KxAnimatedNumber {
  readonly value = input.required<number>();
  readonly format = input<(value: number) => string>((v) => String(Math.round(v)));
  readonly display = signal(0);
  private current: number | undefined;

  constructor() {
    effect((cleanup) => {
      const value = this.value();
      const from = this.current ?? value;
      if (typeof window === 'undefined') { this.display.set(value); this.current = value; return; }
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const css = getComputedStyle(document.documentElement).getPropertyValue('--duration-base').trim();
      const parsed = parseFloat(css);
      const duration = Number.isFinite(parsed) ? parsed * (css.endsWith('ms') ? 1 : 1000) : 300;
      let frame = 0;
      let start: number | undefined;
      const finish = () => { cancelAnimationFrame(frame); this.current = value; this.display.set(value); };
      const tick = (time: number) => {
        start ??= time;
        const progress = duration > 0 ? Math.min(1, (time - start) / duration) : 1;
        this.current = progress === 1 ? value : from * (1 - progress) + value * progress;
        this.display.set(this.current);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      const preference = () => { if (media.matches) finish(); };
      const hidden = () => { if (document.hidden) finish(); };
      media.addEventListener('change', preference);
      document.addEventListener('visibilitychange', hidden);
      if (media.matches || document.hidden || !Number.isFinite(value) || !Number.isFinite(from) || from === value) finish();
      else frame = requestAnimationFrame(tick);
      cleanup(() => { cancelAnimationFrame(frame); media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', hidden); });
    });
  }
}
