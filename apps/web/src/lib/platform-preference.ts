/**
 * The reader's platform, shared by every platform switcher on the site and remembered between pages.
 *
 * Each switcher used to hold its own `useState("react")`. Button's page has three previews, so a SwiftUI
 * evaluator picked SwiftUI three times on that page and again on every page after it. Now one choice drives
 * `ComponentPreview`, `Showcase` (/blocks) and the homepage flagship, and the next page opens on it.
 *
 * Where the choice comes from, in order:
 *   1. `?platform=` on the URL, so a link can open a page on a platform. It applies to the page it is on and is
 *      not saved: following a shared link does not overwrite what the reader chose themselves.
 *   2. what the reader last picked, from `localStorage`. Every read and write is in try/catch, because storage
 *      throws or is empty in private windows and with blocked site data. Without it the choice still holds
 *      for the page, it just isn't remembered.
 *   3. React, which is also the server render, so hydration never disagrees with the markup.
 *
 * The value is the public platform id the analytics vocabulary already uses (`react`, `angular`, `swiftui`,
 * `compose`, `flutter`). Anything else — a stale value, a typo, `?platform=vue` — is ignored rather than
 * becoming a sixth platform.
 *
 * Restoring a choice is not a selection: nothing here emits analytics. `platform_selected` stays an explicit
 * click in a switcher, which is what analytics.md §3 counts.
 */
import * as React from "react";
import { ANALYTICS_PLATFORMS, type AnalyticsPlatform } from "./analytics";
import { PLATFORM_FROM_CODE_TAB } from "./analytics-surfaces";
import { PLATFORMS, type Platform } from "./platform-parity";
import type { CodeTab } from "./platform-tabs";

export type PlatformId = AnalyticsPlatform;

export const PLATFORM_STORAGE_KEY = "kx-platform";
export const PLATFORM_QUERY_PARAM = "platform";
export const DEFAULT_PLATFORM: PlatformId = "react";

/** A known platform id, or null. The only door a string from storage or a URL comes in through. */
export function parsePlatform(value: string | null | undefined): PlatformId | null {
  const v = value?.trim().toLowerCase();
  return v && (ANALYTICS_PLATFORMS as readonly string[]).includes(v) ? (v as PlatformId) : null;
}

const CODE_TAB_OF = Object.fromEntries(Object.entries(PLATFORM_FROM_CODE_TAB).map(([tab, id]) => [id, tab])) as Record<PlatformId, CodeTab>;

/** "swiftui" → "swift", the key the component code tabs use. */
export const codeTabFor = (id: PlatformId): CodeTab => CODE_TAB_OF[id];
/** "swift" → "swiftui". */
export const platformIdForCodeTab = (tab: CodeTab): PlatformId => PLATFORM_FROM_CODE_TAB[tab];

/** "swiftui" → "SwiftUI", the manifest key. Derived the same way `analyticsPlatformFor` maps the other way. */
export const manifestPlatformFor = (id: PlatformId): Platform | null => PLATFORMS.find((p) => p.toLowerCase() === id) ?? null;
/** "SwiftUI" → "swiftui", or null for a key that is not a platform. */
export const platformIdForManifest = (platform: string): PlatformId | null => parsePlatform(platform);

/* ------------------------------------------------------------------ the store */

let current: PlatformId | null = null;
// the reader's own choice this document: what the page falls back to when a `?platform=` override goes away
let chosen: PlatformId | null = null;
// the URL query `current` was resolved against; a client-side navigation changes it without a new document
let resolvedFor: string | null = null;
const listeners = new Set<() => void>();

function readStored(): PlatformId | null {
  try {
    return parsePlatform(window.localStorage.getItem(PLATFORM_STORAGE_KEY));
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

/**
 * The platform the client should show now. Re-resolved whenever the URL query changes, so following a
 * `?platform=` link client-side applies it, and leaving that page goes back to the reader's own choice.
 */
function resolve(): PlatformId {
  const search = readSearch();
  if (current === null || search !== resolvedFor) {
    resolvedFor = search;
    const fromQuery = parsePlatform(new URLSearchParams(search).get(PLATFORM_QUERY_PARAM));
    current = fromQuery ?? chosen ?? readStored() ?? DEFAULT_PLATFORM;
  }
  return current;
}

function notify() {
  for (const l of listeners) l();
}

// another tab changed the choice: follow it, so two open docs tabs don't disagree
function onStorage(e: StorageEvent) {
  if (e.key !== PLATFORM_STORAGE_KEY) return;
  const next = parsePlatform(e.newValue);
  if (!next || next === current) return;
  current = chosen = next;
  notify();
}

// back/forward can change the query without remounting anything: re-read it
function onPopState() {
  notify();
}

/**
 * The URL changed without a new document (a client-side navigation): let every switcher re-read it, so a
 * `?platform=` link applies and leaving it restores the reader's choice even where nothing remounts. Called by
 * `PlatformLocationSync`; a no-op when the URL query did not change.
 */
export function notifyLocationChanged(): void {
  if (readSearch() !== resolvedFor) notify();
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

/** Record an explicit choice: every switcher on the page follows it, and the next page opens on it. */
export function setPreferredPlatform(id: PlatformId): void {
  current = chosen = id;
  try {
    window.localStorage.setItem(PLATFORM_STORAGE_KEY, id);
  } catch {
    // storage unavailable: the choice still holds for this page
  }
  notify();
}

/** The reader's platform. React on the server and on the first client render; the stored choice right after. */
export function usePreferredPlatform(): PlatformId {
  return React.useSyncExternalStore(subscribe, resolve, () => DEFAULT_PLATFORM);
}

/** Tests only: forget the in-memory choice so the next read goes back to the URL and storage. */
export function resetPlatformPreferenceForTests(): void {
  current = chosen = resolvedFor = null;
  listeners.clear();
  window.removeEventListener("storage", onStorage);
  window.removeEventListener("popstate", onPopState);
}
