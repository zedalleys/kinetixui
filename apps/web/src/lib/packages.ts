/**
 * The public KinetixUI npm packages, read from each package's own package.json — so a rename or a new package is
 * one edit where it belongs, and analytics never carries a hand-typed package name.
 */
import cliPackage from "../../../../packages/cli/package.json";
import tokensPackage from "../../../../packages/tokens/package.json";
import uiPackage from "../../../../packages/ui/package.json";

export const PACKAGES = { ui: uiPackage.name, tokens: tokensPackage.name, cli: cliPackage.name } as const;

/** Every public package name, for recognising one in a command or a link. */
export const PACKAGE_NAMES: readonly string[] = Object.values(PACKAGES);
