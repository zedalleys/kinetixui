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
