import * as React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./components/checkbox";
import { ColorPicker } from "./components/color-picker";
import { FileUpload } from "./components/file-upload";
import { List, ListItem } from "./components/list";
import { DataGrid, type DataGridColumn, type DataGridSelection } from "./components/data-grid";
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
  function setup(
    opts: {
      onCellEdit?: ReturnType<typeof vi.fn>;
      data?: Row[];
      wrapper?: (n: React.ReactNode) => React.ReactNode;
      selectable?: boolean;
      onSelectionChange?: (s: DataGridSelection | null) => void;
    } = {},
  ) {
    const onCellEdit = opts.onCellEdit ?? vi.fn();
    const columns: DataGridColumn<Row>[] = [
      { id: "name", header: "Name", cell: (r) => r.name, value: (r) => r.name, sortable: true, editable: true, onCellEdit },
      { id: "id", header: "ID", cell: (r) => r.id, value: (r) => r.id, minWidth: 60, width: 100 },
    ];
    const grid = (
      <DataGrid
        columns={columns}
        data={opts.data ?? rows}
        height={200}
        getRowId={(r) => r.id}
        selectable={opts.selectable}
        onSelectionChange={opts.onSelectionChange}
      />
    );
    render(
      <>
        {opts.wrapper ? opts.wrapper(grid) : grid}
        <button>after</button>
      </>,
    );
    return onCellEdit;
  }
  const header = (name: string) => screen.getByRole("columnheader", { name });
  const cell = (r: number, c: number) => screen.getAllByRole("row")[r + 1]!.querySelectorAll<HTMLElement>('[role="gridcell"]')[c]!;
  const names = () => screen.getAllByRole("gridcell").filter((c) => /^(Cara|Abe|Bea)$/.test(c.textContent ?? "")).map((c) => c.textContent);

  it("is a single tab stop: Tab enters on the first header, the next Tab leaves the grid", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    expect(header("Name")).toHaveFocus();
    expect(header("ID")).toHaveAttribute("tabindex", "-1");
    expect(cell(0, 0)).toHaveAttribute("tabindex", "-1");
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });

  it("exposes grid dimensions and row / column indexes (rows are virtualized, so they must be explicit)", () => {
    setup();
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-rowcount", "4"); // header + 3
    expect(grid).toHaveAttribute("aria-colcount", "2");
    expect(screen.getAllByRole("row")[0]).toHaveAttribute("aria-rowindex", "1");
    expect(screen.getAllByRole("row")[3]).toHaveAttribute("aria-rowindex", "4");
    expect(cell(0, 1)).toHaveAttribute("aria-colindex", "2");
  });

  it("moves between cells with the arrow keys, header row included, and stops at the edges", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab(); // Name header
    await user.keyboard("{ArrowRight}");
    expect(header("ID")).toHaveFocus();
    await user.keyboard("{ArrowRight}"); // last column: stays
    expect(header("ID")).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(cell(0, 1)).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(cell(0, 0)).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}"); // past the last row: stays
    expect(cell(2, 0)).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(header("Name")).toHaveFocus();
  });

  it("Home / End go to the row ends; Ctrl+Home / Ctrl+End to the grid corners", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowDown}"); // row 1, Name
    await user.keyboard("{End}");
    expect(cell(1, 1)).toHaveFocus();
    await user.keyboard("{Home}");
    expect(cell(1, 0)).toHaveFocus();
    await user.keyboard("{Control>}{End}{/Control}");
    expect(cell(2, 1)).toHaveFocus();
    await user.keyboard("{Control>}{Home}{/Control}");
    expect(header("Name")).toHaveFocus();
  });

  it("remembers the active cell: leaving and re-entering the grid returns to it", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(cell(0, 1)).toHaveFocus();
    await user.tab(); // out
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    await user.tab({ shift: true }); // back in
    expect(cell(0, 1)).toHaveFocus();
  });

  it("sorts from the keyboard: Enter / Space on a sortable header", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    expect(header("Name")).toHaveAttribute("aria-sort", "none");
    await user.keyboard("{Enter}");
    expect(header("Name")).toHaveAttribute("aria-sort", "ascending");
    expect(names()).toEqual(["Abe", "Bea", "Cara"]);
    await user.keyboard(" ");
    expect(header("Name")).toHaveAttribute("aria-sort", "descending");
    expect(names()).toEqual(["Cara", "Bea", "Abe"]);
  });

  it("edits a cell from the keyboard: Enter to edit, Enter to commit, focus returns to the cell", async () => {
    const user = userEvent.setup();
    const onCellEdit = setup();
    await user.tab();
    await user.keyboard("{ArrowDown}");
    const target = cell(0, 0);
    expect(target).toHaveFocus();

    await user.keyboard("{Enter}");
    const input = within(target).getByRole("textbox");
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "Zed{Enter}");

    expect(onCellEdit).toHaveBeenCalledTimes(1);
    expect(onCellEdit).toHaveBeenCalledWith(rows[0], 0, "Zed");
    await waitFor(() => expect(within(target).queryByRole("textbox")).not.toBeInTheDocument());
    expect(target).toHaveFocus();
    await user.keyboard("{ArrowDown}"); // navigation still works after an edit
    expect(cell(1, 0)).toHaveFocus();
  });

  it("Escape cancels an edit without committing and returns focus to the cell", async () => {
    const user = userEvent.setup();
    const onCellEdit = setup();
    await user.tab();
    await user.keyboard("{ArrowDown}");
    const target = cell(0, 0);
    await user.keyboard("{F2}");
    await user.type(within(target).getByRole("textbox"), "x{Escape}");

    expect(onCellEdit).not.toHaveBeenCalled();
    expect(target).toHaveFocus();
  });

  it("Alt+Arrow reorders a column from its header, keeps focus on it, and announces the move", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab(); // Name header
    const headersBefore = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headersBefore).toEqual(["Name", "ID"]);

    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");
    await waitFor(() => expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["ID", "Name"]));
    expect(header("Name")).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Name moved to position 2 of 2");

    await user.keyboard("{Alt>}{ArrowRight}{/Alt}"); // already last
    expect(screen.getByRole("status")).toHaveTextContent("already the last movable column");
  });

  it("Shift+Arrow resizes a column from its header and announces the width", async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.keyboard("{ArrowRight}"); // ID header, width 100, min 60
    expect(header("ID")).toHaveStyle({ width: "100px" });
    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(header("ID")).toHaveStyle({ width: "110px" });
    expect(screen.getByRole("status")).toHaveTextContent("ID column width 110 pixels");
    await user.keyboard("{Shift>}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{/Shift}");
    expect(header("ID")).toHaveStyle({ width: "60px" }); // clamped to minWidth
  });

  it("advertises the header chords with aria-keyshortcuts", () => {
    setup();
    expect(header("Name")).toHaveAttribute("aria-keyshortcuts", expect.stringContaining("Alt+ArrowLeft"));
  });

  it("mirrors the arrow keys under RTL", async () => {
    const user = userEvent.setup();
    setup({ wrapper: (n) => <div dir="rtl" style={{ direction: "rtl" }}>{n}</div> });
    await user.tab();
    expect(header("Name")).toHaveFocus();
    await user.keyboard("{ArrowLeft}"); // in RTL the next column is to the left
    expect(header("ID")).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(header("Name")).toHaveFocus();
  });

  describe("range selection (opt-in)", () => {
    const selectedCells = () => screen.getAllByRole("gridcell").filter((c) => c.getAttribute("aria-selected") === "true");

    it("is off by default: no aria-multiselectable, no aria-selected, Shift+Arrow just moves", async () => {
      const user = userEvent.setup();
      setup();
      expect(screen.getByRole("grid")).not.toHaveAttribute("aria-multiselectable");
      expect(cell(0, 0)).not.toHaveAttribute("aria-selected");
      await user.tab();
      await user.keyboard("{ArrowDown}{Shift>}{ArrowDown}{/Shift}");
      expect(cell(1, 0)).toHaveFocus();
      expect(cell(0, 0)).not.toHaveAttribute("aria-selected");
    });

    it("declares the grid multi-selectable and marks every cell selected=false until something is selected", async () => {
      setup({ selectable: true });
      expect(screen.getByRole("grid")).toHaveAttribute("aria-multiselectable", "true");
      expect(cell(0, 0)).toHaveAttribute("aria-selected", "false");
      expect(selectedCells()).toHaveLength(0);
    });

    it("Shift+Arrow extends a rectangle from the anchor and reports it", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      setup({ selectable: true, onSelectionChange });
      await user.tab();
      await user.keyboard("{ArrowDown}"); // Name, row 0 (anchor)
      await user.keyboard("{Shift>}{ArrowDown}{ArrowRight}{/Shift}");

      expect(selectedCells()).toHaveLength(4); // rows 0-1 x Name, ID
      expect(cell(1, 1)).toHaveFocus();
      expect(onSelectionChange).toHaveBeenLastCalledWith({ rows: [0, 1], columns: ["name", "id"], ranges: [{ rows: [0, 1], columns: ["name", "id"] }] });
      expect(screen.getByRole("status")).toHaveTextContent("4 cells selected");
    });

    it("shrinks when Shift moves back toward the anchor", async () => {
      const user = userEvent.setup();
      setup({ selectable: true });
      await user.tab();
      await user.keyboard("{ArrowDown}{Shift>}{ArrowDown}{ArrowDown}{/Shift}");
      expect(selectedCells()).toHaveLength(3);
      await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
      expect(selectedCells()).toHaveLength(2);
    });

    it("a plain arrow key collapses the selection", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      setup({ selectable: true, onSelectionChange });
      await user.tab();
      await user.keyboard("{ArrowDown}{Shift>}{ArrowDown}{/Shift}");
      expect(selectedCells().length).toBeGreaterThan(0);
      await user.keyboard("{ArrowDown}");
      expect(selectedCells()).toHaveLength(0);
      expect(onSelectionChange).toHaveBeenLastCalledWith(null);
    });

    it("Ctrl+A selects every cell; Escape clears it", async () => {
      const user = userEvent.setup();
      setup({ selectable: true });
      await user.tab();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Control>}a{/Control}");
      expect(selectedCells()).toHaveLength(6); // 3 rows x 2 columns
      await user.keyboard("{Escape}");
      expect(selectedCells()).toHaveLength(0);
    });

    it("Shift+click extends from the previously active cell", async () => {
      const user = userEvent.setup();
      setup({ selectable: true });
      await user.tab();
      await user.keyboard("{ArrowDown}"); // active: row 0, Name
      await user.keyboard("{Shift>}");
      await user.click(cell(2, 1));
      await user.keyboard("{/Shift}");
      expect(selectedCells()).toHaveLength(6);
    });

    it("a plain click clears the selection", async () => {
      const user = userEvent.setup();
      setup({ selectable: true });
      await user.tab();
      await user.keyboard("{ArrowDown}{Shift>}{ArrowDown}{/Shift}");
      expect(selectedCells().length).toBeGreaterThan(0);
      await user.click(cell(2, 0));
      expect(selectedCells()).toHaveLength(0);
    });

    it("Ctrl+C copies the range as tab-separated values", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      setup({ selectable: true });
      await user.tab();
      await user.keyboard("{ArrowDown}{Shift>}{ArrowDown}{ArrowRight}{/Shift}");
      await user.keyboard("{Control>}c{/Control}");
      expect(writeText).toHaveBeenCalledWith("Cara\t1\nAbe\t2");
      expect(screen.getByRole("status")).toHaveTextContent("Copied 4 cells");
    });

    it("Shift+click extends from the anchor even after it has scrolled out of the rendered window", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      const many = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}` }));
      setup({ selectable: true, data: many, onSelectionChange });
      await user.tab();
      await user.keyboard("{ArrowDown}"); // active + anchor: row 0
      const grid = screen.getByRole("grid");
      grid.scrollTop = 4000;
      grid.dispatchEvent(new Event("scroll"));
      await waitFor(() => expect(screen.queryByText("Person 1")).not.toBeInTheDocument());

      const target = screen.getAllByRole("gridcell").find((c) => c.getAttribute("data-cell")?.endsWith(":name"))!;
      const targetRow = Number(target.getAttribute("data-cell")!.split(":")[0]);
      expect(targetRow).toBeGreaterThan(50);

      await user.keyboard("{Shift>}");
      await user.click(target);
      await user.keyboard("{/Shift}");
      expect(onSelectionChange).toHaveBeenLastCalledWith({ rows: [0, targetRow], columns: ["name"], ranges: [{ rows: [0, targetRow], columns: ["name"] }] });
    });

    it("Ctrl+click adds a separate range and keeps the first, reporting both", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      setup({ selectable: true, onSelectionChange });
      await user.tab();
      await user.keyboard("{ArrowDown}{Shift>}{ArrowDown}{/Shift}"); // Name, rows 0-1
      await user.keyboard("{Control>}");
      await user.click(cell(2, 1)); // ID, row 2
      await user.keyboard("{/Control}");
      expect(selectedCells()).toHaveLength(3);
      expect(cell(0, 0)).toHaveAttribute("aria-selected", "true");
      expect(cell(2, 1)).toHaveAttribute("aria-selected", "true");
      expect(cell(2, 0)).toHaveAttribute("aria-selected", "false");
      expect(onSelectionChange).toHaveBeenLastCalledWith({
        rows: [2, 2],
        columns: ["id"],
        ranges: [
          { rows: [0, 1], columns: ["name"] },
          { rows: [2, 2], columns: ["id"] },
        ],
      });
      expect(screen.getByRole("status")).toHaveTextContent("3 cells selected");
    });

    it("Ctrl+click with nothing selected keeps the active cell as the first range", async () => {
      const user = userEvent.setup();
      setup({ selectable: true });
      await user.tab();
      await user.keyboard("{ArrowDown}"); // active: row 0, Name — not selected yet
      await user.keyboard("{Control>}");
      await user.click(cell(2, 1));
      await user.keyboard("{/Control}");
      expect(selectedCells()).toHaveLength(2);
      expect(cell(0, 0)).toHaveAttribute("aria-selected", "true");
    });

    it("Ctrl+Space is the keyboard way to add a range; Shift+arrows then extends the new one", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      setup({ selectable: true, onSelectionChange });
      await user.tab();
      await user.keyboard("{ArrowDown}"); // row 0, Name
      await user.keyboard("{Control>} {/Control}"); // range 1 = this cell
      await user.keyboard("{ArrowDown}{ArrowDown}"); // plain arrows collapse everything...
      expect(selectedCells()).toHaveLength(0);
      await user.keyboard("{Control>} {/Control}"); // ...so start over at row 2
      await user.keyboard("{ArrowUp}");
      expect(selectedCells()).toHaveLength(0);
      // build two ranges without collapsing: Shift+arrows extends, Ctrl+Space branches
      await user.keyboard("{ArrowUp}{Shift>}{ArrowDown}{/Shift}"); // rows 0-1
      await user.keyboard("{Control>} {/Control}"); // second range starts at the active cell (row 1)
      await user.keyboard("{Shift>}{ArrowDown}{ArrowRight}{/Shift}"); // rows 1-2, Name+ID
      expect(onSelectionChange).toHaveBeenLastCalledWith({
        rows: [1, 2],
        columns: ["name", "id"],
        ranges: [
          { rows: [0, 1], columns: ["name"] },
          { rows: [1, 2], columns: ["name", "id"] },
        ],
      });
    });

    it("Ctrl+C copies every range, separated by a blank line", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      setup({ selectable: true });
      await user.tab();
      await user.keyboard("{ArrowDown}"); // Cara
      await user.keyboard("{Control>}");
      await user.click(cell(2, 1)); // 3
      await user.keyboard("{/Control}");
      await user.keyboard("{Control>}c{/Control}");
      expect(writeText).toHaveBeenCalledWith("Cara\n\n3");
      expect(screen.getByRole("status")).toHaveTextContent("Copied 2 cells");
    });

    it("dragging across cells selects the rectangle; a plain click selects nothing", async () => {
      const user = userEvent.setup();
      const onSelectionChange = vi.fn();
      setup({ selectable: true, onSelectionChange });
      await user.pointer({ keys: "[MouseLeft>]", target: cell(0, 0) });
      expect(selectedCells()).toHaveLength(0); // pressed but not moved
      await user.pointer({ target: cell(1, 1) });
      await user.pointer({ keys: "[/MouseLeft]" });
      expect(selectedCells()).toHaveLength(4);
      expect(onSelectionChange).toHaveBeenLastCalledWith({ rows: [0, 1], columns: ["name", "id"], ranges: [{ rows: [0, 1], columns: ["name", "id"] }] });
      expect(cell(1, 1)).toHaveFocus(); // Shift+arrows continue from the end
    });

    it("moving over cells with no button held does not select", async () => {
      const user = userEvent.setup();
      setup({ selectable: true });
      await user.pointer({ keys: "[MouseLeft>]", target: cell(0, 0) });
      await user.pointer({ keys: "[/MouseLeft]" });
      await user.pointer({ target: cell(2, 1) });
      expect(selectedCells()).toHaveLength(0);
    });

    it("re-sorting clears the selection (it refers to displayed rows)", async () => {
      const user = userEvent.setup();
      setup({ selectable: true });
      await user.tab();
      await user.keyboard("{ArrowDown}{Shift>}{ArrowDown}{/Shift}");
      expect(selectedCells().length).toBeGreaterThan(0);
      await user.keyboard("{ArrowUp}{ArrowUp}{Enter}"); // Name header, sort
      expect(selectedCells()).toHaveLength(0);
    });
  });

  describe("with many rows (virtualized)", () => {
    const many: Row[] = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: `Person ${i + 1}` }));

    it("scrolls the target row into the rendered window and focuses it", async () => {
      const user = userEvent.setup();
      setup({ data: many });
      await user.tab();
      await user.keyboard("{ArrowDown}");
      for (let i = 0; i < 30; i++) await user.keyboard("{ArrowDown}");
      await waitFor(() => expect(document.activeElement).toHaveTextContent("Person 31"));
      expect(document.activeElement).toHaveAttribute("data-cell", "30:name");
    });

    it("PageDown / Ctrl+End jump by a page and to the last row", async () => {
      const user = userEvent.setup();
      setup({ data: many });
      await user.tab();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{PageDown}");
      await waitFor(() => expect(document.activeElement?.getAttribute("data-cell")).toMatch(/^(\d+):name$/));
      const jumped = Number(document.activeElement!.getAttribute("data-cell")!.split(":")[0]);
      expect(jumped).toBeGreaterThan(2);

      await user.keyboard("{Control>}{End}{/Control}");
      await waitFor(() => expect(document.activeElement).toHaveAttribute("data-cell", "199:id"));
    });

    it("stays reachable by Tab even after the active row scrolls out of the rendered window", async () => {
      const user = userEvent.setup();
      setup({ data: many });
      await user.tab();
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Control>}{End}{/Control}");
      await waitFor(() => expect(document.activeElement).toHaveAttribute("data-cell", "199:id"));
      await user.tab(); // out
      const grid = screen.getByRole("grid");
      grid.scrollTop = 0;
      grid.dispatchEvent(new Event("scroll"));
      await user.tab({ shift: true });
      expect(grid.contains(document.activeElement)).toBe(true);
    });
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

describe("MultiSelect chips", () => {
  it("Backspace in the empty search field removes the last chip", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <MultiSelect
        aria-label="Fruit"
        options={[
          { value: "a", label: "Apple" },
          { value: "b", label: "Banana" },
        ]}
        defaultValue={["a", "b"]}
        onValueChange={onValueChange}
      />,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("{Backspace}");
    expect(onValueChange).toHaveBeenLastCalledWith(["a"]);
  });
});

describe("List", () => {
  it("a pressable row is a listitem containing a button, and Enter / Space activate it", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <List>
        <ListItem title="Profile" onSelect={onSelect} />
        <ListItem title="Static" />
      </List>,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const button = within(items[0]!).getByRole("button", { name: "Profile" });
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(within(items[1]!).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("FileUpload", () => {
  it("has exactly one keyboard target — the Browse button — not a nested control or the hidden input", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FileUpload />
        <button>after</button>
      </>,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Browse files" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });
});
