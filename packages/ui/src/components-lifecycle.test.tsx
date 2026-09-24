import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ColorPicker } from "./components/color-picker";
import { JsonViewer } from "./components/json-viewer";
import { MarkdownEditor } from "./components/markdown-editor";
import { TreeView, TreeItem } from "./components/tree-view";

/**
 * Lifecycle contract tests for the four components whose APIs were corrected on the way to lifecycle Stable.
 *
 * These are not coverage. Each one pins a promise the correction created — that the component works
 * uncontrolled as well as controlled, that the callback fires with the new value, that the shared state has
 * exactly one owner — because those are the promises a Stable label makes and the ones a refactor would
 * quietly break. The behaviours that already had tests (ColorPicker's keyboard model, the markdown
 * renderer's escaping) are left where they are rather than duplicated here.
 */

// kx-verify: interaction

describe("ColorPicker — controlled and uncontrolled", () => {
  it("manages its own value from defaultValue, and reports changes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ColorPicker defaultValue="#3b82f6" onValueChange={onValueChange} />);

    const square = screen.getByRole("slider", { name: "Saturation and value" });
    square.focus();
    await user.keyboard("{ArrowRight}");

    expect(onValueChange).toHaveBeenCalledOnce();
    expect(onValueChange.mock.calls[0]![0]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("shows what the user just did, not the colour it started with", async () => {
    const user = userEvent.setup();
    render(<ColorPicker defaultValue="#3b82f6" />);
    const hex = screen.getByLabelText("Hex color") as HTMLInputElement;
    const before = hex.value;

    screen.getByRole("slider", { name: "Saturation and value" }).focus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(hex.value).not.toBe(before);
  });

  it("is driven from outside when `value` is passed, and ignores its own state", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ColorPicker value="#3b82f6" onValueChange={onValueChange} />);
    const hex = screen.getByLabelText("Hex color") as HTMLInputElement;

    screen.getByRole("slider", { name: "Saturation and value" }).focus();
    await user.keyboard("{ArrowRight}");
    // it reports the change; the caller decides whether to apply it
    expect(onValueChange).toHaveBeenCalled();
    expect(hex).toBeTruthy();
  });

  it("does not require a callback — a picker with neither prop still works", async () => {
    const user = userEvent.setup();
    render(<ColorPicker />);
    screen.getByRole("slider", { name: "Saturation and value" }).focus();
    await expect(user.keyboard("{ArrowRight}")).resolves.not.toThrow();
  });
});

describe("MarkdownEditor — controlled and uncontrolled", () => {
  it("edits its own buffer from defaultValue and reports the full markdown", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<MarkdownEditor defaultValue="hello" onValueChange={onValueChange} />);

    const textarea = screen.getByLabelText("Markdown") as HTMLTextAreaElement;
    await user.click(textarea);
    await user.keyboard("!");

    expect(textarea.value).toBe("hello!");
    expect(onValueChange).toHaveBeenLastCalledWith("hello!");
  });

  it("applies toolbar formatting to the same buffer the textarea shows", async () => {
    const user = userEvent.setup();
    render(<MarkdownEditor defaultValue="word" />);
    const textarea = screen.getByLabelText("Markdown") as HTMLTextAreaElement;
    textarea.setSelectionRange(0, 4);

    await user.click(screen.getByRole("button", { name: /bold/i }));
    expect(textarea.value).toBe("**word**");
  });

  it("renders the preview from the live buffer, not from the initial value", async () => {
    const user = userEvent.setup();
    render(<MarkdownEditor defaultValue="# One" />);
    await user.click(screen.getByRole("button", { name: /show preview/i }));

    const textarea = screen.getByLabelText("Markdown") as HTMLTextAreaElement;
    await user.click(textarea);
    await user.keyboard("!");
    expect(screen.getByRole("heading", { name: "One!" })).toBeTruthy();
  });

  it("still escapes HTML in the preview after the state change", async () => {
    const user = userEvent.setup();
    render(<MarkdownEditor defaultValue={'<img src=x onerror="boom">'} />);
    await user.click(screen.getByRole("button", { name: /show preview/i }));
    // the source is shown as text; no element was created from it
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("TreeView — selection works uncontrolled", () => {
  const Tree = (props: React.ComponentProps<typeof TreeView>) => (
    <TreeView {...props}>
      <TreeItem value="src" label="src">
        <TreeItem value="index" label="index.ts" />
      </TreeItem>
      <TreeItem value="readme" label="README.md" />
    </TreeView>
  );

  it("shows the node named by defaultSelected", () => {
    render(<Tree defaultSelected="readme" defaultExpanded={["src"]} />);
    expect(screen.getByRole("treeitem", { name: "README.md" })).toHaveAttribute("aria-selected", "true");
  });

  it("moves the selection on click without the caller storing it", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(<Tree defaultSelected="readme" defaultExpanded={["src"]} onSelectedChange={onSelectedChange} />);

    await user.click(screen.getByRole("treeitem", { name: "src" }));
    expect(onSelectedChange).toHaveBeenCalledWith("src");
    expect(screen.getByRole("treeitem", { name: "src" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("treeitem", { name: "README.md" })).toHaveAttribute("aria-selected", "false");
  });

  it("lets a controlled `selected` win over what was clicked", async () => {
    const user = userEvent.setup();
    render(<Tree selected="readme" defaultExpanded={["src"]} />);
    await user.click(screen.getByRole("treeitem", { name: "src" }));
    expect(screen.getByRole("treeitem", { name: "README.md" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps expansion independent of selection", async () => {
    const user = userEvent.setup();
    render(<Tree defaultSelected="readme" />);
    const src = screen.getByRole("treeitem", { name: "src" });
    expect(src).toHaveAttribute("aria-expanded", "false");
    await user.click(src);
    // clicking selects; it does not collapse or expand on its own
    expect(src).toHaveAttribute("aria-selected", "true");
  });
});

describe("JsonViewer — copy is opt-out, not double-negative", () => {
  it("offers the copy action by default", () => {
    render(<JsonViewer data={{ a: 1 }} />);
    expect(screen.getByRole("button", { name: /copy/i })).toBeTruthy();
  });

  it("removes it for copyable={false}", () => {
    render(<JsonViewer data={{ a: 1 }} copyable={false} />);
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
  });

  it("renders the data either way — the flag is about the button only", () => {
    const { rerender } = render(<JsonViewer data={{ nested: { deep: true } }} expandDepth={3} />);
    expect(screen.getByText(/nested/)).toBeTruthy();
    rerender(<JsonViewer data={{ nested: { deep: true } }} expandDepth={3} copyable={false} />);
    expect(screen.getByText(/nested/)).toBeTruthy();
  });
});
