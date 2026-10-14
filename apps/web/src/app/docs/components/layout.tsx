import { BusinessContext } from "@/components/business-context";
import { businessContexts } from "@/lib/business-discovery";
import { blockComponents } from "@/lib/block-components";
import { blocks } from "@/lib/blocks";

/**
 * Component slug → the blocks whose React source imports it, inverted from `blockComponents()` (which reads the block
 * files themselves). Computed here, on the server, with the business contexts, so neither reaches the client bundle.
 */
function blocksByComponent(): Record<string, { slug: string; title: string }[]> {
  const out: Record<string, { slug: string; title: string }[]> = {};
  const uses = blockComponents();
  for (const b of blocks) for (const slug of uses[b.slug] ?? []) (out[slug] ??= []).push({ slug: b.slug, title: b.title });
  return out;
}

/**
 * Component pages only: the "In applications" footer after the page's own content (and before the docs layout's
 * Related components). A layout of its own so the business data is sent with component pages, not with every docs page.
 */
export default function ComponentPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BusinessContext contexts={businessContexts()} blocks={blocksByComponent()} />
    </>
  );
}
