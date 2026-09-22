/**
 * Which native snippets on a component page are a COMPOSITION rather than a port.
 *
 * A few components are deliberately not on the native platforms. Their pages still carry a native tab, because
 * the useful answer to "how do I do this on Android?" is the composition those libraries expect — but an
 * unlabelled tab reads as "this component was ported", which is the opposite of true. This is what lets the
 * page say so. The data lives in `platform-code-compositions.json` at the repo root so
 * `scripts/check-platform-code.mjs` can read it from plain Node, and the check fails if a native snippet
 * exists for an unsupported platform without a declaration here.
 */
import data from "../../../../platform-code-compositions.json";
import type { Platform } from "@/registry/platform-code";

type Composition = { platforms: string[]; reason: string };
const compositions = data.compositions as Record<string, Composition>;

/** platform-code.ts tab key → the manifest platform name. */
const MANIFEST_PLATFORM: Record<Platform, string | null> = {
  react: null,
  swift: "SwiftUI",
  kotlin: "Compose",
  dart: "Flutter",
};

/**
 * The reason this demo's snippet is a composition on `platform`, or null when it is a real port. Callers show
 * the reason next to the code; there is deliberately no generic fallback string, because a composition with no
 * explanation is the thing this exists to prevent.
 */
export function compositionReason(demoKey: string, platform: Platform): string | null {
  const entry = compositions[demoKey];
  const name = MANIFEST_PLATFORM[platform];
  if (!entry || !name || !entry.platforms.includes(name)) return null;
  return entry.reason;
}
