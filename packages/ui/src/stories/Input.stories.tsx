import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../components/input";
import { Card, CardContent } from "../components/card";
import { Label } from "../components/label";

const STATES = ["Default", "Focus", "Error", "Disabled"] as const;

const meta = {
  title: "Form Inputs/Input",
  component: Input,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Reconciled 1:1 with the design source, Figma `KinetixUI` › UI Components › 01. Form Inputs › Input (node 54855:13836). State matrix mirrors the Figma component property `state = Default | Focus | Error | Disabled`; Focus is `:focus-visible`, Disabled is native, `state=\"Error\"` sets `aria-invalid`.",
      },
    },
  },
  args: { placeholder: "Placeholder text" },
  argTypes: {
    state: { control: "inline-radio", options: [undefined, ...STATES] },
    disabled: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {STATES.map((state) => (
        <label key={state} className="flex flex-col gap-2">
          <span className="text-[14px] font-medium tracking-[0.1px]">{state}</span>
          <Input {...args} state={state} defaultValue={state === "Error" ? "Not quite right" : undefined} />
        </label>
      ))}
    </div>
  ),
};

/** reproduces the full Figma field: label + control + helper, colour tracks state */
/**
 * The text-entry state contract (TOKENS.md, "Text entry and navigation") as a real form produces it: empty
 * with a placeholder, filled, invalid with its error text, read-only and disabled, side by side in a raised
 * Card. Real states, not the `state` prop's pinned ones — `check:entry-visual` drives hover and focus on
 * these with a real pointer and keyboard, and both axe passes read them.
 */
export const EntryStates: Story = {
  render: () => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-5 p-6">
        {([
          ["rest", "Display name", { placeholder: "e.g. Ada Lovelace" }],
          ["filled", "Email", { type: "email", defaultValue: "ada@example.com" }],
          ["invalid", "Username", { defaultValue: "ada lovelace", "aria-invalid": true, "aria-describedby": "in-invalid-error" }],
          ["readonly", "Account ID", { readOnly: true, defaultValue: "acct_7Q2X9" }],
          ["disabled", "Organisation", { disabled: true, defaultValue: "Managed by your admin" }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="grid gap-2">
            <Label htmlFor={`in-${key}`}>{label}</Label>
            <Input id={`in-${key}`} data-kx-case={key} {...props} />
            {key === "invalid" ? (
              <p id="in-invalid-error" className="text-body-sm text-destructive">
                Use letters, numbers and dashes only.
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  ),
};

export const WithFieldChrome: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {STATES.map((state) => {
        const tone =
          state === "Error" ? "text-destructive" : state === "Focus" ? "text-primary" : "text-foreground";
        const helperTone = state === "Error" ? "text-destructive" : "text-muted-foreground";
        return (
          <div key={state} className={state === "Disabled" ? "opacity-50" : undefined}>
            <label className="flex flex-col gap-2">
              <span className={`text-[14px] font-medium leading-5 tracking-[0.1px] ${tone}`}>Label</span>
              <Input {...args} state={state} />
              <span className={`text-[12px] leading-4 ${helperTone}`}>Helper text</span>
            </label>
          </div>
        );
      })}
    </div>
  ),
};

export const Types: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Input {...args} type="email" placeholder="you@example.com" />
      <Input {...args} type="password" placeholder="••••••••" />
      <Input {...args} type="number" placeholder="42" />
    </div>
  ),
};
