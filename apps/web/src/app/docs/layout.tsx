import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsToc } from "@/components/docs-toc";
import { DocsPager } from "@/components/docs-pager";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-screen-2xl gap-8 px-4 sm:px-6 lg:px-8">
      <DocsSidebar />
      <div className="min-w-0 flex-1 py-10 xl:flex xl:gap-8">
        <article
          data-docs-content
          className={[
            "min-w-0 max-w-3xl flex-1",
            "[&_h1]:mb-3 [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-[-0.02em]",
            "[&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold",
            "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold",
            "[&_p]:leading-relaxed [&_:not(pre)>code]:font-mono",
          ].join(" ")}
        >
          {children}
          <DocsPager />
        </article>
        <DocsToc />
      </div>
    </div>
  );
}
