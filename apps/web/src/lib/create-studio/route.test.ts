// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GET, POST } from "../../app/api/create-studio/route";
let directory: string;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), "create-route-")); vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("KINETIX_CREATE_DEV", "1"); vi.stubEnv("KINETIX_CREATE_DEV_DIR", directory); });
afterEach(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
function req(body?: unknown, extra: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3137/api/create-studio", { method: body ? "POST" : "GET", headers: { host: "127.0.0.1:3137", origin: "http://127.0.0.1:3137", ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
it("never enables the local account adapter in production, even with its flag", async () => {
  vi.stubEnv("NODE_ENV", "production");
  expect((await GET(req())).status).toBe(404);
  expect((await POST(req({ operation: "session" }))).status).toBe(404);
});
it("rejects nonlocal hosts, foreign/missing/malformed origins and absent sessions", async () => {
  expect((await POST(req({ operation: "session" }, { origin: "https://attacker.test" }))).status).toBe(403);
  expect((await POST(req({ operation: "session" }, { origin: "garbage" }))).status).toBe(403);
  expect((await POST(req({ operation: "session" }, { host: "attacker.test" }))).status).toBe(404);
  expect((await GET(req())).status).toBe(401);
});
it("uses a scoped HttpOnly cookie and enforces capacity at the HTTP boundary", async () => {
  const started = await POST(req({ operation: "session" }));
  expect(started.status).toBe(200);
  const setCookie = started.headers.get("set-cookie")!;
  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("SameSite=strict");
  expect(started.headers.get("cache-control")).toBe("no-store");
  const cookie = setCookie.split(";")[0];
  expect((await POST(req({ operation: "create", name: "First", key: "request_first" }, { cookie }))).status).toBe(201);
  const denied = await POST(req({ operation: "create", name: "Second", key: "request_second" }, { cookie }));
  expect(denied.status).toBe(403);
  expect((await denied.json()).code).toBe("PRODUCT_LIMIT_REACHED");
});
