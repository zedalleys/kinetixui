import Link from "next/link";
import { COMPONENT_EDITORIAL } from "@/lib/component-editorial";
import { componentName } from "@/lib/seo";
import { DocsH2, DocsH3 } from "./docs-heading";

const entry = (slug: string) => {
  const e = COMPONENT_EDITORIAL[slug];
  // A page that asks for editorial copy it does not have is a build error, not a silently empty section.
  if (!e) throw new Error(`<ComponentGuide>: no COMPONENT_EDITORIAL entry for "${slug}"`);
  return e;
};

/**
 * The lead paragraph of an edited component page: what the component is, in practical terms. The same sentence is
 * the page's search description (`componentMetadata`), so the snippet and the first thing a reader sees agree.
 * Server-rendered text; no client JavaScript.
 */
export function ComponentIntro({ slug }: { slug: string }) {
  return (
    <p data-component-intro className="leading-relaxed [&:not(:first-child)]:mt-5">
      {entry(slug).summary}
    </p>
  );
}

/**
 * "When to use it", and when a sibling fits better, from `COMPONENT_EDITORIAL`. Each alternative links the sibling's
 * own page with its name as the link text. Accessibility notes appear only where an entry carries one, and an entry
 * only carries one that a named test asserts.
 */
export function ComponentGuide({ slug }: { slug: string }) {
  const e = entry(slug);
  const name = componentName(slug);
  return (
    <section data-component-guide aria-labelledby="when-to-use">
      <DocsH2 id="when-to-use">When to use it</DocsH2>
      <ul className="my-5 ml-6 list-disc [&>li]:mt-2">
        {e.useWhen.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {e.instead?.length ? (
        <>
          <DocsH3 id="choosing-an-alternative">When to choose something else</DocsH3>
          <ul data-component-alternatives className="my-5 ml-6 list-disc [&>li]:mt-2">
            {e.instead.map((alt) => (
              <li key={alt.slug}>
                <Link href={`/docs/components/${alt.slug}`} className="font-medium text-primary underline underline-offset-4">
                  {componentName(alt.slug)}
                </Link>{" "}
                {alt.when}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {e.accessibility ? (
        <>
          <DocsH3 id="accessibility-notes">Accessibility notes</DocsH3>
          <p className="leading-relaxed">
            {e.accessibility}{" "}
            <span className="text-muted-foreground">
              Evidence for {name} on each platform is in the Platforms row above.
            </span>
          </p>
        </>
      ) : null}
    </section>
  );
}
