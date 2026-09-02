import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../components/button";

const VARIANTS = ["Primary", "Secondary", "Outline", "Destructive", "Ghost", "Link"] as const;
const SIZES = ["sm", "md", "lg", "icon"] as const;
const STATES = ["Default", "Hover", "Focus", "Active", "Disabled"] as const;

const meta = {
  title: "Controls & Actions/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Generated from Figma `Personal Design System` › UI Components › 02. Controls & Actions › Button (node 54863:351). 6 variants × 4 sizes × 5 states = 120 permutations, mirrored 1:1 from the Figma component properties.",
      },
    },
  },
  args: { children: "Button", variant: "Primary", size: "md", state: "Default" },
  argTypes: {
    variant: { control: "inline-radio", options: VARIANTS },
    size: { control: "inline-radio", options: SIZES },
    state: { control: "inline-radio", options: STATES },
    asChild: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---- interactive playground ---------------------------------------------- */
export const Playground: Story = {};

/* ---- every variant ----------------------------------------------------- */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

/* ---- every size ------------------------------------------------------- */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {SIZES.map((size) => (
        <Button key={size} {...args} size={size}>
          {size === "icon" ? "★" : `Size ${size}`}
        </Button>
      ))}
    </div>
  ),
};

/* ---- full matrix (mirrors the Figma component sheet) ------------------- */
export const Matrix: Story = {
  parameters: { layout: "padded" },
  render: (args) => (
    <table className="border-separate border-spacing-3 text-left align-middle">
      <thead>
        <tr>
          <th className="text-xs font-medium text-muted-foreground">variant \ state</th>
          {STATES.map((s) => (
            <th key={s} className="text-xs font-medium text-muted-foreground">
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {VARIANTS.map((variant) => (
          <tr key={variant}>
            <td className="text-xs font-medium text-muted-foreground">{variant}</td>
            {STATES.map((state) => (
              <td key={state}>
                <Button {...args} variant={variant} state={state}>
                  Button
                </Button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

/* ---- asChild (Radix Slot) ------------------------------------------------ */
export const AsChildLink: Story = {
  render: (args) => (
    <Button {...args} asChild variant="Link">
      <a href="https://figma.com" target="_blank" rel="noreferrer">
        Open Figma
      </a>
    </Button>
  ),
};

/* ---- multi-platform usage (rendered in the Docs tab) ------------------- */
export const CrossPlatformUsage: Story = {
  parameters: {
    docs: {
      source: {
        code: [
          "/* ── Web · React (@strata/ui) ────────────────────────────── */",
          '<Button variant="Primary" size="md">Save</Button>',
          "",
          "/* ── Web · HTML + CSS (token contract) ───────────────────── */",
          '<button class="strata-btn strata-btn--primary strata-btn--md">Save</button>',
          "/* uses --primary / --primary-foreground / --radius from globals.css */",
          "",
          "/* ── Angular (strata-button) ─────────────────────────────── */",
          '<button strata-button variant="primary" size="md">Save</button>',
          "",
          "/* ── Flutter (AppTheme) ──────────────────────────────────── */",
          "FilledButton(",
          "  style: FilledButton.styleFrom(",
          "    backgroundColor: AppColors.primary,",
          "    foregroundColor: AppColors.primaryForeground,",
          "    shape: RoundedRectangleBorder(",
          "      borderRadius: BorderRadius.circular(AppTheme.radius)),",
          "  ),",
          "  onPressed: onSave,",
          "  child: const Text('Save'),",
          ")",
          "",
          "/* ── iOS · SwiftUI (StrataTheme) ─────────────────────────── */",
          "Button('Save', action: save)",
          "  .padding(.horizontal, 16).padding(.vertical, 12)",
          "  .background(StrataTheme.light.primary)",
          "  .foregroundStyle(StrataTheme.light.primaryForeground)",
          "  .clipShape(RoundedRectangle(cornerRadius: StrataTheme.light.radius))",
          "",
          "/* ── Android · Jetpack Compose (StrataTheme) ─────────────── */",
          "Button(",
          "  onClick = onSave,",
          "  colors = ButtonDefaults.buttonColors(",
          "    containerColor = StrataTheme.primary,",
          "    contentColor = StrataTheme.primaryForeground),",
          "  shape = RoundedCornerShape(StrataTheme.radius),",
          ") { Text(\"Save\") }",
        ].join("\n"),
        language: "tsx",
      },
    },
  },
  render: (args) => <Button {...args}>Save</Button>,
};
