import type * as React from "react";

/**
 * Generic inline glyphs for the three reference environments, keyed by environment id. Not brand marks.
 *
 * A plain module (no "use client"), so the server-rendered environment cards and the client tab switcher can
 * both draw the same glyph.
 */
const glyph = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const ENVIRONMENT_ICONS: Record<string, React.ReactNode> = {
  // a house
  "smart-space": glyph(<><path d="M4 11 12 4l8 7" /><path d="M6 10v9.5h12V10" /><path d="M10 19.5v-5h4v5" /></>),
  // a sprouting leaf
  agritech: glyph(<><path d="M12 20v-8" /><path d="M12 12c0-4 2.5-6.5 7-6.5 0 4.5-2.5 6.5-7 6.5Z" /><path d="M12 15c0-3-2-5-6-5 0 3.5 2 5 6 5Z" /></>),
  // a factory
  operations: glyph(<><path d="M3.5 20V9.5l5 3v-3l5 3v-3l5 3V20Z" /><path d="M18.5 12.5V5h2v8" /><path d="M7.5 16h.01M11.5 16h.01M15.5 16h.01" /></>),
};
