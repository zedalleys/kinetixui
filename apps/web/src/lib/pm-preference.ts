/**
 * The reader's package manager, shared by every command block on the site and remembered between pages.
 *
 * Same shape as `platform-preference.ts`, deliberately: a reader who picks pnpm on /docs/installation has
 * picked pnpm, and the component page they open next should not ask again. The alternative — `useState` per
 * block — would mean choosing pnpm once per fence, and /docs/cli has thirteen of them.
 *
 * Where the choice comes from, in order:
 *   1. `?pm=` on the URL, so a link can open a page on a manager. It applies to the page it is on and is not
 *      saved: following a shared link does not overwrite what the reader chose themselves.
 *   2. what the reader last picked, from `localStorage`. Every read and write is in try/catch — storage
 *      throws in a private window and with blocked site data. Without it the choice still holds for the
 *      page, it just is not remembered.
 *   3. npm, which is also the server render, so hydration never disagrees with the markup.
 *
 * Nothing here emits analytics. `analytics-surfaces.ts` already classifies a copied command by package and
 * platform from its text, and that is the whole approved vocabulary; which manager a reader prefers is a
 * convenience and is not measured.
 */
import * as React from "react";
import { DEFAULT_PACKAGE_MANAGER, parsePackageManager, type PackageManager } from "./pm-commands";

export const PM_STORAGE_KEY = "kx-pm";
export const PM_QUERY_PARAM = "pm";

/* ------------------------------------------------------------------ the store */

let current: PackageManager | null = null;
// the reader's own choice this document: what the page falls back to when a `?pm=` override goes away
let chosen: PackageManager | null = null;
// the URL query `current` was resolved against; a client-side navigation changes it without a new document
let resolvedFor: string | null = null;
const listeners = new Set<() => void>();

function readStored(): PackageManager | null {
  try {
    return parsePackageManager(window.localStorage.getItem(PM_STORAGE_KEY));
  } catch {
    return null;
  }
}

function readSearch(): string {
  try {
    return window.location.search;
  } catch {
    return "";
  }
}

function resolve(): PackageManager {
  const search = readSearch();
  if (current === null || search !== resolvedFor) {
    resolvedFor = search;
    const fromQuery = parsePackageManager(new URLSearchParams(search).get(PM_QUERY_PARAM));
    current = fromQuery ?? chosen ?? readStored() ?? DEFAULT_PACKAGE_MANAGER;
  }
  return current;
}

function notify() {
  for (const l of listeners) l();
}

// another tab changed the choice: follow it, so two open docs tabs do not disagree
function onStorage(e: StorageEvent) {
  if (e.key !== PM_STORAGE_KEY) return;
  const next = parsePackageManager(e.newValue);
  if (!next || next === current) return;
  current = chosen = next;
  notify();
}

// back/forward can change the query without remounting anything: re-read it
function onPopState() {
  notify();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorage);
    window.addEventListener("popstate", onPopState);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("popstate", onPopState);
    }
  };
}

/**
 * Record an explicit choice: every command block on the page follows it, and the next page opens on it.
 *
 * `current` is updated synchronously, for the same reason the platform store does it: Radix Tabs focuses the
 * trigger inside its own mousedown handler, so one click can call `onValueChange` twice with the same value
 * before React re-renders.
 */
export function setPreferredPackageManager(pm: PackageManager): boolean {
  const changed = resolve() !== pm;
  current = chosen = pm;
  try {
    window.localStorage.setItem(PM_STORAGE_KEY, pm);
  } catch {
    // storage unavailable: the choice still holds for this page
  }
  notify();
  return changed;
}

/** The reader's package manager. npm on the server and on the first client render; the stored choice after. */
export function usePreferredPackageManager(): PackageManager {
  return React.useSyncExternalStore(subscribe, resolve, () => DEFAULT_PACKAGE_MANAGER);
}

/** Tests only: forget the in-memory choice so the next read goes back to the URL and storage. */
export function resetPackageManagerPreferenceForTests(): void {
  current = chosen = resolvedFor = null;
  listeners.clear();
  window.removeEventListener("storage", onStorage);
  window.removeEventListener("popstate", onPopState);
}
