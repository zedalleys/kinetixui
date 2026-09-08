import type { Preview } from "@storybook/react-vite";
import { withThemeByClassName } from "@storybook/addon-themes";

// Token contract — light in :root, dark under .dark
import "@kinetixui/tokens/css";
import "@kinetixui/tokens/css/dark";
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
