/**
 * The public KinetixUI npm packages, read from each package's own package.json — so a rename or a new package is
 * one edit where it belongs, and analytics never carries a hand-typed package name.
 */
import angularPackage from "../../../../packages/ui-angular/package.json";
import cliPackage from "../../../../packages/cli/package.json";
import iotPackage from "../../../../packages/iot/package.json";
import tokensPackage from "../../../../packages/tokens/package.json";
import uiPackage from "../../../../packages/ui/package.json";

export const PACKAGES = {
  ui: uiPackage.name,
  angular: angularPackage.name,
  tokens: tokensPackage.name,
  cli: cliPackage.name,
  iot: iotPackage.name,
} as const;

/** Every public package name, for recognising one in a command or a link. */
export const PACKAGE_NAMES: readonly string[] = Object.values(PACKAGES);

/**
 * The npm page for one of our public packages, or null for anything else. Only names read from a package.json
 * above can get a link, so the site never points at a registry page for a package that is not published there
 * (the native ports have no npm package and get none). A click on it is reported as `npm_clicked`.
 */
export function npmPackageUrl(name: string): string | null {
  return PACKAGE_NAMES.includes(name) ? `https://www.npmjs.com/package/${name}` : null;
}
