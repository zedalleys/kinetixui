/** Hex <-> RGB/HSL conversion and WCAG contrast — no dependency. */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  (r /= 255), (g /= 255), (b /= 255);
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
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relLuminance(hexToRgb(hexA)) + 0.05;
  const lb = relLuminance(hexToRgb(hexB)) + 0.05;
  return la > lb ? la / lb : lb / la;
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
