/**
 * Hex <-> RGB/HSL conversion and WCAG contrast — no dependency.
 *
 * The one implementation. `packages/cli/src/lib/color-math.ts` used to be a hand-synced 1:1 port of this
 * file, kept in step by a comment asking the next person to remember; it now re-exports from here, so
 * `kinetixui theme build` and the /create workspace cannot disagree about what a contrast ratio is.
 */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

/** "h s% l%" — the exact shape the token pipeline stores channels in (for hsl(var(--x))). */
export function hexToHslChannels(hex: string): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return `${h} ${s}% ${l}%`;
}

function relLuminance([r, g, b]: [number, number, number]) {
  const linear = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relLuminance(hexToRgb(hexA)) + 0.05;
  const lb = relLuminance(hexToRgb(hexB)) + 0.05;
  return la > lb ? la / lb : lb / la;
}

/** "h s% l%" back to a hex — the inverse of `hexToHslChannels`, rounding included. */
export function hslChannelsToHex(channels: string): string {
  const [h = 0, s = 0, l = 0] = channels.trim().split(/\s+/).map((v) => parseFloat(v));
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;

  const sector = Math.floor((((h % 360) + 360) % 360) / 60);
  const rgb = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector]!;

  return `#${rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The contrast a consumer is guaranteed, whatever an exporter's output precision does to the colour.
 *
 * A theme is authored in hex and rendered through a format. The web's is `hsl(var(--x))`, which
 * `hexToHslChannels` rounds to whole degrees and whole percent — the shape @kinetixui/ui expects and the
 * shape the token pipeline stores. That rounding costs up to 0.37 of a contrast ratio. SwiftUI's is
 * `Color(red:green:blue:)` at three decimal places, which is near-exact.
 *
 * Neither is the answer on its own, and picking one is how this went wrong twice while being written.
 * Judging on the exact hex alone let 3.7% of pairs land below AA on screen, because the web rounds away
 * the margin. Judging on the rounded value alone let a pair reach 4.5 only BECAUSE the rounding happened
 * to help, which put the same pair at 4.46 in SwiftUI, where it does not.
 *
 * So the bar is the worse of the two. A pair that clears it clears AA as CSS and as Swift, and would
 * clear it in a third format that rounds differently again — which is the point of a guarantee living in
 * a platform-neutral engine rather than in each exporter.
 */
export function guaranteedContrast(hexA: string, hexB: string): number {
  const exact = contrastRatio(hexA, hexB);
  const asCss = contrastRatio(hslChannelsToHex(hexToHslChannels(hexA)), hslChannelsToHex(hexToHslChannels(hexB)));
  return Math.min(exact, asCss);
}

/** Whichever of white/black reads better on this background. */
export function bestTextHex(bgHex: string): "#ffffff" | "#000000" {
  return contrastRatio(bgHex, "#ffffff") >= contrastRatio(bgHex, "#000000") ? "#ffffff" : "#000000";
}

export function isHex(v: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(v.trim());
}

export function normalizeHex(v: string): string {
  const t = v.trim().replace(/^#/, "");
  return `#${t.toLowerCase()}`;
}
