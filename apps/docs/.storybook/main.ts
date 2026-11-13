import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: [
    "../../../packages/ui/src/**/*.mdx",
    "../../../packages/ui/src/**/*.stories.@(ts|tsx)",
    // @kinetixui/iot's patterns. Hand-written, unlike the `packages/ui` stories, which
    // `scripts/gen-stories.mjs` generates from the demo registry and whose directory it owns —
    // a hand-written file there is reported as an orphaned story. These also join the real-browser
    // axe sweep automatically: `scripts/a11y-browser.mjs` scans every story in the built index.
    "../../../packages/iot/src/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    // addon-essentials is built into the core `storybook` package from v9 on
    "@storybook/addon-themes",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // The demos (and the stories generated from them) reference `/img/...`, which
  // Next serves from `apps/web/public`. `apps/docs` has no `public/` of its
  // own, so without this mapping those paths 404 in Storybook — and the axe
  // sweep in `scripts/a11y-browser.mjs` would read a story with no image. Only
  // `img` is mapped: `apps/web/public` also holds the registry and the footer
  // artwork, which Storybook has no use for.
  staticDirs: [{ from: "../../web/public/img", to: "/img" }],
  core: { disableTelemetry: true },
};

export default config;
