import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStore } from "./file-store";
import { StudioService, ServiceError } from "./service";

/**
 * Where the local store can be interrupted, and what a rejection therefore proves.
 *
 * The editor's save-state vocabulary (M5.22) distinguishes a save that is KNOWN not to have
 * committed from one whose outcome is unknown, and the line it draws is the one these tests
 * measure. Without them the classification would be an assumption about someone else's code.
 */
describe("what a rejected save proves about the stored document", () => {
  const seed = async (dir: string) => {
    await new FileStore(dir).transaction(state => { state.accounts.push({ id: "a1" } as never); return 1; });
  };

  it("a ServiceError raised inside the transaction body leaves the stored file untouched", async () => {
    const dir = await mkdtemp(join(tmpdir(), "m522-reject-"));
    try {
      await seed(dir);
      const before = await readFile(join(dir, "studio.json"), "utf8");
      await expect(new FileStore(dir).transaction(state => {
        state.accounts.push({ id: "never" } as never);
        throw new ServiceError("REVISION_CONFLICT", "declined", 409);
      })).rejects.toBeInstanceOf(ServiceError);
      // The body mutated `state` before throwing, and none of it reached the file: the write and
      // the rename both come after `run` returns. This is why every coded rejection is classified
      // `rejected` rather than `unconfirmed`.
      expect(await readFile(join(dir, "studio.json"), "utf8")).toEqual(before);
      expect(await readFile(join(dir, "studio.json"), "utf8")).not.toContain("never");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it("a transaction can REJECT after the rename has already committed the write", async () => {
    const dir = await mkdtemp(join(tmpdir(), "m522-committed-"));
    try {
      await seed(dir);
      // The lock directory is removed synchronously inside `run`, which runs before writeFile and
      // rename. So the commit proceeds and the `finally` block's rmdir then throws ENOENT.
      await expect(new FileStore(dir).transaction(state => {
        state.accounts.push({ id: "committed-anyway" } as never);
        rmdirSync(join(dir, "transaction.lock"));
        return 2;
      })).rejects.toThrow();
      // The caller saw a failure; the user's data changed. The API route maps any such throw to
      // SAVE_FAILED, which is therefore an UNCONFIRMED outcome and must not claim the stored
      // document is unchanged.
      expect(await readFile(join(dir, "studio.json"), "utf8")).toContain("committed-anyway");
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it("a save the service declines does not advance the stored revision", async () => {
    const dir = await mkdtemp(join(tmpdir(), "m522-service-"));
    try {
      const service = () => new StudioService(new FileStore(dir));
      const token = await service().start();
      const product = await service().create(token, "Conflict probe", "m522-conflict-probe-key");
      await expect(service().save(token, product.id, product.revision + 5, product.doc))
        .rejects.toMatchObject({ code: "REVISION_CONFLICT" });
      const after = await service().load(token, product.id);
      expect(after.revision).toEqual(product.revision);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
