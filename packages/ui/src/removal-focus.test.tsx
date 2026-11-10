import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tag } from "./components/tag";
import { FileUpload } from "./components/file-upload";
import { MultiSelect } from "./components/multi-select";
import { focusAfterRemoval } from "./lib/utils";

/**
 * removal-focus.test.tsx — where the keyboard goes when a control removes the row it lives in.
 *
 * Measured on `main` 590368d, before the fix: focusing a chip's remove button and activating it
 * left `document.activeElement === document.body`, for both `Tag` and `FileUpload`. The next Tab
 * then restarts from the top of the document, so clearing three chips sends the user back to the
 * beginning three times. WCAG 2.4.3 Focus Order.
 *
 * Every group ends with a negative control that has to FAIL the shape the assertions rely on,
 * otherwise the assertions prove nothing. The controls are test-local replicas; nothing
 * deliberately broken is committed to the library.
 */

/** React commits a discrete-event state update before microtasks drain; focusAfterRemoval waits one. */
const settled = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));

function Chips({ initial = ["Cotton", "Linen", "Wool"] }: { initial?: string[] }) {
  const [tags, setTags] = React.useState(initial);
  return (
    <div>
      {tags.map((t) => (
        <Tag key={t} onRemove={() => setTags((cur) => cur.filter((x) => x !== t))}>
          {t}
        </Tag>
      ))}
      <button type="button">After the chips</button>
    </div>
  );
}

