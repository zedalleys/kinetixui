import { siteConfig } from "@/lib/site";

/**
 * schema.org JSON-LD for the home page only — one description of the site, not a block repeated on every
 * page saying the same thing.
 *
 * Every field is something the repository can prove: the name, the canonical URL, the source repository, the
 * MIT licence (LICENSE at the repo root) and the current version (read from `@kinetixui/ui`'s package.json
 * through siteConfig, so a release updates it and it can never go stale).
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
        "@type": "SoftwareApplication",
        "@id": `${siteConfig.url}/#software`,
        name: siteConfig.name,
        url: siteConfig.url,
        applicationCategory: "DeveloperApplication",
        description: siteConfig.description,
        softwareVersion: siteConfig.version,
        license: "https://opensource.org/licenses/MIT",
        codeRepository: siteConfig.repo,
        // The packages run wherever their toolchain does; "any" is the honest answer for a library.
        operatingSystem: "Any",
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
