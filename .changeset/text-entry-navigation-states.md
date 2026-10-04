---
"@kinetixui/ui": patch
"@kinetixui/angular": patch
---

Text entry and tabs get one state contract (TOKENS.md, "Text entry and navigation"), and the Switch thumb
follows its own direction.

**Fields: Input, Textarea, Select's trigger, NativeSelect.** The resting edge was `--input`, measured at 2.21:1
(light) and 2.44:1 (dark) on a card, which is below the 3:1 that SC 1.4.11 asks of the only thing marking where
an empty field is. It is now `--muted-foreground` at 80%: 3.41:1 and 5.40:1. Hover used to change no pixel.
Now a pointer that can hover steps the edge to full `--muted-foreground`. It never does so on a field that is
focused, open, invalid, read-only or disabled, so hover cannot take over a stronger state. Read-only Input and
Textarea get an inset `--muted` fill and no hover, so they no longer look editable. NativeSelect shows its
empty-valued placeholder option in `--muted-foreground`, as the other fields show placeholders.

**Tabs.** The list is now an inset `--surface-grouped` well and the selected tab is a small raised surface on
it: `--card`, the Card's half-strength edge, and `sm` depth. Before, in dark mode the selected tab sat below
its list (`--background` on `--muted`). An unselected tab answers hover with the same 8% `--foreground` layer
as the selection controls. The focus ring is drawn above the selected surface. At 200% text, tabs wrap inside
the list instead of running off a narrow page (`min-h-9 flex-wrap`, which is identical at the default size).

**Switch.** A checked switch inside an LTR section of an RTL page drew its thumb 22px outside the track. This
happened because Tailwind's `rtl:` variant matches any rtl ancestor. The thumb now travels with
`inset-inline-start`, which the browser resolves against the switch's own direction.

**Angular.** The same contract is in `styles.css` for `kxInput`, `kxTextarea`, `kxNativeSelect` and the tabs
(Angular keeps its underlined tab strip). It also fixes four Angular defects:

- A disabled tab changed colour on hover.
- An invalid native select drew the default focus ring instead of the destructive one.
- `kx-input` and `kx-tab` were missing from the reduced-motion list.
- `kx-switch` had the same mixed-direction thumb defect as React.

No API changed, and no token was added.
