import createMDX from "@next/mdx";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

/** @type {import('rehype-pretty-code').Options} */
const prettyCodeOptions = {
  theme: { dark: "github-dark", light: "github-light-default" },
  keepBackground: false,
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, [rehypePrettyCode, prettyCodeOptions]],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["@kinetixui/ui", "@kinetixui/tokens"],
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  experimental: { mdxRs: false },
};

export default withMDX(nextConfig);
