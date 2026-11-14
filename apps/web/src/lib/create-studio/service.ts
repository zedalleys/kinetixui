import { createHash, randomBytes, randomUUID } from "node:crypto";
import { assertDocument, createDocument, serializeDocument, walk, type Document } from "./model";
export class ServiceError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
export type Account = { id: string; workspaceId: string; sessionHash: string; paid: null | { productLimit: number; expiresAt: number }; freeProductId: string | null };
export type Product = { id: string; accountId: string; workspaceId: string; revision: number; doc: Document };
export type Database = { version: 1; accounts: Account[]; products: Product[]; receipts: { accountId: string; key: string; hash: string; productId: string }[] };
export type TransactionStore = { transaction<T>(run: (state: Database) => T): Promise<T> };
export const emptyDatabase = (): Database => ({ version: 1, accounts: [], products: [], receipts: [] });
export const sessionHash = (token: string) => createHash("sha256").update(token).digest("hex");
const digest = (value: unknown) => createHash("sha256").update(serializeDocument(value)).digest("hex");
export class StudioService {
  constructor(private store: TransactionStore, private now = () => Date.now()) {}
  private account(state: Database, token: string): Account {
    const account = state.accounts.find(a => a.sessionHash === sessionHash(token));
    if (!account) throw new ServiceError("SESSION_REQUIRED", "Start your local workspace again.", 401);
    return account;
  }
  private limit(account: Account): number { return account.paid && account.paid.expiresAt > this.now() ? account.paid.productLimit : 1; }
  private view(account: Account, product: Product) {
    return { ...product, readOnly: this.limit(account) === 1 && product.id !== account.freeProductId };
  }
  async start() {
    const token = randomBytes(32).toString("hex");
    const account: Account = { id: randomUUID(), workspaceId: randomUUID(), sessionHash: sessionHash(token), paid: null, freeProductId: null };
    await this.store.transaction(state => { state.accounts.push(account); });
    return token;
  }
  async list(token: string) {
    return this.store.transaction(state => {
      const account = this.account(state, token);
      return { accountId: account.id, workspaceId: account.workspaceId, productLimit: this.limit(account), products: state.products.filter(p => p.accountId === account.id).map(p => ({ id: p.id, name: p.doc.name, revision: p.revision, readOnly: this.view(account, p).readOnly })) };
    });
  }
  async create(token: string, name: string, key: string) {
    if (!name.trim() || name.length > 120 || !/^[A-Za-z0-9_-]{8,128}$/.test(key)) throw new ServiceError("INVALID_REQUEST", "Enter a product name and a valid request key.");
    return this.store.transaction(state => {
      const account = this.account(state, token);
      const hash = digest({ name });
      const receipt = state.receipts.find(r => r.accountId === account.id && r.key === key);
      if (receipt) {
        if (receipt.hash !== hash) throw new ServiceError("IDEMPOTENCY_CONFLICT", "This request key belongs to a different product name.", 409);
        const product = state.products.find(p => p.id === receipt.productId && p.accountId === account.id);
        if (!product) throw new ServiceError("NOT_FOUND", "Product not found.", 404);
        return this.view(account, product);
      }
      const products = state.products.filter(p => p.accountId === account.id);
      if (products.length >= this.limit(account)) throw new ServiceError("PRODUCT_LIMIT_REACHED", "Your free plan includes one product, with multiple pages and screens. Additional products require a subscription.", 403);
      const id = "proj_" + randomUUID().replaceAll("-", "");
      const product: Product = { id, accountId: account.id, workspaceId: account.workspaceId, revision: 1, doc: createDocument(id, name.trim(), new Date(this.now()).toISOString()) };
      state.products.push(product);
      account.freeProductId ??= id;
      state.receipts.push({ accountId: account.id, key, hash, productId: id });
      return this.view(account, product);
    });
  }
  async load(token: string, id: string) {
    return this.store.transaction(state => {
      const account = this.account(state, token);
      const product = state.products.find(p => p.id === id && p.accountId === account.id && p.workspaceId === account.workspaceId);
      if (!product) throw new ServiceError("NOT_FOUND", "Product not found.", 404);
      assertDocument(product.doc);
      return this.view(account, product);
    });
  }
  async save(token: string, id: string, revision: number, input: unknown) {
    assertDocument(input);
    return this.store.transaction(state => {
      const account = this.account(state, token);
      const product = state.products.find(p => p.id === id && p.accountId === account.id && p.workspaceId === account.workspaceId);
      if (!product) throw new ServiceError("NOT_FOUND", "Product not found.", 404);
      if (this.view(account, product).readOnly) throw new ServiceError("PRODUCT_READ_ONLY", "This product is read-only after your subscription ended. Your work is preserved.", 403);
      if (input.id !== product.id) throw new ServiceError("INVALID_DOCUMENT", "A saved document must retain its product identity.", 422);
      if (!Number.isInteger(revision) || revision < 1) throw new ServiceError("INVALID_REQUEST", "Missing saved revision.");
      if (revision !== product.revision) {
        if (revision === product.revision - 1 && digest(input) === digest(product.doc)) return this.view(account, product);
        throw new ServiceError("REVISION_CONFLICT", "A newer revision exists. Download your draft, then reopen the saved product.", 409);
      }
      const oldLive = new Set<string>(); const newLive = new Set<string>();
      product.doc.pages.forEach(p => walk(p.root, n => oldLive.add(n.id)));
      input.pages.forEach(p => walk(p.root, n => newLive.add(n.id)));
      const retired = new Set(input.retiredNodeIds);
      if (input.nextNodeId < product.doc.nextNodeId || [...product.doc.retiredNodeIds ?? []].some(id => !retired.has(id)) || [...oldLive].some(id => !newLive.has(id) && !retired.has(id))) throw new ServiceError("IDENTITY_REWIND", "Saving cannot rewind or reuse allocated identities.", 422);
      if (digest(input) !== digest(product.doc)) { product.doc = structuredClone(input); product.revision++; }
      return this.view(account, product);
    });
  }
  /** Test/development integration seam; deliberately not exposed by any HTTP operation. */
  async setEntitlement(token: string, paid: Account["paid"]) {
    if (paid && (!Number.isInteger(paid.productLimit) || paid.productLimit < 2 || !Number.isFinite(paid.expiresAt))) throw new Error("Invalid development entitlement");
    return this.store.transaction(state => { this.account(state, token).paid = paid; });
  }
}
