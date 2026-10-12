import { siteConfig } from "@/lib/site";
import { PLATFORMS, type Platform } from "@/lib/platform-parity";

/** The language each platform's implementation is written in. Typed by platform, so a sixth platform must say. */
const LANGUAGE: Record<Platform, string> = { React: "TypeScript", Angular: "TypeScript", SwiftUI: "Swift", Compose: "Kotlin", Flutter: "Dart" };

/**
 * schema.org JSON-LD for the home page only — one description of the site, not a block repeated on every
 * page saying the same thing.
 *
 * Every field is something the repository can prove: the name, the canonical URL, the source repository, the
 * MIT licence (LICENSE at the repo root) and the languages its platform implementations are written in.
 *
 * The project is described as `SoftwareSourceCode`, not `SoftwareApplication`: KinetixUI is an open-source
 * repository of libraries, not an installable application, and `codeRepository` and `programmingLanguage` are
 * properties of SoftwareSourceCode (schema.org lists neither on SoftwareApplication). There is no single version
 * to state either: `@kinetixui/ui`, `@kinetixui/angular` and the native ports are versioned separately.
 *
 * Deliberately absent: aggregateRating, review, downloads, price, employee/founding data and social profiles.
 * None of those are known, and inventing them is exactly what earns a structured-data penalty.
 */
export function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        inLanguage: "en",
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": `${siteConfig.url}/#source`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        codeRepository: siteConfig.repo,
        license: "https://opensource.org/licenses/MIT",
        programmingLanguage: [...new Set(PLATFORMS.map((p) => LANGUAGE[p]))],
        isAccessibleForFree: true,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // The object is built here from static config — no user input reaches it.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
