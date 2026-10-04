import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "../components/textarea";
import { Card, CardContent } from "../components/card";
import { Label } from "../components/label";

const STATES = ["Default", "Focus", "Error", "Disabled"] as const;

const meta = {
  title: "Form Inputs/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Generated from Figma `KinetixUI` › UI Components › 01. Form Inputs › Textarea (node 54855:13857). Same state matrix and tokens as Input; multi-line with `min-h-[100px]` (Figma `h: 100`) and vertical resize.",
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
          ["rest", "Bio", { placeholder: "A sentence or two about you" }],
          ["filled", "Shipping notes", { defaultValue: "Leave at the side door." }],
          ["invalid", "Reason for refund", { defaultValue: "No", "aria-invalid": true, "aria-describedby": "ta-invalid-error" }],
          ["readonly", "Signed agreement", { readOnly: true, defaultValue: "Accepted on 2 October." }],
          ["disabled", "Admin note", { disabled: true, defaultValue: "Only admins can edit this." }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="grid gap-2">
            <Label htmlFor={`ta-${key}`}>{label}</Label>
            <Textarea id={`ta-${key}`} data-kx-case={key} rows={3} {...props} />
            {key === "invalid" ? (
              <p id="ta-invalid-error" className="text-body-sm text-destructive">
                Tell us a little more, at least 20 characters.
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
              <Textarea {...args} state={state} />
              <span className={`text-[12px] leading-4 ${helperTone}`}>Helper text</span>
            </label>
          </div>
        );
      })}
    </div>
  ),
};
