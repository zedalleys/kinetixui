import { IotExampleShowcase } from "@/components/iot/example-showcase";
import { iotExample } from "@/lib/iot-examples";
import { iotPreviews } from "@/registry/iot-previews";

/**
 * One IoT example, by slug: its metadata from the manifest, its code from the extracted source, and
 * its preview rendered here.
 *
 * A **server** component, which is the point. `IotExampleShowcase` is a client component because tabs
 * need state, but the preview is passed to it as `children` — already rendered — so a static example
 * stays on the server and only the tab chrome ships as JavaScript. The interactive examples bring
 * their own `"use client"` because they are genuinely interactive; the rest do not become client
 * components merely by being displayed in a tab.
 *
 * An unknown slug renders nothing rather than throwing: `iot-examples.test.ts` already fails the
 * build for a slug with no preview or no manifest entry, so reaching this branch means a broken
 * checkout, and taking the whole page down for it helps nobody.
 */
export function IotExample({ slug }: { slug: string }) {
  const example = iotExample(slug);
  const Preview = iotPreviews[slug];
  if (!example || !Preview) return null;

  return (
    <IotExampleShowcase
      slug={example.slug}
      title={example.title}
      description={example.description}
      uses={example.uses}
      path={example.path}
      code={example.source}
    >
      <Preview />
    </IotExampleShowcase>
  );
}
