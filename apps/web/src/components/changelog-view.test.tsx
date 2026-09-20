import * as React from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChangelogView } from "./changelog-view";
import type { ViewRelease } from "@/lib/changelog-filter";

// Next's App Router syncs the native History API into `useSearchParams`. Reproduce that here: read the
// real jsdom location, and re-render subscribers whenever history is written or traversed.
const store = vi.hoisted(() => ({ listeners: new Set<() => void>(), emit() { store.listeners.forEach((l) => l()); } }));
vi.mock("next/navigation", async () => {
  const react = await import("react");
  return {
    useSearchParams: () => {
      const search = react.useSyncExternalStore(
        (cb) => {
          store.listeners.add(cb);
          return () => store.listeners.delete(cb);
        },
        () => window.location.search,
        () => "",
      );
      return new URLSearchParams(search);
    },
  };
});

const realPush = window.history.pushState.bind(window.history);
const realReplace = window.history.replaceState.bind(window.history);
const url = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

const base = { date: "2026-09-20", dateLabel: "Sep 20, 2026", isLatest: false, notable: true } as const;
const tag = (v: string) => `https://github.com/zedalleys/kinetixui/tree/@kinetixui/ui@${v}`;

const releases: ViewRelease[] = [
  {
    ...base,
    version: "0.18.0",
    type: "Minor",
    isLatest: true,
    summary: "RTL foundation and theme tooling.",
    changes: [
      { title: "KinetixDirectionProvider", body: "Sets dir for every component.", kind: "new", area: "components" },
      { title: "Contrast fix", body: "Warning ring now passes.", kind: "accessibility", area: "tokens" },
    ],
    breaking: [],
    groups: [{ group: "Data & developer tools", items: [{ slug: "data-grid", name: "Data Grid", platforms: [] }] }],
    tagHref: tag("0.18.0"),
    githubReleaseUrl: "https://github.com/zedalleys/kinetixui/releases/tag/%40kinetixui%2Fui%400.18.0",
  },
  {
    ...base,
    version: "0.17.0",
    type: "Minor",
    summary: "Button sizes renamed.",
    changes: [{ title: "Button sizes", body: "medium is now md.", kind: "breaking", area: "components" }],
    breaking: ["`Button` `size=\"medium\"` was removed."],
    migration: "Use size md instead.",
    limitations: ["Native ports keep the old sizes."],
    tagHref: tag("0.17.0"),
  },
  {
    ...base,
    version: "0.16.1",
    type: "Patch",
    notable: false,
    summary: "CLI hardening.",
    changes: [{ title: "doctor checks the utils alias", kind: "fixed", area: "cli" }],
    breaking: [],
    tagHref: tag("0.16.1"),
  },
];

const sectionVersions = () => [...document.querySelectorAll("section[id]")].map((s) => s.id);
const filterButton = (name: string) => screen.getByRole("button", { name: new RegExp(`^(✓ )?${name}`) });
const searchBox = () => screen.getByRole("searchbox", { name: "Search releases" });

beforeEach(() => {
  window.history.pushState = (...args) => {
    realPush(...args);
    store.emit();
  };
  window.history.replaceState = (...args) => {
    realReplace(...args);
    store.emit();
  };
  window.addEventListener("popstate", store.emit);
  realReplace(null, "", "/docs/changelog");
});

afterEach(() => {
  cleanup();
  window.removeEventListener("popstate", store.emit);
  window.history.pushState = realPush;
  window.history.replaceState = realReplace;
});

function open(search = "", hash = "") {
  realReplace(null, "", `/docs/changelog${search}${hash}`);
  return render(<ChangelogView releases={releases} />);
}

