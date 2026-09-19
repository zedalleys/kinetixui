import * as React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./components/checkbox";
import { ColorPicker } from "./components/color-picker";
import { DataGrid, type DataGridColumn } from "./components/data-grid";
import { KinetixDirectionProvider } from "./components/direction-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/dropdown-menu";
import { MultiSelect } from "./components/multi-select";
import { Popover, PopoverContent, PopoverTrigger } from "./components/popover";
import { RadioGroup, RadioGroupItem } from "./components/radio-group";
import { Slider } from "./components/slider";
import { Switch } from "./components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/tabs";
import { Tour } from "./components/tour";
import { TreeItem, TreeView } from "./components/tree-view";

/**
 * Keyboard / focus behaviour — the runtime half of accessibility that the static
 * contrast check and axe can't judge: that a control is reachable and operable
 * from the keyboard, that overlays move focus in and give it back, and that
 * arrow keys respect reading direction. jsdom has no layout, so these assert
 * on focus and ARIA state, not on geometry.
 */

describe("Dialog", () => {
  function Example() {
    return (
      <>
        <button>before</button>
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Change your details.</DialogDescription>
            <input aria-label="Name" />
            <button>Save</button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  it("opens from the keyboard and moves focus inside", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab(); // "before"
    await user.tab(); // trigger
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog", { name: "Edit profile" });
    expect(dialog).toHaveAccessibleDescription("Change your details.");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("traps Tab inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");

    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("DropdownMenu", () => {
  function Example() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  it("opens with Enter, walks items with the arrow keys, closes with Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    await user.keyboard("{Enter}");

    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus());

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}"); // Delete, then the end: Radix menus don't wrap by default
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("Popover", () => {
  it("closes on Escape and returns focus to its trigger", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent>
          <button>Inside</button>
        </PopoverContent>
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "Info" });
    await user.click(trigger);
    expect(await screen.findByRole("button", { name: "Inside" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Inside" })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("Tabs", () => {
  function Example({ dir }: { dir?: "ltr" | "rtl" }) {
    const tabs = (
      <Tabs defaultValue="a" dir={dir}>
        <TabsList>
          <TabsTrigger value="a">One</TabsTrigger>
          <TabsTrigger value="b">Two</TabsTrigger>
          <TabsTrigger value="c">Three</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A</TabsContent>
        <TabsContent value="b">B</TabsContent>
        <TabsContent value="c">C</TabsContent>
      </Tabs>
    );
    return dir ? <KinetixDirectionProvider dir={dir}>{tabs}</KinetixDirectionProvider> : tabs;
  }

  it("is a single tab stop; ArrowRight moves to and selects the next tab", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("B");
  });

  it("supports Home and End", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
  });

  it("mirrors the arrow keys under RTL", async () => {
    const user = userEvent.setup();
    render(<Example dir="rtl" />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();

    // In a right-to-left list the *next* item is to the left.
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "One" })).toHaveFocus();
  });
});

describe("RadioGroup", () => {
  it("is one tab stop; arrows move and select; Tab leaves the group", async () => {
    const user = userEvent.setup();
    render(
      <>
        <RadioGroup defaultValue="a" aria-label="Plan">
          <RadioGroupItem value="a" aria-label="Free" />
          <RadioGroupItem value="b" aria-label="Pro" />
          <RadioGroupItem value="c" aria-label="Team" />
        </RadioGroup>
        <button>after</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("radio", { name: "Free" })).toHaveFocus();

    // Radix moves focus on a timeout after keydown and only selects if the arrow key is still
    // held when focus lands — user-event releases synchronously, so hold it like a real press.
    await user.keyboard("{ArrowDown>}");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Pro" })).toHaveFocus());
    await user.keyboard("{/ArrowDown}");
    expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();

    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });
});

describe("Checkbox and Switch", () => {
  it("Checkbox toggles with Space, not Enter", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Accept terms" />);
    await user.tab();
    const box = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(box).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(box).toHaveAttribute("aria-checked", "false");
    await user.keyboard(" ");
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("Switch toggles with Space and exposes role=switch", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Notifications" />);
    await user.tab();
    const sw = screen.getByRole("switch", { name: "Notifications" });
    expect(sw).toHaveFocus();
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.keyboard(" ");
    expect(sw).toHaveAttribute("aria-checked", "true");
  });

  it("a disabled Switch is skipped by Tab", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button>first</button>
        <Switch aria-label="Off limits" disabled />
        <button>last</button>
      </>,
    );
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "last" })).toHaveFocus();
  });
});

