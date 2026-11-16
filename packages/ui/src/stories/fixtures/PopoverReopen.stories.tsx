import * as React from "react";
import { KinetixDirectionProvider, Popover, PopoverContent, PopoverTrigger } from "@kinetixui/ui";

export default { title: "Fixtures/Popover reopen", id: "popover-reopen-fixture" };

function Fixture() {
  const settings = new URLSearchParams(window.location.search);
  const dir = settings.get("dir") === "rtl" ? "rtl" : "ltr";
  const mode = settings.get("fixture");
  const [open, setOpen] = React.useState(false);
  const [triggerVisible, setTriggerVisible] = React.useState(true);
  const [events, setEvents] = React.useState<string[]>([]);
  const fallback = React.useRef<HTMLButtonElement>(null);
  const record = (event: string) => setEvents((previous) => [...previous, event]);

  return (
    <KinetixDirectionProvider dir={dir}>
      <main dir={dir}>
        <button ref={fallback} type="button">Outside focus target</button>
        <Popover
          open={mode === "uncontrolled" ? undefined : open}
          onOpenChange={(next) => {
            record(next ? "open" : "close");
            setOpen(next);
            if (!next && mode === "removed-trigger") setTriggerVisible(false);
          }}
        >
          {triggerVisible && <PopoverTrigger disabled={mode === "disabled"}>Open details</PopoverTrigger>}
          <PopoverContent
            aria-label="Details"
            onOpenAutoFocus={(event) => {
              record("entry");
              if (mode === "keep-trigger") event.preventDefault();
            }}
            onCloseAutoFocus={(event) => {
              record("return");
              if (mode === "removed-trigger") {
                event.preventDefault();
                fallback.current?.focus();
              }
            }}
          >
            <p>Details for the current item.</p>
            {mode !== "text" && <label>First field <input /></label>}
          </PopoverContent>
        </Popover>
        <output aria-hidden="true" data-popover-events>{events.join(" ")}</output>
      </main>
    </KinetixDirectionProvider>
  );
}

export const Lifecycle = { render: () => <Fixture /> };
