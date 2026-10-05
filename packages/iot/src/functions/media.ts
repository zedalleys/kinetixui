import type { KinetixControlPresentation, KinetixMediaPlaybackRequest, KinetixMediaPlaybackState } from "../types/control";
import { describeControlOutcome, type DescribeControlOutcomeOptions } from "./control";

/**
 * Media endpoint helpers: playback state, time and the sentences a media control announces.
 *
 * KinetixUI owns the interaction and its truth; the application owns playback itself. Nothing here
 * plays, streams, decodes or connects to anything.
 */

/** Normalise anything into a {@link KinetixMediaPlaybackState}. Unrecognised is `unknown`, never `paused`. */
export function normalizeMediaPlaybackState(value: unknown): KinetixMediaPlaybackState {
  if (typeof value !== "string") return "unknown";
  const key = value.trim().toLowerCase();
  if (key === "playing" || key === "paused" || key === "stopped" || key === "buffering") return key;
  return "unknown";
}

/** What a play/pause press asks for: pause while the device plays (or buffers), play otherwise. */
export function nextPlaybackRequest(shown: KinetixMediaPlaybackState): KinetixMediaPlaybackRequest {
  return shown === "playing" || shown === "buffering" ? "paused" : "playing";
}

/** The playback headline. While a request is open it is the request's direction, never its result. */
export function describePlaybackState(reported: KinetixMediaPlaybackState, requested?: KinetixMediaPlaybackRequest | null): string {
  if (requested && requested !== reported) return requested === "playing" ? "Starting playback" : "Pausing";
  switch (reported) {
    case "playing":
      return "Playing";
    case "paused":
      return "Paused";
    case "stopped":
      return "Stopped";
    case "buffering":
      return "Buffering";
    case "unknown":
      return "Playback state unknown";
  }
}

const isSeconds = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

/** `1:05`, `12:00`, `1:02:03`. A missing or negative time is `--:--`, never `0:00`. */
export function formatMediaTime(seconds: number | null | undefined): string {
  if (!isSeconds(seconds)) return "--:--";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * A time as it is said: "1 minute 5 seconds", "1 hour 2 minutes", "0 seconds". `unknown` when missing.
 * Used for `aria-valuetext`, because "1:05" is read aloud inconsistently.
 */
export function describeMediaTime(seconds: number | null | undefined): string {
  if (!isSeconds(seconds)) return "unknown";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [h ? unit(h, "hour") : "", m ? unit(m, "minute") : "", s || (!h && !m) ? unit(s, "second") : ""].filter(Boolean);
  return parts.join(" ");
}

/** The sentence options a play/pause request uses with `describeControlOutcome`. */
export const PLAYBACK_SENTENCE: DescribeControlOutcomeOptions = {
  formatValue: (value) => normalizeMediaPlaybackState(value),
  pendingPhrase: (value) => (value === "playing" ? "Starting playback" : "Pausing"),
  failedPhrase: (value) => (value === "playing" ? "Could not start playback" : "Could not pause"),
};

/** "Starting playback, waiting for the device." → "Playing." or "Could not start playback. The device still reports paused." */
export function describePlaybackOutcome(presentation: KinetixControlPresentation): string {
  return describeControlOutcome(presentation, PLAYBACK_SENTENCE);
}

/** The sentence options a mute request uses with `describeControlOutcome`. */
export const MUTE_SENTENCE: DescribeControlOutcomeOptions = {
  formatValue: (value) => (value === true ? "muted" : value === false ? "unmuted" : "unknown"),
  pendingPhrase: (value) => (value === true ? "Muting" : "Unmuting"),
  failedPhrase: (value) => (value === true ? "Could not mute" : "Could not unmute"),
};

/** The sentence options a seek uses: "Seeking to 2 minutes, waiting for the device." */
export const SEEK_SENTENCE: DescribeControlOutcomeOptions = {
  formatValue: (value) => describeMediaTime(value as number),
  pendingPhrase: (value) => `Seeking to ${describeMediaTime(value as number)}`,
  failedPhrase: (value) => `Could not seek to ${describeMediaTime(value as number)}`,
};