// ── Custom widgets ─────────────────────────────────────────────────────────
// These hand-roll their keyboard model (no Radix primitive underneath), so they
// are where a regression or a gap is most likely.


describe("TreeView", () => {
  function Example() {
    const [selected, setSelected] = React.useState<string | undefined>();
    return (
      <TreeView aria-label="Files" selected={selected} onSelectedChange={setSelected} defaultExpanded={[]}>
        <TreeItem value="src" label="src">
          <TreeItem value="app" label="app.ts" />
          <TreeItem value="util" label="util.ts" />
        </TreeItem>
        <TreeItem value="docs" label="docs" />
      </TreeView>
    );
  }

  it("is one tab stop and moves with ArrowDown/ArrowUp", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(screen.getByRole("treeitem", { name: /src/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("treeitem", { name: /docs/ })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("treeitem", { name: /src/ })).toHaveFocus();
  });

  it("ArrowRight expands, ArrowLeft collapses, and aria-expanded follows", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    const src = screen.getByRole("treeitem", { name: /src/ });
    expect(src).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{ArrowRight}");
    expect(src).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowRight}"); // into the first child
    // A parent's accessible name includes its children's text, so match the child exactly.
    expect(screen.getByRole("treeitem", { name: "app.ts" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}"); // back to the parent
    expect(src).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(src).toHaveAttribute("aria-expanded", "false");
  });

  it("Enter selects the focused item", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("treeitem", { name: /docs/ })).toHaveAttribute("aria-selected", "true");
  });
});

describe("MultiSelect", () => {
  const options = [
    { value: "a", label: "Apple" },
    { value: "b", label: "Banana" },
    { value: "c", label: "Cherry" },
  ];

  it("can be opened and an option chosen using only the keyboard", async () => {
    const user = userEvent.setup();
    render(<MultiSelect aria-label="Fruit" options={options} />);
    await user.tab();
    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(combobox).toHaveAttribute("aria-expanded", "true");

    // Keys must now drive the option list (focus should be in its search input).
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(screen.getAllByText("Banana").length).toBeGreaterThan(1));
  });

  it("closes with Escape and gives focus back to the combobox", async () => {
    const user = userEvent.setup();
    render(<MultiSelect aria-label="Fruit" options={options} />);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false"));
    expect(screen.getByRole("combobox")).toHaveFocus();
  });
});

describe("Tour", () => {
  const steps = [
    { target: "#one", title: "Step one", content: "First." },
    { target: "#two", title: "Step two", content: "Second." },
  ];
  function Example() {
    const [open, setOpen] = React.useState(false);
    const [i, setI] = React.useState(0);
    return (
      <>
        <button id="one" onClick={() => setOpen(true)}>
          Start tour
        </button>
        <button id="two">Other</button>
        <Tour steps={steps} open={open} stepIndex={i} onStepIndexChange={setI} onOpenChange={setOpen} />
      </>
    );
  }

  it("is a modal dialog with an accessible name taken from the step title", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Start tour" }));
    expect(await screen.findByRole("dialog", { name: "Step one" })).toBeInTheDocument();
  });

  it("moves focus into the dialog when it opens", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Start tour" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it("closes on Escape and returns focus to where it was", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const start = screen.getByRole("button", { name: "Start tour" });
    await user.click(start);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(start).toHaveFocus();
  });

  it("keeps Tab inside the dialog while it is open", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Start tour" }));
    const dialog = await screen.findByRole("dialog");
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });
});

