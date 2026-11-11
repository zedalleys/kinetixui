import { mkdir, readFile, writeFile, rename, rmdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { emptyDatabase, type Database, type TransactionStore } from "./service";
/** Local single-file adapter, not a production database. mkdir is an inter-process lock. */
export class FileStore implements TransactionStore {
  constructor(private directory: string) {}
  async transaction<T>(run: (state: Database) => T): Promise<T> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lock = join(this.directory, "transaction.lock");
    const deadline = Date.now() + 5000;
    while (true) {
      try { await mkdir(lock); break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        if (Date.now() >= deadline) throw new Error("Local storage is busy. Retry; if the server stopped during a write, inspect transaction.lock before removing it.");
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    const file = join(this.directory, "studio.json");
    const temporary = join(this.directory, `write-${randomUUID()}.tmp`);
    try {
      let state: Database;
      try { state = JSON.parse(await readFile(file, "utf8")); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") state = emptyDatabase(); else throw error; }
      if (state.version !== 1 || !Array.isArray(state.accounts) || !Array.isArray(state.products) || !Array.isArray(state.receipts)) throw new Error("Unrecognized local storage. Preserve the file and restore a compatible version.");
      const result = run(state);
      await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: "wx" });
      await rename(temporary, file);
      return structuredClone(result);
    } finally {
      await unlink(temporary).catch(() => undefined);
      await rmdir(lock);
    }
  }
}
