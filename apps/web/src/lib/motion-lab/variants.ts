/**
 * The lab's motion variants, as data.
 *
 * A variant is a named BEHAVIOUR composed from the motion contract's own tiers and curves — never a
 * duration a consumer chose. That is the same device `TabsMotion` uses in `@kinetixui/ui`, and for the
 * same reason: a preset cannot introduce a timing the contract does not know about, so the lab can offer
 * choice without forking the motion system. `--duration-*` and `--easing-*` are the generated token
 * variables; this file names them and never restates their values.
 *
 * Variants change HOW a selection moves. They never change what is selected, what is announced, what is
 * focusable, or the order of anything — see `LAB_VARIANT_INVARIANTS` below, which the browser gate holds
 * the lab to across every variant.
 */

/** How a shared indicator gets from one chosen item to the next. */
export type LabTravel = "glide" | "phased" | "spring" | "fade" | "none";

export const LAB_TRAVELS: readonly LabTravel[] = ["glide", "phased", "spring", "fade", "none"];

/** Which geometry the indicator moves. Not a style choice: it is the performance/correctness trade-off the lab exists to measure. */
export type LabTechnique = "inset" | "transform";

export const LAB_TECHNIQUES: readonly LabTechnique[] = ["inset", "transform"];

export interface LabTravelContract {
  readonly travel: LabTravel;
  readonly label: string;
  /** What moves, in one line a designer can read. */
  readonly effect: string;
  /** The motion-contract role this borrows its pairing from, or null when it animates no travel. */
  readonly role: "selection-indicator" | "selection-state" | null;
  /** Token variables only — never a number. */
  readonly duration: readonly string[];
  readonly easing: readonly string[];
  /** How an interrupted run reaches a new target. This is the column the lab exists to make true. */
  readonly retarget: string;
  /** What a reader who asked for less motion gets instead. Every variant resolves to the same end state. */
  readonly reduced: string;
}

export const LAB_TRAVEL_CONTRACTS: readonly LabTravelContract[] = [
  {
    travel: "glide",
    label: "Glide",
    effect: "One indicator moves to the chosen item, both of its edges together.",
    role: "selection-indicator",
    duration: ["--duration-base"],
    easing: ["--easing-emphasized"],
    retarget:
      "The CSS transition is replaced mid-flight. The browser restarts from the indicator's current computed inset, so the indicator continues from where it is drawn — but from rest, because a transition carries position across an interruption and not velocity.",
    reduced: "No travel. The indicator is placed on the chosen item in one frame.",
  },
  {
    travel: "phased",
    label: "Phased",
    effect:
      "The edge the indicator is heading towards leaves first and the trailing edge follows a whole tier later, so the indicator stretches across the gap and then draws itself in.",
    role: "selection-indicator",
    duration: ["--duration-base"],
    easing: ["--easing-standard"],
    retarget:
      "Same replacement as Glide, with one extra hazard the gate measures: an interruption during the trailing edge's delay must not re-arm that delay from the start, or the indicator hangs stretched.",
    reduced: "No travel, and no phasing: both edges are placed together.",
  },
  {
    travel: "spring",
    label: "Spring",
    effect:
      "The indicator is pulled to the chosen item by a damped spring just under critical, so it arrives physical rather than eased.",
    role: "selection-indicator",
    duration: ["--duration-base"],
    easing: [],
    retarget:
      "The only variant that keeps VELOCITY. The oscillator's position and speed are state, so a new target is handed to the same spring: an indicator interrupted at speed continues at that speed instead of stalling. This is why the lab integrates rather than sampling a curve.",
    reduced: "The spring is not started. The indicator is placed on the chosen item in one frame.",
  },
  {
    travel: "fade",
    label: "Fade",
    effect:
      "The indicator does not travel. It fades out, is placed on the chosen item, and fades back in — the quiet option for dense or long tracks where travel reads as noise.",
    role: "selection-state",
    duration: ["--duration-fast"],
    easing: ["--easing-standard"],
    retarget:
      "A second change during the fade retargets the placement, not the opacity: the indicator never fades twice for one selection, and never lands on a stale item.",
    reduced: "No fade. The indicator is placed on the chosen item at full opacity in one frame.",
  },
  {
    travel: "none",
    label: "Instant",
    effect: "The indicator is placed on the chosen item with no interpolation.",
    role: null,
    duration: [],
    easing: [],
    retarget: "There is nothing to interrupt.",
    reduced: "Identical. This is what every other variant resolves to under a reduced-motion preference.",
  },
];

export const labTravelContract = (travel: LabTravel): LabTravelContract =>
  LAB_TRAVEL_CONTRACTS.find((c) => c.travel === travel) ?? LAB_TRAVEL_CONTRACTS[LAB_TRAVEL_CONTRACTS.length - 1];

/**
 * What a variant may never change. The browser gate asserts every one of these for every variant, which is
 * what makes "variants must not change keyboard or screen-reader semantics" a check rather than a promise.
 */
export const LAB_VARIANT_INVARIANTS: readonly string[] = [
  "the chosen item's accessible selected state (aria-checked / aria-selected) is set on the interaction, never on animation end",
  "exactly one item in a track is selected at any time, including during travel",
  "the number and order of tab stops is identical across variants",
  "a visible focus ring is present on the focused item throughout and after travel",
  "a disabled item cannot be chosen by pointer or by keyboard",
  "the indicator is not the only selection cue: the chosen item's own colour pair carries it at rest",
  "under forced colours the indicator is hidden and the item's system SelectedItem pair carries selection",
];

/** The slider's own motion layers, which are additive rather than exclusive: a reader can have the bubble without the spring. */
export type LabSliderLayer = "press" | "bubble" | "springRelease" | "ticks";

export const LAB_SLIDER_LAYERS: readonly { layer: LabSliderLayer; label: string; effect: string; duration: readonly string[]; easing: readonly string[]; reduced: string }[] = [
  {
    layer: "press",
    label: "Press response",
    effect: "The thumb grows while it is held, so the control answers the pointer before the value moves.",
    duration: ["--duration-instant"],
    easing: ["--easing-standard"],
    reduced: "The thumb takes its held size in one frame; the size difference itself is kept, because it is a state cue and not decoration.",
  },
  {
    layer: "bubble",
    label: "Value bubble",
    effect: "A bubble carrying the current value rises above the thumb while it is held or focused.",
    duration: ["--duration-fast"],
    easing: ["--easing-enter", "--easing-exit"],
    reduced: "The bubble appears and disappears without the rise or the fade. It is aria-hidden in every case: the thumb already announces the value, and a second live source would double every announcement.",
  },
  {
    layer: "springRelease",
    label: "Spring release",
    effect: "On release the thumb settles onto its step with the same spring the indicator uses, so a snap reads as a settle.",
    duration: ["--duration-base"],
    easing: [],
    reduced: "The thumb is placed on its step in one frame. The committed value is identical either way — the spring is never the thing that decides the value.",
  },
  {
    layer: "ticks",
    label: "Tick marks",
    effect: "Steps are drawn on the track, and the one under the thumb brightens as it is passed.",
    duration: ["--duration-instant"],
    easing: ["--easing-standard"],
    reduced: "Ticks still brighten; only the interpolation goes.",
  },
];