describe("Tag hands the keyboard on when a chip is removed", () => {
  it("moves to the next chip's remove button", async () => {
    const user = userEvent.setup();
    render(<Chips />);
    screen.getByRole("button", { name: "Remove Linen" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove Wool" }));
    expect(screen.queryByText("Linen")).toBeNull();
  });

  it("moves to the previous chip when the last one goes", async () => {
    const user = userEvent.setup();
    render(<Chips />);
    screen.getByRole("button", { name: "Remove Wool" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove Linen" }));
  });

  it("walks a whole group down without ever dropping focus on the body", async () => {
    const user = userEvent.setup();
    render(<Chips />);
    screen.getByRole("button", { name: "Remove Cotton" }).focus();
    for (const name of ["Remove Cotton", "Remove Linen"]) {
      expect(document.activeElement).toBe(screen.getByRole("button", { name }));
      await user.keyboard("{Enter}");
      await settled();
      expect(document.activeElement).not.toBe(document.body);
    }
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove Wool" }));
  });

  it("does not reach into a different chip group", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Chips initial={["Only"]} />
        <Chips initial={["Elsewhere", "Second"]} />
      </>,
    );
    screen.getByRole("button", { name: "Remove Only" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    // No chip survives in the first group and it declares no fallback, so focus is not moved into
    // the second group — a jump across groups would be worse than staying put.
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Remove Elsewhere" }));
    expect(screen.getByText("Elsewhere")).toBeInTheDocument();
  });

  it("leaves focus alone when the handler removes nothing", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Tag onRemove={() => {}}>Pinned</Tag>
        <Tag onRemove={() => {}}>Also pinned</Tag>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Remove Pinned" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await settled();
    // The trigger is still in the document, so the removal did not happen and focus must not move.
    expect(document.activeElement).toBe(trigger);
  });

  it("leaves a consumer's own focus restoration alone", async () => {
    // A chip group typed into an input usually wants focus back in that input, and the handler says
    // so by focusing it. The helper must not overrule that. Raised by Codex on #554 as a P2 and
    // reproduced before the guard existed: focus went to "Remove B" instead of the input.
    const user = userEvent.setup();
    function ChipInput() {
      const [tags, setTags] = React.useState(["A", "B", "C"]);
      const inputRef = React.useRef<HTMLInputElement>(null);
      return (
        <div>
          {tags.map((t) => (
            <Tag
              key={t}
              onRemove={() => {
                setTags((cur) => cur.filter((x) => x !== t));
                inputRef.current?.focus();
              }}
            >
              {t}
            </Tag>
          ))}
          <input ref={inputRef} aria-label="Add a tag" />
        </div>
      );
    }
    render(<ChipInput />);
    screen.getByRole("button", { name: "Remove A" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(document.activeElement).toBe(screen.getByLabelText("Add a tag"));
  });

  it("negative control: a chip whose remove button is not announced to the helper drops focus", async () => {
    // The pre-fix button, verbatim in behaviour: it calls onRemove and nothing else.
    function LegacyChips() {
      const [tags, setTags] = React.useState(["A", "B"]);
      return (
        <div>
          {tags.map((t) => (
            <span key={t}>
              {t}
              <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags((c) => c.filter((x) => x !== t))} />
            </span>
          ))}
        </div>
      );
    }
    const user = userEvent.setup();
    render(<LegacyChips />);
    screen.getByRole("button", { name: "Remove A" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(document.activeElement).toBe(document.body);
  });
});

describe("FileUpload hands the keyboard on when a row is removed", () => {
  function Files({ count = 3 }: { count?: number }) {
    const [files, setFiles] = React.useState(
      Array.from({ length: count }, (_, i) => ({ id: String(i), name: `file-${i}.pdf`, size: 2048, status: "done" as const })),
    );
    return <FileUpload files={files} onRemove={(id) => setFiles((f) => f.filter((x) => x.id !== id))} />;
  }

  it("moves to the next row's remove button", async () => {
    const user = userEvent.setup();
    render(<Files />);
    screen.getByRole("button", { name: "Remove file-1.pdf" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove file-2.pdf" }));
  });

  it("falls back to the dropzone's own button when the list empties", async () => {
    const user = userEvent.setup();
    render(<Files count={1} />);
    screen.getByRole("button", { name: "Remove file-0.pdf" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Browse files" }));
  });

  it("negative control: the sweep catches focus landing on the body", async () => {
    // Same list, same markup, but the remove button is a plain one with no focus hand-off.
    function LegacyFiles() {
      const [names, setNames] = React.useState(["one", "two"]);
      return (
        <ul>
          {names.map((n) => (
            <li key={n}>
              <button type="button" aria-label={`Remove ${n}`} onClick={() => setNames((c) => c.filter((x) => x !== n))} />
            </li>
          ))}
        </ul>
      );
    }
    const user = userEvent.setup();
    render(<LegacyFiles />);
    screen.getByRole("button", { name: "Remove one" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(document.activeElement).toBe(document.body);
  });
});

describe("MultiSelect takes its own focus back", () => {
  const options = [
    { value: "a", label: "Ash" },
    { value: "b", label: "Birch" },
  ];

  it("returns focus to the field when its last chip is removed by that chip's button", async () => {
    const user = userEvent.setup();
    function Field() {
      const [value, setValue] = React.useState(["a"]);
      return <MultiSelect options={options} value={value} onValueChange={setValue} aria-label="Woods" />;
    }
    render(<Field />);
    screen.getByRole("button", { name: "Remove Ash" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });

  it("removes a chip by keyboard without opening the list", async () => {
    // The field's own onKeyDown used to preventDefault every Enter that reached it, including the
    // ones bubbling from a chip's remove button — so the chip was never removed and the list opened
    // instead. A chip was unremovable by keyboard.
    const user = userEvent.setup();
    function Field() {
      const [value, setValue] = React.useState(["a", "b"]);
      return <MultiSelect options={options} value={value} onValueChange={setValue} aria-label="Woods" />;
    }
    render(<Field />);
    screen.getByRole("button", { name: "Remove Ash" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(screen.queryByText("Ash")).toBeNull();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("still opens the list from the field itself", async () => {
    // The guard above must not cost the field its own keyboard contract.
    const user = userEvent.setup();
    function Field() {
      const [value, setValue] = React.useState<string[]>([]);
      return <MultiSelect options={options} value={value} onValueChange={setValue} aria-label="Woods" />;
    }
    render(<Field />);
    const field = screen.getByRole("combobox");
    field.focus();
    await user.keyboard("{ArrowDown}");
    expect(field).toHaveAttribute("aria-expanded", "true");
  });

  it("moves chip to chip while chips remain", async () => {
    const user = userEvent.setup();
    function Field() {
      const [value, setValue] = React.useState(["a", "b"]);
      return <MultiSelect options={options} value={value} onValueChange={setValue} aria-label="Woods" />;
    }
    render(<Field />);
    screen.getByRole("button", { name: "Remove Ash" }).focus();
    await user.keyboard("{Enter}");
    await settled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove Birch" }));
  });
});

describe("focusAfterRemoval's own contract", () => {
  it("does nothing for a trigger that is already detached", () => {
    const orphan = document.createElement("button");
    expect(() => focusAfterRemoval(orphan, "[data-kx-remove]")).not.toThrow();
    expect(() => focusAfterRemoval(null, "[data-kx-remove]")).not.toThrow();
  });

  it("does nothing when the trigger is not among the peers it was given", async () => {
    document.body.innerHTML = `<ul><li><button id="t"></button></li><li><button data-kx-remove id="p"></button></li></ul>`;
    const trigger = document.getElementById("t") as HTMLElement;
    const peer = document.getElementById("p") as HTMLElement;
    focusAfterRemoval(trigger, "[data-kx-remove]");
    trigger.remove();
    await settled();
    expect(document.activeElement).not.toBe(peer);
    document.body.innerHTML = "";
  });
});
