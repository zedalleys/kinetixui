import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../components/input";

const STATES = ["Default", "Focus", "Error", "Disabled"] as const;

const meta = {
  title: "Form Inputs/Input",
  component: Input,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Generated from Figma `KinetixUI` › UI Components › 01. Form Inputs › Input (node 54855:13836). State matrix mirrors the Figma component property `state = Default | Focus | Error | Disabled`; Focus is `:focus-visible`, Disabled is native, `state=\"Error\"` sets `aria-invalid`.",
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
