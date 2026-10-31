import { npmPackageUrl } from "@/lib/packages";
import angularPackage from "../../../../packages/ui-angular/package.json";
import cliPackage from "../../../../packages/cli/package.json";
import iotPackage from "../../../../packages/iot/package.json";
import tokensPackage from "../../../../packages/tokens/package.json";
import uiPackage from "../../../../packages/ui/package.json";

/**
 * The version of each package, read from that package's own package.json.
 *
 * A setup page that does not say which version it describes leaves the reader to guess whether the
 * instructions are current, and a version typed into prose is wrong the first time anything releases. This
 * is derived for the same reason `packages.ts` derives the names: a release moves it with no edit here.
 *
 * It is the version in **this repository**, which is the version the next release publishes — not
 * necessarily the one on npm this minute. The sentence around it says so rather than implying otherwise:
 * a published-version claim belongs to the registry, not to a file in the tree.
 */
const VERSIONS: Record<string, string> = {
  [uiPackage.name]: uiPackage.version,
  [tokensPackage.name]: tokensPackage.version,
  [cliPackage.name]: cliPackage.version,
  [angularPackage.name]: angularPackage.version,
  [iotPackage.name]: iotPackage.version,
};

export function PackageVersions({ names }: { names: string[] }) {
  const rows = names.flatMap((name) => (VERSIONS[name] ? [{ name, version: VERSIONS[name]!, href: npmPackageUrl(name) }] : []));
  if (rows.length === 0) return null;
  return (
    // The gap between packages has to beat the word space that joins a name to its version, or the row
    // reads as six loose items instead of three pairs. gap-x-5 is ~20px against a ~4px space.
    <span className="flex min-w-0 flex-wrap gap-x-5 gap-y-1 font-sans text-sm text-muted-foreground">
      {rows.map(({ name, version, href }) => (
        <span key={name} className="min-w-0 [overflow-wrap:anywhere]">
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              {name}
            </a>
          ) : (
            name
          )}{" "}
          <code dir="ltr" className="text-foreground">
            {version}
          </code>
        </span>
      ))}
    </span>
  );
}
