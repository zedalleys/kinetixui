import type { SVGProps } from "react";

/**
 * KinetixUI Kinetic Weave brand symbol. The mark is decorative when placed
 * beside a readable wordmark. All geometry is vector and scales down to 16px.
 * Identity colors are deliberately independent of consumer-facing theme tokens.
 * Keep the reusable DTCG component color contract separate from the marketing brand.
 */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id="kx-brand-stem" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#7869FF" />
          <stop offset="1" stopColor="#6054F4" />
        </linearGradient>
        <linearGradient id="kx-brand-cross" x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#6054F4" />
          <stop offset="1" stopColor="#BA95FF" />
        </linearGradient>
        <linearGradient id="kx-brand-leg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#2795F3" />
          <stop offset="1" stopColor="#28C7D9" />
        </linearGradient>
      </defs>
      <rect x="14" y="12" width="21" height="76" rx="10.5" fill="url(#kx-brand-stem)" />
      <path d="M38 50 L79 82" stroke="url(#kx-brand-leg)" strokeWidth="22" strokeLinecap="round" />
      <path d="M22 78 L78 21" stroke="url(#kx-brand-cross)" strokeWidth="22" strokeLinecap="round" />
    </svg>
  );
}
