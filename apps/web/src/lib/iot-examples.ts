/**
 * The IoT examples the site publishes, read from the manifest rather than listed again here.
 *
 * Deliberately separate from `lib/blocks.ts`. A published Block carries every platform in
 * `components.manifest.json`, enforced by `scripts/check-block-source.mjs`; `@kinetixui/iot` is
 * React-only, so an IoT composition could join that catalogue only by making a claim that is not
 * true or by taking the `draft` status the site never renders. The Blocks parity rule exists to stop
 * the catalogue drifting back into "React, with four platforms sprinkled on", and weakening it to fit
 * a React-only module would be exactly that drift. So IoT states its own scope in its own manifest,
 * and nothing here touches the Blocks numbers.
 */
import manifest from "../../../../iot-examples.manifest.json";
import { iotExampleSource } from "@/registry/iot-examples.generated";

export type IotExample = {
  slug: string;
  title: string;
  description: string;
  /** The `@kinetixui/iot` components this composition is built from. */
  uses: readonly string[];
  /** The extracted source, exactly as the preview renders it. */
  source: string;
  /** Repository-relative path to the file that is both the preview and the snippet. */
  path: string;
};

const entries = manifest.examples as Record<
  string,
  { title: string; description: string; uses: string[]; source: string }
>;

/** Manifest order is page order — deterministic, not alphabetical by accident. */
export const IOT_EXAMPLES: readonly IotExample[] = Object.entries(entries).map(([slug, entry]) => ({
  slug,
  title: entry.title,
  description: entry.description,
  uses: entry.uses,
  path: entry.source,
  // `gen:iot-examples` writes a snippet for every manifest entry and `check:iot-examples` fails if it
  // is stale, so a missing key here is a broken checkout rather than a case to render around.
  source: iotExampleSource[slug] ?? "",
}));

export const iotExample = (slug: string): IotExample | undefined =>
  IOT_EXAMPLES.find((example) => example.slug === slug);

/** Every distinct component the published examples compose, for the "what this is built from" line. */
export const IOT_EXAMPLE_COMPONENTS: readonly string[] = [
  ...new Set(IOT_EXAMPLES.flatMap((example) => example.uses)),
].sort();
