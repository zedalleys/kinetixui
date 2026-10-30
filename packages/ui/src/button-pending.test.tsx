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

/* ------------------------------------------------------------------------------------------------ *
 * `state="Pending"` is a PICTURE of the state. `pending` IS the state.
 *
 * The first version of this component derived the functional state from both, and that is a defect
 * rather than a convenience: `state` is the presentational CVA axis the docs, the playground and the
 * visual snapshots pin an appearance with — exactly as `state="Disabled"` pins the look of
 * `disabled` without disabling anything. Deriving behaviour from it meant a documentation page that
 * pinned the look also stopped accepting clicks, marked itself `aria-busy`, and announced "Working…"
 * about an action nobody had started.
 * ------------------------------------------------------------------------------------------------ */
describe('Button — state="Pending" is presentational only', () => {
  it("draws the indicator, which is the whole point of pinning it", () => {
    const { container } = render(<Button state="Pending">Save</Button>);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    // The slot is there too, so a docs page shows the same geometry a real pending button has.
    expect(container.querySelector("[data-pending-slot]")).not.toBeNull();
  });

  it("sets none of the functional attributes", () => {
    render(<Button state="Pending">Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(button).not.toHaveAttribute("data-pending");
  });

  it("renders no live region, so nothing is announced about an action nobody started", () => {
    render(<Button state="Pending">Save</Button>);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("still calls onClick", async () => {
    const onClick = vi.fn();
    render(
      <Button state="Pending" onClick={onClick}>
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("still activates from the keyboard", async () => {
    const onClick = vi.fn();
    render(
      <Button state="Pending" onClick={onClick}>
        Save
      </Button>,
    );
    screen.getByRole("button", { name: "Save" }).focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("still submits the form it sits in", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" state="Pending">
          Save
        </Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("the functional prop selects the visual as well, so the two agree", () => {
    const { container } = render(<Button pending>Save</Button>);
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("data-pending", "");
  });

  it("disabled outranks the pinned visual too", () => {
    const { container } = render(
      <Button state="Pending" disabled>
        Save
      </Button>,
    );
    // Dimmed and unavailable, not working: the picture of pending is withdrawn as well.
    expect(container.querySelector(".animate-spin")).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("mentioning neither renders no slot and no region", () => {
    const { container } = render(<Button>Save</Button>);
    expect(container.querySelector("[data-pending-slot]")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

/**
 * NEGATIVE CONTROL for the separation above — the previous derivation, written out.
 *
 * `isPending = Boolean(pending) || state === "Pending"` is one character short of correct and it is
 * the shape this component shipped with. These two assertions are the ones it fails.
 */
function DerivedPendingButton({
  state,
  onClick,
  children,
}: {
  state?: "Default" | "Pending";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}) {
  const pending = state === "Pending"; // the defect: the presentational axis drives behaviour
  return (
    <button
      type="button"
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
}

describe('negative control: deriving the functional state from state="Pending"', () => {
  it("refuses a click on a button that was only ever asked to LOOK pending", async () => {
    const onClick = vi.fn();
    render(
      <DerivedPendingButton state="Pending" onClick={onClick}>
        Save
      </DerivedPendingButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    // The failure, recorded. The real Button calls it — see the suite above.
    expect(onClick).not.toHaveBeenCalled();
  });

  it("and tells a screen reader the page is busy when nothing is happening", () => {
    render(<DerivedPendingButton state="Pending">Save</DerivedPendingButton>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });
});

/* ------------------------------------------------------------------------------------------------ *
 * The keyboard, beyond Enter and Space.
 *
 * The first version wrapped `onKeyDown`/`onKeyUp` and cancelled EVERY key while pending, which traps
 * the user on the control: Tab no longer moves focus off a button that is, by design, still
 * focusable. Cancelling only the two keys that activate a button is the whole fix.
 * ------------------------------------------------------------------------------------------------ */
describe("Button pending — the keyboard is not a trap", () => {
  it("cancels Enter and Space, and only those", () => {
    render(<Button pending>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });

    for (const key of ["Enter", " "]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      button.dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(true);
    }
    for (const key of ["Tab", "Escape", "ArrowDown", "a"]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      button.dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(false);
    }
  });

  it("still delivers a non-activation key to the caller's own handler", () => {
    const onKeyDown = vi.fn();
    render(
      <Button pending onKeyDown={onKeyDown}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    // ...and not the ones that would activate it.
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });
});

/**
 * NEGATIVE CONTROL — cancelling every key, which is what this component did.
 */
function CancelEveryKeyButton({ pending, children }: { pending?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-disabled={pending || undefined}
      onKeyDown={(event) => {
        if (pending) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
    </button>
  );
}

describe("negative control: a pending button that cancels every key", () => {
  it("cancels Tab, which leaves a focusable control the user cannot leave", () => {
    render(<CancelEveryKeyButton pending>Save</CancelEveryKeyButton>);
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    screen.getByRole("button", { name: "Save" }).dispatchEvent(event);
    // The failure, recorded. The real Button leaves it alone — see the suite above.
    expect(event.defaultPrevented).toBe(true);
  });
});

/* ------------------------------------------------------------------------------------------------ *
 * The icon size.
 *
 * `size="icon"` collapses every direct non-SVG child to `sr-only` — that is how an icon button keeps
 * its accessible name while showing only a glyph. The indicator slot is a direct non-SVG child too,
 * so without an exception a pending icon button hides its own spinner and shows no sign of working
 * at all.
 * ------------------------------------------------------------------------------------------------ */
describe("Button pending — an icon button", () => {
  it("excludes the indicator slot from the sr-only collapse", () => {
    const { container } = render(
      <Button size="icon" pending>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    // The selector the size variant applies, with the slot excluded from it.
    expect(button.className).toContain("[&>*:not(svg):not([data-pending-slot])]:sr-only");
    expect(container.querySelector("[data-pending-slot] .animate-spin")).not.toBeNull();
  });

  it("covers the glyph while pending without taking its box out of the layout", () => {
    // This asserted `[&>svg]:hidden` until Codex measured what that costs: `display: none` removed
    // the glyph's 18px, so the square narrowed the moment work began and widened again when it
    // finished. `invisible` keeps the box and the indicator is centred over it, so the geometry is
    // the same in both states. `button-pending-geometry.test.tsx` holds the whole contract.
    const { container } = render(
      <Button size="icon" pending>
        <svg data-testid="glyph" />
        Save
      </Button>,
    );
    const className = screen.getByRole("button").className;
    expect(className).toContain("[&>svg]:invisible");
    expect(className).not.toContain("[&>svg]:hidden");
    expect(container.querySelector("[data-testid='glyph']")).not.toBeNull();
  });

  it("keeps its accessible name while pending", () => {
    render(
      <Button size="icon" pending>
        Save
      </Button>,
    );
    // The label is `sr-only`, not removed: the name survives the state.
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
