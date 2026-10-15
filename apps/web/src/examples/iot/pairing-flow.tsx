"use client";

import * as React from "react";
import { PairingFailure, PairingMethodPicker, PairingStepper } from "@kinetixui/iot/react";
import {
  KINETIX_PAIRING_METHODS,
  advancePairing,
  describePairingMethod,
  normalizePairingCode,
  startPairingFlow,
  transitionPairing,
  validatePairingCode,
  type KinetixPairingEvent,
  type KinetixPairingFlowState,
  type KinetixPairingMethod,
  type KinetixPairingRecoveryKind,
  type KinetixPairingStage,
} from "@kinetixui/iot/functions";
import { Button, Input, Label, NativeSelect, NativeSelectOption, RadioGroup, RadioGroupItem } from "@kinetixui/ui";
import { pairingDevices, pairingFailureScenarios, pairingHappyPath } from "./scenarios";
import { SimNotice, useReducedMotion } from "./harness";

// kx-iot:start
/**
 * A nine-step pairing reference. The steps a person sees:
 *
 *   1 choose a method   2 searching   3 device found   4 identify   5 verify it is yours
 *   6 configure         7 choose a place   8 check it works   9 done
 *
 * The state machine is the package's, not this file's: `advancePairing` / `transitionPairing` decide
 * what may follow what, and this component only reports intent to it. "Searching" and "found" are two
 * screens inside the machine's one `discover` stage.
 *
 * NO Bluetooth, Wi-Fi or network scanning happens. Durations come from a fixture and run on a small
 * timer here. Under `prefers-reduced-motion` there are no timers: each simulated wait is finished by a
 * button instead, so nothing advances on its own.
 */
const UI_STEPS = ["Choose a method", "Searching", "Device found", "Identify", "Verify it is yours", "Configure", "Choose a place", "Check it works", "Done"] as const;
const PLACES = ["Living room", "Hallway", "Kitchen", "Office", "Bedroom", "Zone 2", "Zone 3", "Utility yard"];
const DEMO_CODE = "KX2468";
/**
 * Each step has one primary action, a library `Button` (Primary, `lg`); Back and Cancel are quiet Outline buttons.
 * Every button that is not a form's submit says `type="button"`: the library `Button` sets no default type, so
 * inside a form an unmarked one would submit it.
 */
const ACTION = "self-start max-w-full whitespace-normal";
/** Stages that begin with a simulated wait; the others begin by asking the person for something. */
const STARTS_WORKING: readonly KinetixPairingStage[] = ["discover", "identify", "verify"];
const durationOf = (stage: KinetixPairingStage) => pairingHappyPath.find((step) => step.stage === stage)?.durationMs ?? 1000;

function uiStepOf(flow: KinetixPairingFlowState, working: boolean): number {
  if (flow.status === "idle" || flow.status === "cancelled") return 0;
  switch (flow.stage) {
    case "discover":
      return working || flow.status === "failed" ? 1 : 2;
    case "identify":
      return 3;
    case "authenticate":
      return 4;
    case "configure":
      return 5;
    case "assign":
      return 6;
    case "verify":
      return 7;
    default:
      return 8;
  }
}

