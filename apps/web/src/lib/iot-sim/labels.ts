import { describeMetric } from "@kinetixui/iot/functions";

/** Short badge text for any page that renders simulated data. */
export const SIMULATION_LABEL = "Simulated";

/**
 * The sentence a page must render beside anything driven by this layer. It is deliberately blunt:
 * KinetixUI has no transport, so nothing on a demo page is a real device, reading or command.
 */
export const SIMULATION_DISCLOSURE =
  "Simulated — no device is contacted. Readings, commands and delays are scripted in your browser; nothing is sent over a network.";

/** Attached to activity events that a scenario script produced instead of an automation engine. */
export const SCRIPTED_AUTOMATION_DETAIL = "Scripted demo event — KinetixUI has no automation engine, so no rule was evaluated.";

/** For the camera card demo. There is no stream, image request or recording behind it. */
export const SAMPLE_IMAGE_LABEL = "Sample image — no live feed";

/** For rain-forecast style inputs: KinetixUI fetches no weather data. */
export const APPLICATION_PROVIDED_LABEL = "Application-provided demo data — KinetixUI fetches nothing";

/**
 * The words for a simulated alert's machine `source`.
 *
 * The simulation keeps precise `sim:…` identities on its alerts — they say exactly which rule fired
 * and are what tests, grouping and debugging match on — but an identity is not product copy. This
 * turns one into the sentence fragment a person reads, and returns `undefined` for anything that is
 * not a simulation key so an application's own vocabulary ("battery", "Rule 12") is left alone.
 */
export function simulationSourceLabel(source: string | undefined): string | undefined {
  if (!source?.startsWith("sim:")) return undefined;
  const [, rule, metric] = source.split(":");
  if (rule === "threshold" && metric) return `${describeMetric(metric)} threshold rule`;
  if (rule === "stale" && metric) return `${describeMetric(metric)} reporting check`;
  if (rule === "reachability") return "Reachability check";
  if (rule === "command") return "Command delivery";
  return undefined;
}
