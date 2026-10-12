import { PLATFORM_LOGOS } from "@/components/platform-logo";
import { PLATFORMS, type Platform } from "@/lib/platform-parity";
import { cn } from "@/lib/utils";

/**
 * The platform marks, defined once per page and referenced everywhere else.
 *
 * The homepage names each platform beside its mark in four places (the platform ticker, the hero map, the
 * implementation explorer, the token pipeline). Inlining `PlatformLogo` there repeated every glyph's path data
 * thirty-five times over (the ticker alone draws each mark seven times to loop), about 1.5 KB each in the HTML. `PlatformMarkSprite` renders each path once as a `<symbol>`; `PlatformMark` draws it
 * with `<use>`. Same 24×24 glyphs and the same decorative contract as `PlatformLogo`: `currentColor`,
 * `aria-hidden`, never focusable, always beside the platform's name.
 */
export const markId = (platform: Platform) => `kx-mark-${platform}`;

export function PlatformMarkSprite() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute size-0 overflow-hidden">
      {PLATFORMS.map((p) => (
        <symbol key={p} id={markId(p)} viewBox="0 0 24 24">
          <path fill="currentColor" d={PLATFORM_LOGOS[p].path} />
        </symbol>
      ))}
    </svg>
  );
}

export function PlatformMark({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      data-platform-logo={platform}
      className={cn("shrink-0", className)}
    >
      <use href={`#${markId(platform)}`} />
    </svg>
  );
}
