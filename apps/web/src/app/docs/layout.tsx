import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsToc } from "@/components/docs-toc";
import { DocsPager } from "@/components/docs-pager";
import { DocsBreadcrumb } from "@/components/docs-breadcrumb";
import { DocsPageActions } from "@/components/docs-page-actions";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-screen-2xl gap-8 px-4 sm:px-6 lg:px-8">
      <DocsSidebar />
      <div className="min-w-0 flex-1 py-10 xl:flex xl:gap-8">
        <article data-docs-content className="min-w-0 max-w-3xl flex-1">
          <div
            data-docs-chrome
            className="mb-8 flex items-start justify-between gap-4 border-b border-border pb-4"
          >
            <DocsBreadcrumb />
            <DocsPageActions />
          </div>
          {children}
          <DocsPager />
        </article>
        <DocsToc />
      </div>
    </div>
  );
}
