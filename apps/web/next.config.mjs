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
 * api.github.com (the star-count fetch), remote <img> hosts and — when configured — the analytics ingest origin.
 *
 * Development only: `next dev` compiles with eval-based source maps and hot-reloads over a
 * WebSocket, so with the production policy NO client JavaScript runs under `next dev` (the
 * page renders, nothing hydrates). Dev therefore adds `'unsafe-eval'` and `ws:`. The production
 * policy is unchanged — a build never emits either.
 */
const isDev = process.env.NODE_ENV !== "production";

/**
 * The PostHog ingest origin, allowed in `connect-src` only when NEXT_PUBLIC_POSTHOG_HOST is set for the build
 * (analytics is off otherwise, so there is nothing to allow). Only an https origin is accepted — never a path,
 * never a wildcard. The SDK's external script loading is disabled (see lib/analytics-posthog.ts), so this is
 * the only CSP change analytics needs.
 */
const posthogOrigin = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "");
    return url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
})();

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
  `connect-src 'self' https://api.github.com${posthogOrigin ? ` ${posthogOrigin}` : ""}${isDev ? " ws: wss:" : ""}`,
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

/**
 * Routes Create replaced, and where they go.
 *
 * `/colors` and `/theme-builder` were two separate product destinations for one job. Create is that job,
 * so both are permanent (308): the pages are not coming back, and a permanent redirect is what tells a
 * search engine to transfer the old URLs rather than keep indexing two builders. The reference material
 * that used to live on `/colors` moved to `/docs/colors`, which is a docs page, not a second builder —
 * `/colors` still points at Create because that is what someone opening it was looking for.
 *
 * Exported so a test can assert the mapping without booting a server; there is no other redirect
 * mechanism in play (no middleware, no route handlers).
 */
export const routeRedirects = [
  { source: "/colors", destination: "/create", permanent: true },
  { source: "/theme-builder", destination: "/create", permanent: true },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["@kinetixui/ui", "@kinetixui/tokens", "@kinetixui/create-preset", "@kinetixui/create-theme"],
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  poweredByHeader: false,
  experimental: { mdxRs: false },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/r/:path*", headers: registryCorsHeaders },
    ];
  },
  async redirects() {
    return routeRedirects;
  },
};

export default withMDX(nextConfig);
