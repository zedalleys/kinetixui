import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";

// Token contract — light in :root, dark under .dark
import "@strata/tokens/css";
import "@strata/tokens/css/dark";
// Tailwind utilities layer for the stories
import "./tailwind.css";

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: {
      storySort: { order: ["Foundations", "Controls & Actions", "Form Inputs", "*"] },
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
