import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { NodeView } from "./node-view";
import type { Node } from "@/lib/create-studio/model";
it("renders real library properties and selects the deepest node without activating it", () => {
  const onSelect = vi.fn();
  const node: Node = { id: "node_2", kind: "layout", ref: "layout:section", children: [{ id: "node_3", kind: "component", ref: "component:Button", props: { text: "Launch" } }] };
  render(<NodeView node={node} selection={["node_3"]} onSelect={onSelect} />);
  const button = screen.getByRole("button", { name: "Launch" });
  expect(button.closest("[inert]")).not.toBeNull();
  fireEvent.click(button, { shiftKey: true });
  expect(onSelect).toHaveBeenCalledExactlyOnceWith("node_3", true);
});
it("restores native interaction for preview", async () => {
  const onSelect = vi.fn();
  const node: Node = { id: "node_3", kind: "component", ref: "component:Tabs" };
  const view = render(<NodeView node={node} selection={[]} onSelect={onSelect} />);
  view.rerender(<NodeView node={node} selection={[]} onSelect={onSelect} preview />);
  expect(screen.getByRole("tab", { name: "Overview" }).closest("[inert]")).toBeNull();
  await userEvent.click(screen.getByRole("tab", { name: "Details" }));
  expect(screen.getByRole("tabpanel")).toHaveTextContent("Make room for the details.");
  expect(onSelect).not.toHaveBeenCalled();
});
