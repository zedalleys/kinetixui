import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "../components/textarea";

const STATES = ["Default", "Focus", "Error", "Disabled"] as const;

const meta = {
  title: "Form Inputs/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Generated from Figma `Personal Design System` › UI Components › 01. Form Inputs › Textarea (node 54855:13857). Same state matrix and tokens as Input; multi-line with `min-h-[100px]` (Figma `h: 100`) and vertical resize.",
      },
    },
  },
  args: { placeholder: "Placeholder text", rows: 4 },
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
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const States: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {STATES.map((state) => (
        <label key={state} className="flex flex-col gap-2">
          <span className="text-[14px] font-medium tracking-[0.1px]">{state}</span>
          <Textarea {...args} state={state} defaultValue={state === "Error" ? "Too short." : undefined} />
        </label>
      ))}
    </div>
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
              <Textarea {...args} state={state} />
              <span className={`text-[12px] leading-4 ${helperTone}`}>Helper text</span>
            </label>
          </div>
        );
      })}
    </div>
  ),
};
