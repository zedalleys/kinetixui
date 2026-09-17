"use client";

import * as React from "react";
import { KinetixDirectionProvider } from "@kinetixui/ui";

type Dir = "ltr" | "rtl";

const STORAGE_KEY = "kinetixui-dir";

const DirContext = React.createContext<{ dir: Dir; setDir: (dir: Dir) => void } | null>(null);

/**
 * Dev/QA toggle for RTL — flips `dir` on `<html>` so contributors and users
 * can visually verify the logical-property conversion tracked in RTL.md.
 * Not a production i18n solution (no locale detection, no persistence across
 * domains) — just a way to see the site mirror.
 */
export function DirProvider({ children }: { children: React.ReactNode }) {
  const [dir, setDirState] = React.useState<Dir>("ltr");

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "rtl" || stored === "ltr") setDirState(stored);
  }, []);

  React.useEffect(() => {
    document.documentElement.dir = dir;
  }, [dir]);

  const setDir = React.useCallback((next: Dir) => {
    setDirState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <DirContext.Provider value={{ dir, setDir }}>
      <KinetixDirectionProvider dir={dir}>{children}</KinetixDirectionProvider>
    </DirContext.Provider>
  );
}

export function useDir() {
  const ctx = React.useContext(DirContext);
  if (!ctx) throw new Error("useDir must be used within a DirProvider");
  return ctx;
}
