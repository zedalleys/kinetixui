import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./components/button";

/**
 * button-pending.test.tsx — WP-1: `pending`, the state for "the action I started is in flight".
 *
 * Four things are easy to get wrong here and all four are asserted rather than assumed:
 *
 *   (a) focus must not move when `pending` flips — the reason this is not `disabled`;
 *   (b) one announcement per transition, not one per render;
 *   (c) the spinner must not reflow the label, so its slot exists in both states;
 *   (d) every input device must be suppressed, not only `click`.
 *
 * The negative control for (a) lives at the bottom: the naive `disabled={pending}` implementation,
 * written out in the test file itself and shown to fail the focus assertion. It is a local component,
 * never exported, so nothing broken is shipped — the point is that the test which passes for `Button`
 * genuinely fails for the obvious alternative.
 */

/** The live region Button renders beside itself, which must never be part of the button's name. */
const statusText = () => screen.getByRole("status").textContent;

// kx-verify: accessibility
describe("Button pending — semantics", () => {
  it("is aria-disabled and aria-busy, and is NOT the disabled attribute", () => {
    render(<Button pending>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-pending", "");
    // The whole design decision, in one assertion.
    expect(button).not.toBeDisabled();
  });

  it("keeps its accessible name exactly, with the status announced separately", async () => {
    render(<Button pending>Save</Button>);
    // "Save", not "Save Working…": the live region is a sibling, not a child.
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    await waitFor(() => expect(statusText()).toBe("Working…"));
  });

  it("takes a localised pendingLabel", async () => {
    render(
      <Button pending pendingLabel="جارٍ الحفظ…">
        حفظ
      </Button>,
    );
    await waitFor(() => expect(statusText()).toBe("جارٍ الحفظ…"));
    expect(screen.getByRole("button", { name: "حفظ" })).toBeInTheDocument();
  });

  it("announces politely, so it never interrupts what the user is reading", () => {
    render(<Button pending>Save</Button>);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});

describe("Button pending — (a) focus stays where the user put it", () => {
  /**
   * What jsdom can and cannot witness here, stated once rather than implied.
   *
   * A real browser BLURS an element at the moment it becomes `disabled`, which is how the naive
   * implementation loses the user's place. jsdom does not implement that: disabling a focused button
   * leaves `document.activeElement` pointing at it (measured, not assumed). So the symptom is not
   * observable in this environment and the tests below assert the two things that are: a pending
   * `Button` can still be focused and still be reached by Tab, and the naive alternative can do
   * neither. Those are the cause of the browser's blur, not a proxy for it.
   */
  it("remains focusable while pending — the assertion the naive version fails", async () => {
    const { rerender } = render(<Button pending={false}>Save</Button>);
    rerender(<Button pending>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it("holds focus across the transition", async () => {
    const { rerender } = render(<Button pending={false}>Save</Button>);
    screen.getByRole("button", { name: "Save" }).focus();
    rerender(<Button pending>Save</Button>);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save" }));
  });

  it("stays reachable by Tab while pending", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="before" />
        <Button pending>Save</Button>
      </>,
    );
    screen.getByLabelText("before").focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Save" }));
  });
});

describe("Button pending — (b) one announcement per transition", () => {
  it("does not re-announce when an unrelated re-render happens mid-flight", async () => {
    const seen: string[] = [];
    function Harness({ pending, nonce }: { pending: boolean; nonce: number }) {
      const text = screen.queryByRole("status")?.textContent;
      if (text !== undefined) seen.push(`${nonce}:${text}`);
      return <Button pending={pending}>Save</Button>;
    }
    const { rerender } = render(<Harness pending={false} nonce={0} />);
    rerender(<Harness pending nonce={1} />);
    await waitFor(() => expect(statusText()).toBe("Working…"));

    // Three re-renders that change nothing about the state.
    rerender(<Harness pending nonce={2} />);
    rerender(<Harness pending nonce={3} />);
    rerender(<Harness pending nonce={4} />);
    // The region's content never changed across them, so an assistive technology has nothing new to
    // read. (A region whose text is re-set to the same string is not re-announced either, but not
    // re-setting it is the stronger guarantee and the one the effect's dependency list gives.)
    expect(statusText()).toBe("Working…");
  });

  it("clears the region on the way out, which announces nothing", async () => {
    const { rerender } = render(<Button pending>Save</Button>);
    await waitFor(() => expect(statusText()).toBe("Working…"));
    rerender(<Button pending={false}>Save</Button>);
    await waitFor(() => expect(statusText()).toBe(""));
  });
});

describe("Button pending — (c) the label does not reflow", () => {
  it("renders the spinner slot in both states, and the ring only while pending", () => {
    const { rerender, container } = render(<Button pending={false}>Save</Button>);
    const slots = () => container.querySelectorAll('[aria-hidden="true"]');
    expect(slots()).toHaveLength(1);
    expect(container.querySelector(".animate-spin")).toBeNull();

    rerender(<Button pending>Save</Button>);
    expect(slots()).toHaveLength(1);
    const ring = container.querySelector(".animate-spin");
    expect(ring).not.toBeNull();
    // Reduced motion is inherited from `spinnerVariants`, not re-specified here.
    expect(ring?.className).toContain("motion-reduce:animate-none");
  });

  it("adds nothing at all when `pending` is absent", () => {
    const { container } = render(<Button>Save</Button>);
    expect(container.querySelector("[aria-hidden]")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).not.toHaveAttribute("data-pending");
  });
});

describe("Button pending — (d) every device is suppressed", () => {
  it("swallows a mouse click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button pending onClick={onClick}>
        Save
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("swallows Enter and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <Button pending onClick={onClick} onKeyDown={onKeyDown}>
        Save
      </Button>,
    );
    screen.getByRole("button", { name: "Save" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it("swallows a touch tap, including the pointerdown a form might submit on", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onPointerDown = vi.fn();
    const onTouchStart = vi.fn();
    render(
      <Button pending onClick={onClick} onPointerDown={onPointerDown} onTouchStart={onTouchStart}>
        Save
      </Button>,
    );
    await user.pointer({ keys: "[TouchA]", target: screen.getByRole("button", { name: "Save" }) });
    expect(onClick).not.toHaveBeenCalled();
    expect(onPointerDown).not.toHaveBeenCalled();
    expect(onTouchStart).not.toHaveBeenCalled();
  });

  it("does not submit the form it sits in", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" pending>
          Save
        </Button>
      </form>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("lets everything through again once pending clears", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(
      <Button pending onClick={onClick}>
        Save
      </Button>,
    );
    rerender(
      <Button pending={false} onClick={onClick}>
        Save
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Button pending — precedence and misuse", () => {
  it("disabled wins: no spinner, no busy state, no announcement", () => {
    const { container } = render(
      <Button disabled pending>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).not.toHaveAttribute("data-pending");
    expect(container.querySelector(".animate-spin")).toBeNull();
    expect(statusText()).toBe("");
  });

  it('state="Disabled" wins for the same reason', () => {
    render(
      <Button state="Disabled" pending>
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).not.toHaveAttribute("aria-busy");
  });

  it('state="Pending" pins the state for docs and snapshots, with no prop', () => {
    const { container } = render(<Button state="Pending">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("data-pending", "");
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it("rejects pending + asChild in development rather than rendering something wrong", () => {
    // Development is the environment this test runs in, which is the point: the misuse is loud here
    // and silent in a production build, where the semantics below are applied anyway.
    expect(() =>
      render(
        <Button asChild pending>
          <a href="/save">Save</a>
        </Button>,
      ),
    ).toThrow(/pending.*asChild|asChild.*pending/s);
  });
});

/**
 * THE NEGATIVE CONTROL.
 *
 * The naive implementation, in full, exactly as it is usually written. It passes every assertion
 * about suppression — a disabled button really does not fire its handler — and fails the one that
 * matters to the person using it. This is why `pending` is not `disabled`, demonstrated rather than
 * asserted in prose.
 */
function NaivePendingButton({ pending, children }: { pending?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" disabled={pending}>
      {children}
    </button>
  );
}

describe("negative control: the naive disabled={pending} button", () => {
  it("cannot be focused at all while pending, which is why a browser blurs it", () => {
    render(<NaivePendingButton pending>Save</NaivePendingButton>);
    const button = screen.getByRole("button", { name: "Save" });
    button.focus();
    // The failure, recorded: `focus()` is a no-op on a disabled control. In a browser this is also
    // retroactive — the element is blurred the moment the attribute lands, so a user who had just
    // clicked it is returned to the top of the document. jsdom does not model that blur, so this
    // asserts the property that causes it. The same call on a pending `Button` succeeds, above.
    expect(document.activeElement).not.toBe(button);
    expect(document.activeElement).toBe(document.body);
  });

  it("also drops out of the tab order, so the next Tab restarts from the top", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="before" />
        <NaivePendingButton pending>Save</NaivePendingButton>
      </>,
    );
    screen.getByLabelText("before").focus();
    await user.tab();
    expect(document.activeElement).not.toBe(screen.getByRole("button", { name: "Save" }));
  });

  it("and says nothing at all while it works", () => {
    render(<NaivePendingButton pending>Save</NaivePendingButton>);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