describe("DataGrid", () => {
  type Row = { id: number; name: string };
  const rows: Row[] = [
    { id: 1, name: "Cara" },
    { id: 2, name: "Abe" },
    { id: 3, name: "Bea" },
  ];
  function setup(onCellEdit = vi.fn()) {
    const columns: DataGridColumn<Row>[] = [
      { id: "name", header: "Name", cell: (r) => r.name, value: (r) => r.name, sortable: true, editable: true, onCellEdit },
      { id: "id", header: "ID", cell: (r) => r.id, value: (r) => r.id },
    ];
    render(<DataGrid columns={columns} data={rows} height={200} getRowId={(r) => r.id} />);
    return onCellEdit;
  }
  const names = () => screen.getAllByRole("gridcell").filter((c) => /^(Cara|Abe|Bea)$/.test(c.textContent ?? "")).map((c) => c.textContent);

  it("sorts from the keyboard: a sortable header is focusable and Enter / Space toggle it", async () => {
    const user = userEvent.setup();
    setup();
    const header = screen.getByRole("columnheader", { name: "Name" });
    expect(header).toHaveAttribute("aria-sort", "none");
    await user.tab();
    expect(header).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(names()).toEqual(["Abe", "Bea", "Cara"]);
    await user.keyboard(" ");
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(names()).toEqual(["Cara", "Bea", "Abe"]);
  });

  it("a header that is not sortable is not a tab stop", async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByRole("columnheader", { name: "ID" })).not.toHaveAttribute("tabindex");
    await user.tab(); // Name header
    await user.tab(); // first editable cell — the ID header was skipped
    expect(screen.getAllByRole("gridcell")[0]).toHaveFocus();
  });

  it("edits a cell from the keyboard: Enter to edit, Enter to commit, focus returns to the cell", async () => {
    const user = userEvent.setup();
    const onCellEdit = setup();
    await user.tab(); // sortable Name header
    await user.tab(); // first editable cell
    const cell = screen.getAllByRole("gridcell")[0]!;
    expect(cell).toHaveFocus();

    await user.keyboard("{Enter}");
    const input = within(cell).getByRole("textbox");
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "Zed{Enter}");

    expect(onCellEdit).toHaveBeenCalledTimes(1);
    expect(onCellEdit).toHaveBeenCalledWith(rows[0], 0, "Zed");
    await waitFor(() => expect(within(cell).queryByRole("textbox")).not.toBeInTheDocument());
    expect(cell).toHaveFocus();
  });

  it("Escape cancels an edit without committing and returns focus to the cell", async () => {
    const user = userEvent.setup();
    const onCellEdit = setup();
    await user.tab();
    await user.tab();
    const cell = screen.getAllByRole("gridcell")[0]!;
    await user.keyboard("{F2}");
    await user.type(within(cell).getByRole("textbox"), "x{Escape}");

    expect(onCellEdit).not.toHaveBeenCalled();
    expect(cell).toHaveFocus();
  });

  // KNOWN GAP — the ARIA grid pattern also wants arrow-key movement between cells (roving tabindex),
  // plus keyboard equivalents for column reorder and resize. Not implemented yet; `it.fails` turns
  // this into an error the day it starts passing, so the gap can't be forgotten or silently closed.
  it.fails("moves between cells with the arrow keys", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getAllByRole("gridcell")[1]).toHaveFocus();
  });
});

describe("ColorPicker", () => {
  it("adjusts the saturation/value square with the arrow keys (Shift = bigger step)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="#3b82f6" onChange={onChange} />);
    const square = screen.getByRole("slider", { name: "Saturation and value" });
    square.focus();

    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledTimes(1);
    const one = onChange.mock.calls[0]![0] as string;
    expect(one).toMatch(/^#[0-9a-f]{6}$/i);
    expect(one.toLowerCase()).not.toBe("#3b82f6");

    onChange.mockClear();
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("the hue rail is a named, keyboard-operable slider", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="#3b82f6" onChange={onChange} />);
    const hue = screen.getByRole("slider", { name: "Hue" });
    hue.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalled();
  });

  it("commits the hex field on Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker value="#3b82f6" onChange={onChange} />);
    const hex = screen.getByRole("textbox");
    await user.clear(hex);
    await user.type(hex, "ff0000{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("#ff0000");
  });
});

describe("Slider", () => {
  it("names the thumb (the role=slider element) from aria-label and moves with the arrow keys", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Slider aria-label="Volume" defaultValue={[50]} max={100} onValueChange={onValueChange} />);
    const thumb = screen.getByRole("slider", { name: "Volume" });
    await user.tab();
    expect(thumb).toHaveFocus();
    expect(thumb).toHaveAttribute("aria-valuenow", "50");

    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith([51]);
    await user.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith([100]);
  });
});
