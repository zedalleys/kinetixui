/**
 * Live-run configuration (M4C). Everything comes from the environment of the machine running the
 * evidence run; nothing has a default endpoint, and the token is never part of the parsed config object,
 * so printing the config cannot print the token.
 *
 *   KX_HA_URL            wss://<host>/api/websocket (ws:// only with KX_HA_ALLOW_INSECURE=1, for a LAN instance)
 *   KX_HA_TOKEN          a long-lived access token for a Home Assistant user limited to the test entity
 *   KX_HA_ENTITY         the one light.* or switch.* entity under test
 *   KX_HA_TIMEOUT_MS     the request deadline (default 10000)
 *   KX_HA_PHYSICAL_WAIT_MS  optional: how long to wait for an operator to press the device's own switch
 *   KX_HA_EVIDENCE_DIR   where sanitized evidence is written
 */

export type LiveConfig = {
  url: string;
  entityId: string;
  timeoutMs: number;
  physicalWaitMs: number;
  evidenceDir: string;
};

export type LiveConfigResult = { ok: true; config: LiveConfig } | { ok: false; missing: string[]; problems: string[] };

type Env = Readonly<Record<string, string | undefined>>;

export function readLiveConfig(env: Env): LiveConfigResult {
  const missing = ["KX_HA_URL", "KX_HA_TOKEN", "KX_HA_ENTITY", "KX_HA_EVIDENCE_DIR"].filter((name) => !env[name]);
  const problems: string[] = [];
  const url = env.KX_HA_URL ?? "";
  if (url) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      problems.push("KX_HA_URL is not a URL");
    }
    if (parsed) {
      if (parsed.protocol !== "wss:" && !(parsed.protocol === "ws:" && env.KX_HA_ALLOW_INSECURE === "1")) {
        problems.push("KX_HA_URL must use wss:// (ws:// needs KX_HA_ALLOW_INSECURE=1)");
      }
      if (!parsed.pathname.endsWith("/api/websocket")) problems.push("KX_HA_URL must end with /api/websocket");
      if (parsed.username || parsed.password || parsed.search) problems.push("KX_HA_URL must not carry credentials or a query string");
    }
  }
  const entityId = env.KX_HA_ENTITY ?? "";
  if (entityId && !/^(light|switch)\.[a-z0-9_]+$/.test(entityId)) problems.push("KX_HA_ENTITY must be one light.* or switch.* entity");
  const timeoutMs = numberOr(env.KX_HA_TIMEOUT_MS, 10_000, "KX_HA_TIMEOUT_MS", problems);
  const physicalWaitMs = numberOr(env.KX_HA_PHYSICAL_WAIT_MS, 0, "KX_HA_PHYSICAL_WAIT_MS", problems);
  if (missing.length || problems.length) return { ok: false, missing, problems };
  return { ok: true, config: { url, entityId, timeoutMs, physicalWaitMs, evidenceDir: env.KX_HA_EVIDENCE_DIR! } };
}

function numberOr(raw: string | undefined, fallback: number, name: string, problems: string[]): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) problems.push(`${name} must be a non-negative number`);
  return value;
}
