import { IotExampleShowcase } from "@/components/iot/example-showcase";
import { LazyPreview } from "@/components/iot/lazy-preview";
import { iotExample } from "@/lib/iot-examples";
import { SIMULATION_DISCLOSURE, SIMULATION_LABEL } from "@/lib/iot-sim/labels";
import { IOT_PREVIEW_HEIGHT, IOT_PREVIEW_HEIGHT_DEFAULT, IOT_SIMULATED_SLUGS, iotStaticPreviews } from "@/registry/iot-previews";

/**
 * One IoT example, by slug: its metadata from the manifest, its code from the extracted source, and its
 * preview.
 *
 * A **server** component, which is the point. The heading, description, "built from" list and the whole
 * code tab are rendered here and arrive as HTML; `IotExampleShowcase` (a client component, because tabs need
 * state) receives them as already-rendered children. What varies is the preview:
 *
 * - a static example is rendered right here and costs the browser no JavaScript;
 * - an interactive one is a `LazyPreview` whose chunk loads when the section nears the viewport. Until then
 *   the reader gets a server-rendered placeholder that reserves the height and, for simulated examples,
 *   carries the SIMULATION notice. The placeholder is `aria-hidden` apart from that notice: a skeleton is
 *   not content and must not be announced.
 *
 * An unknown slug renders nothing rather than throwing: `iot-examples.test.ts` already fails the build for a
 * slug with no preview or no manifest entry, so reaching this branch means a broken checkout.
 */
export function IotExample({ slug }: { slug: string }) {
  const example = iotExample(slug);
  if (!example) return null;

  // Anything not rendered statically is an interactive example with a loader in `iot-preview-loaders.ts`;
  // `iot-examples.test.ts` checks that every manifest slug is one or the other.
  const Static = iotStaticPreviews[slug];

  const placeholder = (
    <div className={`flex flex-col gap-4 ${IOT_PREVIEW_HEIGHT[slug] ?? IOT_PREVIEW_HEIGHT_DEFAULT}`}>
      {IOT_SIMULATED_SLUGS.has(slug) ? (
        <div data-simulation-notice="" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label-sm text-muted-foreground">
          <span className="rounded-full border border-border px-2 py-0.5 text-label-sm font-medium uppercase tracking-wide text-foreground">
            {SIMULATION_LABEL}
          </span>
          <span className="min-w-0 break-words">{SIMULATION_DISCLOSURE}</span>
        </div>
      ) : null}
      <div
        aria-hidden="true"
        data-preview-placeholder=""
        className="min-h-24 flex-1 rounded-xl border border-dashed border-border bg-muted/40"
      />
      <noscript>
        <p className="text-sm text-muted-foreground">This live preview needs JavaScript. The source is in the Code tab.</p>
      </noscript>
    </div>
  );

  return (
    <IotExampleShowcase
      slug={example.slug}
      title={example.title}
      description={example.description}
      uses={example.uses}
      path={example.path}
      code={example.source}
    >
      {Static ? <Static /> : <LazyPreview slug={slug} fallback={placeholder} />}
    </IotExampleShowcase>
  );
}
