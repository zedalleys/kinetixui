import Link from "next/link";
import { PLATFORM_DEFINITIONS, type Platform } from "@/lib/platform-parity";
import { platformIdForManifest } from "@/lib/platform-preference";

const link = "font-medium text-primary underline underline-offset-4";

/** Where each setup page keeps its own theming and gap sections. Only anchors the page really has. */
const PAGE_SECTIONS: Record<Exclude<Platform, "React">, { theme: string; gaps: { href: string; label: string } }> = {
  Angular: { theme: "/docs/theming", gaps: { href: "#what-is-left-by-wave", label: "What is left, by wave" } },
  SwiftUI: { theme: "#a-custom-theme", gaps: { href: "#known-gaps", label: "Known gaps" } },
  Compose: { theme: "#a-custom-theme", gaps: { href: "#known-gaps", label: "Known gaps" } },
  Flutter: { theme: "#a-custom-theme", gaps: { href: "#known-gaps", label: "Known gaps" } },
};

/**
 * The step after a platform's first working sample, so a reader who just saw it run is not left at the bottom of a
 * code block (BD-W4 F-03). Each link opens on the same platform: the gallery filters by the manifest key, and
 * `/blocks` reads `?platform=` through the shared platform store without saving it. React's next steps are the
 * Installation page's own list.
 */
export function FirstUseNextSteps({ platform }: { platform: Exclude<Platform, "React"> }) {
  const def = PLATFORM_DEFINITIONS[platform];
  const id = platformIdForManifest(platform);
  const { theme, gaps } = PAGE_SECTIONS[platform];
  return (
    <div data-first-use-next={platform} className="my-6">
      <p className="font-medium text-foreground">Once that works</p>
      <ul className="mt-2 list-disc space-y-1 ps-6">
        <li>
          <Link href={theme} className={link}>
            Apply your own colours
          </Link>{" "}
          without forking components.
        </li>
        <li>
          <Link href={`/components?platform=${platform}`} className={link}>
            Browse the components that ship on {def.label}
          </Link>
          ; each page shows its {def.label} code and how it is verified.
        </li>
        <li>
          <Link href={`/blocks?platform=${id}`} className={link}>
            Assemble a screen from blocks
          </Link>{" "}
          with their {def.label} code.
        </li>
        <li>
          Before you plan around a component, read{" "}
          <Link href={gaps.href} className={link}>
            {gaps.label}
          </Link>
          .
        </li>
      </ul>
    </div>
  );
}
