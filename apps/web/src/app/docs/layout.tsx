import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsToc } from "@/components/docs-toc";
import { DocsPager } from "@/components/docs-pager";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-screen-2xl gap-8 px-4 sm:px-6 lg:px-8">
      <DocsSidebar />
      <div className="min-w-0 flex-1 py-8 xl:flex xl:gap-8">
        <article
          data-docs-content
          className="min-w-0 max-w-3xl flex-1 [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight"
        >
          {children}
          <DocsPager />
        </article>
        <DocsToc />
      </div>
    </div>
  );
}
