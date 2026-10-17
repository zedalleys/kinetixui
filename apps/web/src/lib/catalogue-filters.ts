/**
 * URL filter helpers shared by the /components and /blocks galleries.
 *
 * They live here rather than in component-gallery.tsx so /blocks can use them without pulling the component catalogue
 * (componentDocs, the demo registry) into its bundle.
 */
import { PLATFORMS, PLATFORM_DEFINITIONS, type Platform } from "./platform-parity";
import type { FacetOption } from "./business-discovery";

/**
 * The `?platform=` value, resolved against every implementation platform — web and native.
 *
 * The filter used to iterate the native platforms only, so React and Angular could not be chosen and
 * `?platform=Angular` was silently ignored. The URL keeps the manifest key (`Compose`, not "Jetpack Compose"), so
 * links shared before this change still resolve; the chip shows the label. Anything else — a typo, an old or
 * invented platform — resolves to no filter rather than to an empty result or a thrown error.
 */
export function resolvePlatformParam(value: string | null): Platform | null {
  return PLATFORMS.find((p) => p === value) ?? null;
}

/** "Angular · Preview" — the chip label, with a non-stable package's maturity carried rather than dropped. */
export function platformChipLabel(p: Platform): string {
  const d = PLATFORM_DEFINITIONS[p];
  return d.maturity === "stable" ? d.label : `${d.label} · ${d.maturity.charAt(0).toUpperCase()}${d.maturity.slice(1)}`;
}

/** `?capability=` / `?domain=` / `?layer=`, resolved against the options the facets offer; anything else is no filter. */
export function resolveFacetParam(value: string | null, options: FacetOption[]): FacetOption | null {
  return options.find((o) => o.id === value) ?? null;
}

