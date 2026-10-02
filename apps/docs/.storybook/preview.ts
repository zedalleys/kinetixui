import type { Preview } from "@storybook/react-vite";
import { withThemeByClassName } from "@storybook/addon-themes";

// Token contract — light in :root, dark under .dark
import "@kinetixui/tokens/css";
import "@kinetixui/tokens/css/dark";
// The shadow composites live in `extras`, not in `globals`, and every `shadow-*` utility in the
// preset resolves to `var(--shadow-*)`. Without these two the variables are undefined, so every
// `shadow-sm/md/lg/xl` AND every `focus-visible:shadow-focus` in the catalogue computed to
// `box-shadow: none` — in the one environment whose entire job is to show what the components
// look like. apps/web has imported all four since elevation tokens landed; this file never did.
import "@kinetixui/tokens/css/extras";
import "@kinetixui/tokens/css/extras/dark";
// Tailwind utilities layer for the stories
import "./tailwind.css";

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: {
      storySort: {
        order: [
          "Foundations",
          "Form Inputs",
          "Controls & Actions",
          "Navigation",
          "Overlays",
          "Feedback",
          "Data Display",
          "*",
        ],
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
    }),
  ],
};

export default preview;