describe("search", () => {
  it("shows every release, and no announcement, when nothing is searched", () => {
    open();
    expect(sectionVersions()).toEqual(["0.18.0", "0.17.0", "0.16.1"]);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("has an accessible label and is keyboard reachable", async () => {
    const user = userEvent.setup();
    open();
    await user.tab();
    expect(searchBox()).toHaveFocus();
  });

  it("finds a release by version", async () => {
    const user = userEvent.setup();
    open();
    await user.type(searchBox(), "0.18.0");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.18.0"]));
  });

  it("finds a release by title and by body", async () => {
    const user = userEvent.setup();
    open();
    await user.type(searchBox(), "DirectionProvider");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.18.0"]));
    await user.clear(searchBox());
    await user.type(searchBox(), "medium is now md");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.17.0"]));
  });

  it("finds a release by new component name", async () => {
    const user = userEvent.setup();
    open();
    await user.type(searchBox(), "Data Grid");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.18.0"]));
  });

  it("finds a release by breaking, migration and limitation text", async () => {
    const user = userEvent.setup();
    open();
    await user.type(searchBox(), "was removed");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.17.0"]));
    await user.clear(searchBox());
    await user.type(searchBox(), "size md instead");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.17.0"]));
    await user.clear(searchBox());
    await user.type(searchBox(), "old sizes");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.17.0"]));
  });

  it("is case-insensitive and ignores surrounding whitespace", async () => {
    const user = userEvent.setup();
    open();
    await user.type(searchBox(), "   cLi hArDeNiNg  ");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.16.1"]));
  });

  it("combines with the category filter", async () => {
    const user = userEvent.setup();
    open();
    await user.click(filterButton("Accessibility"));
    await waitFor(() => expect(sectionVersions()).toEqual(["0.18.0"]));
    await user.type(searchBox(), "button");
    await waitFor(() => expect(sectionVersions()).toEqual([])); // 0.17.0 mentions Button but has no accessibility change
    await user.clear(searchBox());
    await user.type(searchBox(), "warning");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.18.0"]));
  });

  it("restores every release when the search is cleared", async () => {
    const user = userEvent.setup();
    open();
    await user.type(searchBox(), "cli");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.16.1"]));
    await user.clear(searchBox());
    await waitFor(() => expect(sectionVersions()).toEqual(["0.18.0", "0.17.0", "0.16.1"]));
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("shows a useful empty state, and Clear resets both search and filter", async () => {
    const user = userEvent.setup();
    open();
    await user.click(filterButton("Components"));
    await user.type(searchBox(), "zzzz");
    expect(await screen.findByText(/No releases match/)).toHaveTextContent("No releases match “zzzz” in Components.");
    expect(sectionVersions()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Clear search and filters" }));
    await waitFor(() => expect(sectionVersions()).toEqual(["0.18.0", "0.17.0", "0.16.1"]));
    expect(searchBox()).toHaveValue("");
    expect(filterButton("All")).toHaveAttribute("aria-pressed", "true");
    expect(url()).toBe("/docs/changelog");
  });

  it("shows full entries while searching, so the matching text is visible", async () => {
    const user = userEvent.setup();
    open();
    expect(screen.getAllByText(/^Tag on GitHub$|^View release on GitHub$/)).toHaveLength(2); // the compact patch has no links
    await user.type(searchBox(), "cli");
    await waitFor(() => expect(sectionVersions()).toEqual(["0.16.1"]));
    expect(within(document.getElementById("0.16.1")!).getByText("Tag on GitHub")).toBeInTheDocument();
  });

  it("keeps every release anchor", () => {
    open();
    for (const v of ["0.18.0", "0.17.0", "0.16.1"]) expect(document.getElementById(v)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "0.17.0" })).toHaveAttribute("href", "#0.17.0");
  });
});

describe("result feedback", () => {
  it("announces a search politely, once typing settles", async () => {
    const user = userEvent.setup();
    open();
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    await user.type(searchBox(), "cli");
    expect(status).toHaveTextContent(""); // not announced per keystroke
    await waitFor(() => expect(status).toHaveTextContent("1 release matching “cli”"));
  });

  it("announces a filter with a count", async () => {
    const user = userEvent.setup();
    open();
    await user.click(filterButton("Components"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2 releases"));
  });

  it("announces zero results", async () => {
    const user = userEvent.setup();
    open();
    await user.type(searchBox(), "nothing-like-this");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0 releases matching “nothing-like-this”"));
  });
});

describe("filter buttons", () => {
  it("expose their state with aria-pressed and a non-colour marker", async () => {
    const user = userEvent.setup();
    open();
    expect(filterButton("All")).toHaveAttribute("aria-pressed", "true");
    expect(filterButton("CLI")).toHaveAttribute("aria-pressed", "false");
    await user.click(filterButton("CLI"));
    await waitFor(() => expect(filterButton("CLI")).toHaveAttribute("aria-pressed", "true"));
    expect(filterButton("All")).toHaveAttribute("aria-pressed", "false");
    expect(filterButton("CLI")).toHaveTextContent("✓");
    expect(filterButton("All")).not.toHaveTextContent("✓");
  });

  it("count releases for the current search", async () => {
    const user = userEvent.setup();
    open();
    await user.type(searchBox(), "button");
    await waitFor(() => expect(filterButton("All")).toHaveTextContent("1"));
    expect(filterButton("CLI")).toHaveTextContent("0");
    expect(filterButton("Breaking")).toHaveTextContent("1");
  });
});

describe("URL state", () => {
  it("loads the filter from ?filter=", () => {
    open("?filter=accessibility");
    expect(filterButton("Accessibility")).toHaveAttribute("aria-pressed", "true");
    expect(sectionVersions()).toEqual(["0.18.0"]);
  });

  it("loads the search from ?q=", () => {
    open("?q=DataGrid");
    expect(searchBox()).toHaveValue("DataGrid");
    expect(sectionVersions()).toEqual([]);
    cleanup();
    open("?q=Data%20Grid");
    expect(sectionVersions()).toEqual(["0.18.0"]);
  });

  it("loads both together", () => {
    open("?filter=components&q=grid");
    expect(filterButton("Components")).toHaveAttribute("aria-pressed", "true");
    expect(searchBox()).toHaveValue("grid");
    expect(sectionVersions()).toEqual(["0.18.0"]);
    expect(screen.getByRole("status")).toHaveTextContent("1 release matching “grid” in Components");
  });

  it("falls back to all for an invalid filter", () => {
    open("?filter=bogus");
    expect(filterButton("All")).toHaveAttribute("aria-pressed", "true");
    expect(sectionVersions()).toEqual(["0.18.0", "0.17.0", "0.16.1"]);
  });

  it("updates the URL when the filter changes, without a reload", async () => {
    const user = userEvent.setup();
    open();
    const box = searchBox();
    const push = vi.spyOn(window.history, "pushState");
    await user.click(filterButton("Components"));
    await waitFor(() => expect(url()).toBe("/docs/changelog?filter=components"));
    expect(push).toHaveBeenCalledTimes(1); // the History API, not a navigation
    expect(searchBox()).toBe(box); // same DOM node: nothing was re-mounted or reloaded
  });

  it("updates the URL when the search changes", async () => {
    const user = userEvent.setup();
    open("?filter=components");
    await user.type(searchBox(), "grid");
    await waitFor(() => expect(url()).toBe("/docs/changelog?filter=components&q=grid"));
  });

  it("omits filter=all and an empty search from the URL", async () => {
    const user = userEvent.setup();
    open("?filter=cli&q=doctor");
    await user.click(filterButton("All"));
    await waitFor(() => expect(url()).toBe("/docs/changelog?q=doctor"));
    await user.clear(searchBox());
    await waitFor(() => expect(url()).toBe("/docs/changelog"));
  });

  it("keeps the hash anchor when the state changes", async () => {
    const user = userEvent.setup();
    open("?filter=accessibility", "#0.18.0");
    expect(sectionVersions()).toEqual(["0.18.0"]);
    await user.click(filterButton("Components"));
    await waitFor(() => expect(url()).toBe("/docs/changelog?filter=components#0.18.0"));
    await user.type(searchBox(), "grid");
    await waitFor(() => expect(url()).toBe("/docs/changelog?filter=components&q=grid#0.18.0"));
  });

  it("re-applies the hash anchor once the filtered list mounts", () => {
    const scrolled: string[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.id);
    };
    try {
      open("?filter=accessibility", "#0.18.0");
      expect(scrolled).toEqual(["0.18.0"]);
      cleanup();
      scrolled.length = 0;
      open("?filter=cli", "#0.18.0"); // the anchor is filtered out: nothing to scroll to, and no error
      expect(scrolled).toEqual([]);
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("supports Back and Forward for filters", async () => {
    const user = userEvent.setup();
    open();
    await user.click(filterButton("CLI"));
    await waitFor(() => expect(filterButton("CLI")).toHaveAttribute("aria-pressed", "true"));

    window.history.back();
    await waitFor(() => expect(filterButton("All")).toHaveAttribute("aria-pressed", "true"));
    expect(sectionVersions()).toEqual(["0.18.0", "0.17.0", "0.16.1"]);

    window.history.forward();
    await waitFor(() => expect(filterButton("CLI")).toHaveAttribute("aria-pressed", "true"));
    expect(sectionVersions()).toEqual(["0.16.1"]);
  });

  it("restores the search box when the URL changes underneath it", async () => {
    const user = userEvent.setup();
    open("?q=cli");
    await user.click(filterButton("Components"));
    await waitFor(() => expect(url()).toBe("/docs/changelog?filter=components&q=cli"));
    window.history.back();
    await waitFor(() => expect(filterButton("All")).toHaveAttribute("aria-pressed", "true"));
    expect(searchBox()).toHaveValue("cli");
  });

  it("does not add a history entry for every typed search", async () => {
    const user = userEvent.setup();
    open();
    const before = window.history.length;
    await user.type(searchBox(), "cli");
    await waitFor(() => expect(url()).toBe("/docs/changelog?q=cli"));
    expect(window.history.length).toBe(before);
  });
});

describe("GitHub release links", () => {
  it("links the GitHub Release when the data has one", () => {
    open();
    const link = within(document.getElementById("0.18.0")!).getByRole("link", { name: "View release on GitHub" });
    expect(link).toHaveAttribute("href", releases[0]!.githubReleaseUrl);
    expect(within(document.getElementById("0.18.0")!).queryByText("Tag on GitHub")).not.toBeInTheDocument();
  });

  it("falls back to the git tag otherwise, without inventing a release URL", () => {
    open();
    const link = within(document.getElementById("0.17.0")!).getByRole("link", { name: "Tag on GitHub" });
    expect(link).toHaveAttribute("href", tag("0.17.0"));
    expect(within(document.getElementById("0.17.0")!).queryByText("View release on GitHub")).not.toBeInTheDocument();
  });
});
