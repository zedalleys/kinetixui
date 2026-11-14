// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStore } from "./file-store";
import { StudioService } from "./service";
import { execute, newHistory } from "./commands";
async function fixture(run: (service: StudioService, directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "kinetix-create-test-"));
  try { await run(new StudioService(new FileStore(directory)), directory); } finally { await rm(directory, { recursive: true, force: true }); }
}
describe("local development service: server-side account/ownership/quota boundary", () => {
  it("serializes concurrent free product creation across independent adapter instances", async () => fixture(async (service, directory) => {
    const token = await service.start();
    const other = new StudioService(new FileStore(directory));
    const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => (i % 2 ? service : other).create(token, "Product", "request_" + i)));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect((await service.list(token)).products).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected").every(r => r.status === "rejected" && r.reason.code === "PRODUCT_LIMIT_REACHED")).toBe(true);
  }));
  it("replays the same creation and rejects changed payload with the same key", async () => fixture(async service => {
    const token = await service.start();
    const a = await service.create(token, "Product", "request_one");
    const b = await service.create(token, "Product", "request_one");
    expect(a.id).toBe(b.id);
    await expect(service.create(token, "Changed", "request_one")).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  }));
  it("rejects foreign account reads/writes and unrecognized sessions", async () => fixture(async service => {
    const a = await service.start(), b = await service.start();
    const product = await service.create(a, "Private", "request_one");
    await expect(service.load(b, product.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.save(b, product.id, 1, product.doc)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.list("forged")).rejects.toMatchObject({ code: "SESSION_REQUIRED" });
  }));
  it("persists across service instances; conditional save rejects a stale writer", async () => fixture(async (service, directory) => {
    const token = await service.start();
    const p = await service.create(token, "Original", "request_one");
    const edited = execute(newHistory(p.doc), { type: "page", name: "Second screen" }).doc;
    const saved = await service.save(token, p.id, p.revision, edited);
    expect(saved.doc.pages).toHaveLength(2);
    expect(saved.revision).toBe(2);
    const restarted = new StudioService(new FileStore(directory));
    expect((await restarted.load(token, p.id)).doc).toEqual(edited);
    await expect(restarted.save(token, p.id, 1, { ...edited, name: "Stale" })).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    expect((await restarted.save(token, p.id, 1, edited)).revision).toBe(2); // lost ACK replay
  }));
  it("saves and reopens a 201-page free product without increasing its product count", async () => fixture(async (service, directory) => {
    const token = await service.start();
    const product = await service.create(token, "Many screens", "request_one");
    let history = newHistory(product.doc);
    for (let i = 2; i <= 201; i++) {
      history = execute(history, { type: "page", name: "Screen " + i });
    }
    await service.save(token, product.id, product.revision, history.doc);
    const restarted = new StudioService(new FileStore(directory));
    expect((await restarted.load(token, product.id)).doc.pages).toEqual(history.doc.pages);
    expect((await restarted.list(token)).products).toHaveLength(1);
    await expect(restarted.create(token, "Second product", "request_two")).rejects.toMatchObject({ code: "PRODUCT_LIMIT_REACHED" });
  }));
  it("preserves paid excess products read-only at expiry, without relying on a webhook", async () => fixture(async (_service, directory) => {
    let now = 1000;
    const service = new StudioService(new FileStore(directory), () => now);
    const token = await service.start();
    const first = await service.create(token, "Free", "request_one");
    await service.setEntitlement(token, { productLimit: 2, expiresAt: 2000 });
    const second = await service.create(token, "Paid", "request_two");
    now = 2000;
    expect((await service.load(token, first.id)).readOnly).toBe(false);
    expect((await service.load(token, second.id)).readOnly).toBe(true);
    await expect(service.save(token, second.id, 1, { ...second.doc, name: "No" })).rejects.toMatchObject({ code: "PRODUCT_READ_ONLY" });
    expect((await service.list(token)).products).toHaveLength(2);
  }));
  it("fails safely on corrupt storage and validation errors without overwriting saved data", async () => fixture(async (service, directory) => {
    const token = await service.start();
    const p = await service.create(token, "Safe", "request_one");
    await expect(service.save(token, p.id, 1, { ...p.doc, schemaVersion: 999 })).rejects.toThrow();
    expect((await service.load(token, p.id)).doc.name).toBe("Safe");
    const path = join(directory, "studio.json");
    await writeFile(path, "{corrupt");
    await expect(service.list(token)).rejects.toThrow();
    expect(await readFile(path, "utf8")).toBe("{corrupt");
  }));
  it("rejects product identity replacement and identity-frontier rewind", async () => fixture(async service => {
    const token = await service.start(), p = await service.create(token, "Safe", "request_one");
    await expect(service.save(token, p.id, 1, { ...p.doc, id: "proj_someother" })).rejects.toMatchObject({ code: "INVALID_DOCUMENT" });
    const removed = structuredClone(p.doc);
    removed.pages[0].root.children = [];
    await expect(service.save(token, p.id, 1, removed)).rejects.toMatchObject({ code: "IDENTITY_REWIND" });
  }));
  it("rejects a newly live ID below the saved frontier and accepts the next allocation", async () => fixture(async service => {
    const token = await service.start();
    const product = await service.create(token, "Frontier", "request_one");
    const saved = await service.save(token, product.id, product.revision, { ...product.doc, nextNodeId: 8 });
    const next = execute(newHistory(saved.doc), { type: "insert", parentId: "node_2", ref: "component:Button" }).doc;
    const earlier = structuredClone(next);
    earlier.pages[0].root.children![0].children![0].id = "node_7";
    await expect(service.save(token, product.id, saved.revision, earlier)).rejects.toMatchObject({ code: "IDENTITY_REWIND" });
    expect((await service.load(token, product.id)).revision).toBe(saved.revision);
    expect((await service.save(token, product.id, saved.revision, next)).doc).toEqual(next);
  }));
});
