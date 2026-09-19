import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "./components/badge";
import { Button } from "./components/button";
import { Input } from "./components/input";
import { Tag } from "./components/tag";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/accordion";

describe("Button", () => {
  it("renders the label and forwards clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("maps the design-source variant prop to a class", () => {
    render(<Button variant="Destructive">x</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");
  });

  it("renders as a child element with asChild", () => {
    render(
      <Button asChild>
        <a href="/x">link</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "link" })).toHaveAttribute("href", "/x");
  });
});

describe("Input", () => {
  it("sets aria-invalid when state is Error", () => {
    render(<Input state="Error" defaultValue="nope" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("is not aria-invalid by default", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid", "true");
  });
});

describe("Badge", () => {
  it("gives each variant a distinct class", () => {
    const { rerender } = render(<Badge>tag</Badge>);
    const def = screen.getByText("tag").className;
    rerender(<Badge variant="secondary">tag</Badge>);
    expect(screen.getByText("tag").className).not.toBe(def);
    expect(screen.getByText("tag")).toHaveClass("text-secondary");
  });

  it("renders as a child element with asChild", () => {
    render(
      <Badge asChild>
        <a href="/new">New</a>
      </Badge>,
    );
    const link = screen.getByRole("link", { name: "New" });
    expect(link).toHaveAttribute("href", "/new");
    expect(link).toHaveClass("bg-action"); // badge classes merged onto the <a>
  });
});

describe("Tag", () => {
  it("renders as a child element with asChild", () => {
    render(
      <Tag asChild>
        <a href="/filter">Active</a>
      </Tag>,
    );
    const link = screen.getByRole("link", { name: "Active" });
    expect(link).toHaveAttribute("href", "/filter");
    expect(link).toHaveClass("bg-accent"); // tag classes merged onto the <a>
  });

  it("nests the remove button inside the slotted element when combined with onRemove", async () => {
    const onRemove = vi.fn();
    render(
      <Tag asChild onRemove={onRemove}>
        <div>Active</div>
      </Tag>,
    );
    const remove = screen.getByRole("button", { name: "Remove" });
    await userEvent.click(remove);
    expect(onRemove).toHaveBeenCalledOnce();
  });
});

describe("Accordion", () => {
  it("reveals content when a trigger is activated", async () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Question</AccordionTrigger>
          <AccordionContent>Answer text</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(screen.queryByText("Answer text")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Question" }));
    expect(screen.getByText("Answer text")).toBeVisible();
  });
});