export function PairingFlowExample() {
  const reducedMotion = useReducedMotion();
  const [flow, setFlow] = React.useState<KinetixPairingFlowState>(startPairingFlow);
  // `visit` counts every flow change, so "which wait am I in" can never leak from an earlier visit to a stage.
  const [visit, setVisit] = React.useState(0);
  const [waiting, setWaiting] = React.useState<{ visit: number; working: boolean } | null>(null);
  const [method, setMethod] = React.useState<KinetixPairingMethod>("bluetooth");
  const [scenarioId, setScenarioId] = React.useState("none");
  const [recovered, setRecovered] = React.useState(false);
  const [foundId, setFoundId] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [place, setPlace] = React.useState(PLACES[0]!);
  const [note, setNote] = React.useState("");
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const failureRef = React.useRef<HTMLDivElement>(null);
  const mounted = React.useRef(false);

  const scenario = pairingFailureScenarios.find((s) => s.id === scenarioId);
  const found = pairingDevices[flow.method ?? method].find((d) => d.id === foundId) ?? pairingDevices[flow.method ?? method][0]!;
  const acceptedCode = found.code ?? DEMO_CODE;
  const codeLength = normalizePairingCode(acceptedCode).length;
  const codeShapeOk = validatePairingCode(code, { length: codeLength });

  const working = waiting?.visit === visit ? waiting.working : STARTS_WORKING.includes(flow.stage) && flow.status === "active";
  const uiStep = uiStepOf(flow, working);
  const started = flow.status !== "idle";

  /** Every change to the flow goes through here, and always through the package's machine. */
  const apply = (next: KinetixPairingFlowState) => {
    setFlow(next);
    setVisit((v) => v + 1);
    setNote("");
  };
  const send = (event: KinetixPairingEvent) => apply(advancePairing(flow, event));
  const replayTo = (stage: KinetixPairingStage) => {
    let state = advancePairing(startPairingFlow(), { type: "start", method: flow.method ?? method });
    while (state.stage !== stage && state.status === "active") state = advancePairing(state, { type: "next" });
    apply(state);
  };
  const setWorking = (value: boolean) => setWaiting({ visit, working: value });

  /** A simulated wait has finished: the scripted failure strikes here, or the flow moves on. */
  const workDone = () => {
    if (flow.status !== "active") return;
    const struck = scenario && !recovered && scenario.stage === flow.stage;
    if (struck) return send({ type: "fail", code: scenario.code });
    if (flow.stage === "authenticate" && normalizePairingCode(code) !== normalizePairingCode(acceptedCode)) {
      return send({ type: "fail", code: "authentication-failed" });
    }
    if (flow.stage === "discover" || flow.stage === "identify") return setWorking(false);
    send({ type: "next" });
  };

  React.useEffect(() => {
    if (!working || flow.status !== "active" || reducedMotion) return;
    const timer = setTimeout(workDone, durationOf(flow.stage));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working, visit, reducedMotion]);

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    (flow.status === "failed" ? failureRef.current : headingRef.current)?.focus();
  }, [uiStep, flow.status, visit]);

  const recover = (kind: KinetixPairingRecoveryKind) => {
    const strikes = !!scenario && scenario.stage === flow.stage;
    if (kind === "retry") {
      if (strikes) setRecovered(true);
      setCode("");
      return send({ type: "retry" });
    }
    if (kind === "back") return send({ type: "back" });
    if (kind === "cancel") return send({ type: "cancel" });
    if (kind === "reset") {
      setRecovered(true);
      return replayTo("discover");
    }
    if (kind === "update") {
      setRecovered(true);
      return replayTo(flow.stage);
    }
    setNote(kind === "contact" ? "In a product this would open help. Nothing happens in this demo." : "In a product this would open settings. Nothing happens in this demo.");
  };

  const startOver = () => {
    setFlow(startPairingFlow());
    setVisit((v) => v + 1);
    setRecovered(false);
    setCode("");
    setNote("");
    setFoundId(null);
  };

  const pickScenario = (id: string) => {
    setScenarioId(id);
    setRecovered(false);
    const next = pairingFailureScenarios.find((s) => s.id === id);
    if (next) setMethod(next.method);
  };
  const backAllowed = transitionPairing(flow, { type: "back" }).ok;
  const cancelAllowed = transitionPairing(flow, { type: "cancel" }).ok;

  const heading = flow.status === "cancelled" ? "Setup cancelled" : `Step ${uiStep + 1} of ${UI_STEPS.length}: ${UI_STEPS[uiStep]}`;

  return (
    <section aria-label="Pairing flow" className="flex max-w-3xl flex-col gap-4 sm:gap-6">
      <SimNotice text="Simulated — no Bluetooth, Wi-Fi or network scanning happens. Devices, codes and delays are scripted fixtures in your browser." />

      <div className="flex flex-col gap-1">
        <Label htmlFor="pairing-scenario" className="text-body-md font-normal text-foreground">
          Simulate a failure
        </Label>
        <NativeSelect
          id="pairing-scenario"
          value={scenarioId}
          disabled={started && flow.status !== "cancelled"}
          onChange={(event) => pickScenario(event.target.value)}
          aria-describedby={scenario ? "pairing-scenario-outcome" : undefined}
        >
          <NativeSelectOption value="none">None: pair successfully</NativeSelectOption>
          {pairingFailureScenarios.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.title} ({describePairingMethod(s.method)}, {s.code})
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {scenario ? (
          <span id="pairing-scenario-outcome" className="text-body-sm text-muted-foreground">
            {scenario.recoveryOutcome}
          </span>
        ) : null}
      </div>

      <PairingStepper flow={flow} horizontal />

      <div className="flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-4 shadow-sm sm:p-6">
        <h4 ref={headingRef} tabIndex={-1} className="text-title-lg text-foreground focus-visible:outline-none">
          {heading}
        </h4>

        {flow.status === "failed" ? (
          <PairingFailure ref={failureRef} tabIndex={-1} code={flow.failure} onAction={(_id, action) => recover(action.kind)} className="focus-visible:outline-none" />
        ) : null}

        {flow.status === "cancelled" ? (
          <>
            <p className="text-body-md text-muted-foreground">Nothing was set up, and nothing was stored.</p>
            <Button type="button" size="lg" className={ACTION} onClick={startOver}>
              Start again
            </Button>
          </>
        ) : null}

        {flow.status === "idle" ? (
          <>
            <PairingMethodPicker
              value={method}
              methods={KINETIX_PAIRING_METHODS}
              onChange={(next) => {
                setMethod(next);
                if (scenario && scenario.method !== next) setScenarioId("none");
              }}
            />
            <Button type="button" size="lg" className={ACTION} onClick={() => send({ type: "start", method })}>
              Start setup
            </Button>
          </>
        ) : null}

        {flow.status === "active" && working ? (
          <>
            <p className="text-body-md text-muted-foreground">
              {pairingHappyPath.find((s) => s.stage === flow.stage)?.label}… (simulated, about {(durationOf(flow.stage) / 1000).toFixed(1)} s)
            </p>
            {reducedMotion ? (
              <Button type="button" size="lg" className={ACTION} onClick={workDone}>
                Finish this step
              </Button>
            ) : null}
          </>
        ) : null}

        {flow.status === "active" && !working && flow.stage === "discover" ? (
          <div className="flex min-w-0 flex-col gap-2">
            <p id="pairing-found-devices" className="mb-1 text-title-md text-foreground">
              {pairingDevices[flow.method!].length} sample {pairingDevices[flow.method!].length === 1 ? "device" : "devices"} found (fixture data)
            </p>
            {/* The library RadioGroup: one tab stop, arrow keys move and choose (mirrored under RTL), named by the line above. */}
            <RadioGroup aria-labelledby="pairing-found-devices" value={found.id} onValueChange={setFoundId} className="gap-2">
              {pairingDevices[flow.method!].map((device) => (
                <Label
                  key={device.id}
                  htmlFor={`found-${device.id}`}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-muted/60 px-4 py-2 text-body-md font-normal leading-normal text-foreground has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-primary"
                >
                  <RadioGroupItem id={`found-${device.id}`} value={device.id} />
                  <span className="min-w-0 break-words">
                    {device.name} <span className="text-muted-foreground">· {device.hint}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <Button type="button" size="lg" className={ACTION} onClick={() => send({ type: "next" })}>
              Continue with {found.name}
            </Button>
          </div>
        ) : null}

        {flow.status === "active" && !working && flow.stage === "identify" ? (
          <>
            <p className="text-body-md text-foreground">
              Does <strong className="font-medium">{found.hint}</strong> match the label on your {found.name}?
            </p>
            <Button type="button" size="lg" className={ACTION} onClick={() => send({ type: "next" })}>
              Yes, that is my device
            </Button>
          </>
        ) : null}

        {flow.status === "active" && !working && flow.stage === "authenticate" ? (
          <form
            className="flex min-w-0 flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (codeShapeOk) setWorking(true);
            }}
          >
            <Label htmlFor="pairing-code" className="text-body-md font-normal text-foreground">
              Setup code
            </Label>
            <Input
              id="pairing-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="pairing-code-hint"
              className="max-w-xs font-mono"
            />
            <p id="pairing-code-hint" className="text-body-sm text-muted-foreground">
              {codeLength} characters. Demo code: <span className="font-mono text-foreground">{acceptedCode}</span>. The shape is checked here; only the device can say whether it is the right code.
            </p>
            <Button type="submit" size="lg" disabled={!codeShapeOk} className={ACTION}>
              Verify code
            </Button>
          </form>
        ) : null}

        {flow.status === "active" && !working && flow.stage === "configure" ? (
          <form
            className="flex min-w-0 flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setWorking(true);
            }}
          >
            <Label htmlFor="pairing-name" className="text-body-md font-normal text-foreground">
              Device name
            </Label>
            <Input id="pairing-name" value={name || found.name} onChange={(event) => setName(event.target.value)} className="max-w-xs" />
            <Button type="submit" size="lg" className={ACTION}>
              Apply settings
            </Button>
          </form>
        ) : null}

        {flow.status === "active" && !working && flow.stage === "assign" ? (
          <form
            className="flex min-w-0 flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setWorking(true);
            }}
          >
            <Label htmlFor="pairing-place" className="text-body-md font-normal text-foreground">
              Room or zone
            </Label>
            <div className="max-w-xs">
              <NativeSelect id="pairing-place" value={place} onChange={(event) => setPlace(event.target.value)}>
                {PLACES.map((p) => (
                  <NativeSelectOption key={p}>{p}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <Button type="submit" size="lg" className={ACTION}>
              Place it here
            </Button>
          </form>
        ) : null}

        {flow.status === "complete" ? (
          <>
            <p className="text-body-md text-foreground">
              {name || found.name} is set up in {place}. It responded when checked.
            </p>
            <p className="text-body-sm text-muted-foreground">Simulated: no device was paired, connected to or stored.</p>
            <Button type="button" size="lg" className={ACTION} onClick={startOver}>
              Pair another device
            </Button>
          </>
        ) : null}

        {note ? <p className="text-body-sm text-muted-foreground">{note}</p> : null}
      </div>

      {started && flow.status !== "complete" && flow.status !== "cancelled" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="Outline" size="lg" disabled={!backAllowed} onClick={() => send({ type: "back" })}>
            Back
          </Button>
          <Button type="button" variant="Outline" size="lg" disabled={!cancelAllowed} onClick={() => send({ type: "cancel" })}>
            Cancel setup
          </Button>
        </div>
      ) : null}
    </section>
  );
}
// kx-iot:end
