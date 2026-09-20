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

/**
 * Content-Security-Policy. The site is fully static (no route handlers, no
 * middleware), so there's no request to mint a per-response nonce — `script-src`
 * therefore keeps `'unsafe-inline'` for Next's hydration bootstrap and
 * `style-src` keeps it for Recharts' inline <style> and rehype-pretty-code.
 * Everything else is locked to same-origin; the only third parties are
 * api.github.com (the star-count fetch) and remote <img> hosts.
 *
 * Development only: `next dev` compiles with eval-based source maps and hot-reloads over a
 * WebSocket, so with the production policy NO client JavaScript runs under `next dev` (the
 * page renders, nothing hydrates). Dev therefore adds `'unsafe-eval'` and `ws:`. The production
 * policy is unchanged — a build never emits either.
 */
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://api.github.com${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// The component registry (public/r/*.json) is meant to be fetched dynamically
// by the CLI and by third-party tools — a v0-style builder, another site's
// live playground — from the browser. Scoped to /r/* only: nothing else on
// the site needs to loosen CORS.
const registryCorsHeaders = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["@kinetixui/ui", "@kinetixui/tokens"],
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  poweredByHeader: false,
  experimental: { mdxRs: false },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/r/:path*", headers: registryCorsHeaders },
    ];
  },
};

export default withMDX(nextConfig);
