/**
 * The guides' reading column: one article, no docs sidebar or table of contents, so a long guide reads as an article
 * at any width. MDX headings and paragraphs are styled by mdx-components.tsx like the docs.
 */
export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <article data-guide className="min-w-0">
        {children}
      </article>
    </div>
  );
}
