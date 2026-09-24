"use client";

import * as React from "react";
import { Kbd, KbdGroup, SegmentedControl, SegmentedControlItem, ToggleGroup, ToggleGroupItem } from "@kinetixui/ui";

// kx-block:start
const MARKS = [
  { value: "bold", name: "Bold", glyph: "B", shortcut: "B", className: "font-bold" },
  { value: "italic", name: "Italic", glyph: "I", shortcut: "I", className: "italic" },
  { value: "code", name: "Code", glyph: "</>", shortcut: "E", className: "font-mono text-xs" },
];

export function EditorToolbarBlock() {
  const [mode, setMode] = React.useState("write");
  const [marks, setMarks] = React.useState<string[]>(["bold"]);

  return (
    <div className="w-full max-w-lg rounded-lg border bg-card p-2 text-card-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedControl value={mode} onValueChange={(value) => value && setMode(value)}>
          <SegmentedControlItem value="write">Write</SegmentedControlItem>
          <SegmentedControlItem value="preview">Preview</SegmentedControlItem>
        </SegmentedControl>
        {/*
          The formatting controls belong to the editor, so they go away when there is no editor. Leaving them
          live in Preview would offer an action that cannot happen.
        */}
        <ToggleGroup type="multiple" value={marks} onValueChange={setMarks} disabled={mode === "preview"}>
          {MARKS.map((mark) => (
            <ToggleGroupItem key={mark.value} value={mark.value}>
              {/*
                The name is real text, hidden visually — not an aria-label. It stays in the page, it
                translates with everything else, and it cannot silently disagree with the glyph beside it.
              */}
              <span className="sr-only">{mark.name}</span>
              <span aria-hidden="true" className={mark.className}>
                {mark.glyph}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
        {MARKS.map((mark) => (
          <span key={mark.value} className="flex items-center gap-1.5">
            {mark.name}
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>{mark.shortcut}</Kbd>
            </KbdGroup>
          </span>
        ))}
      </p>
    </div>
  );
}
// kx-block:end
