"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@kinetixui/ui";
import { useDir } from "./dir-provider";

export function DirToggle() {
  const { dir, setDir } = useDir();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const current = mounted ? dir : "ltr";
  const next = current === "ltr" ? "rtl" : "ltr";

  return (
    <Button
      variant="Ghost"
      size="icon"
      aria-label={`Switch to ${next === "rtl" ? "right-to-left" : "left-to-right"}`}
      onClick={() => setDir(next)}
    >
      <ArrowLeftRight />
      <span className="sr-only">{current === "rtl" ? "RTL" : "LTR"} — toggle text direction</span>
    </Button>
  );
}
