import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsToc } from "@/components/docs-toc";
import { DocsPager } from "@/components/docs-pager";
import { DocsBreadcrumb } from "@/components/docs-breadcrumb";
import { DocsPageActions } from "@/components/docs-page-actions";
import { RelatedComponents } from "@/components/related-components";
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

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-screen-2xl gap-8 px-4 sm:px-6 lg:px-8">
      <DocsSidebar />
      <div className="min-w-0 flex-1 py-10 xl:flex xl:gap-8">
        <article data-docs-content className="min-w-0 max-w-3xl flex-1">
          <div
            data-docs-chrome
            className="mb-8 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border pb-4"
          >
            <DocsBreadcrumb />
            <DocsPageActions />
          </div>
          {children}
          <BusinessContext contexts={businessContexts()} blocks={blocksByComponent()} />
          <RelatedComponents />
          <DocsPager />
        </article>
        <DocsToc />
      </div>
    </div>
  );
}
