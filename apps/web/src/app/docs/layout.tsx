import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsToc } from "@/components/docs-toc";
import { DocsPager } from "@/components/docs-pager";
import { DocsBreadcrumb } from "@/components/docs-breadcrumb";
import { DocsPageActions } from "@/components/docs-page-actions";
import { RelatedComponents } from "@/components/related-components";

/**
 * Three columns: the docs sidebar, the article, and the table of contents.
 *
 * The two rails are sized in `rem` (`w-56`) and so grow with the reader's default font size, which is right — a
 * 14rem rail of 32px text is as readable as a 14rem rail of 16px text. What was wrong is the question that decided
 * whether to show them. `lg`/`xl` are `1024px`/`1280px`, and a `px` media query cannot see that the reader has
 * doubled their text, so the layout committed to three columns on a 1280px screen while both rails doubled
 * underneath that commitment. Measured in Chromium at 1280px with a 32px default font size:
 *
 *     sidebar 448px   article 128px   table of contents 448px
 *
 * A 128px column of 32px text is about four characters a line, so the documentation a reader with large text is
 * trying to read gets the narrowest third of the page while its two navigation rails take the rest. At 1024px the
 * same reader also got 37px of horizontal page scroll on component pages.
 *
 * `lg-rem`/`xl-rem` ask the same question in the units the rails are sized in — see the `screens` note in
 * `apps/web/tailwind.config.ts`, and `/create`, which was repaired the same way. At the default text size they
 * resolve to exactly `lg` and `xl`, so nothing moves for a reader who has not changed it; above it the rails drop
 * away in order and the article takes the width, which is the composition the page should have had all along.
 * The mobile menu is gated on `lg-rem` too (`menuBreakpointClass`), so the sidebar's navigation is never absent.
 *
 * The outer cap moves with them, and for the same reason. `max-w-screen-2xl` is a flat `1536px`: once all three
 * rem-sized columns are shown it cannot hold them, and the row is divided inside a container that did not grow.
 * Measured at 2560px with a 32px root, which is where `xl-rem` brings the table of contents back:
 *
 *     sidebar 448px   article 384px   table of contents 448px
 *
 * — the same defect this file exists to fix, one breakpoint further out. `96rem` is `1536px` at the default text
 * size, so the cap is unchanged for a reader who has not enlarged theirs, and grows with the columns for one who
 * has. The same view then measures a 1408px article.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[96rem] gap-8 px-4 sm:px-6 lg:px-8">
      <DocsSidebar />
      <div className="min-w-0 flex-1 py-10 xl-rem:flex xl-rem:gap-8">
        <article data-docs-content className="min-w-0 max-w-3xl flex-1">
          <div
            data-docs-chrome
            className="mb-8 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border pb-4"
          >
            <DocsBreadcrumb />
            <DocsPageActions />
          </div>
          {children}
          <RelatedComponents />
          <DocsPager />
        </article>
        <DocsToc />
      </div>
    </div>
  );
}
