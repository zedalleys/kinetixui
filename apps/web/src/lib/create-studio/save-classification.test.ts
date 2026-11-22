/**
 * Which save failures prove the store was not touched, and which leave the question open.
 *
 * `classifySaveFailure` is the whole line between "Save failed" and "Save unconfirmed", so it is
 * tested over EVERY code the API can return rather than over the two or three a browser gate
 * happens to reach. A code added to the API without a decision recorded here lands in the
 * unconfirmed half by default, which is the safe direction: it claims less than is known rather
 * than more.
 */
import { describe, expect, it } from "vitest";
import { classifySaveFailure, ApiError } from "../../components/create-studio/create-studio";

/** Raised inside `FileStore.transaction`'s body, or by the route before the service is called. */
const REJECTED = [
  "NOT_CONFIGURED", "ORIGIN_REJECTED", "SESSION_REQUIRED", "NOT_FOUND", "PRODUCT_LIMIT_REACHED",
  "PRODUCT_READ_ONLY", "REVISION_CONFLICT", "IDENTITY_REWIND", "INVALID_DOCUMENT",
  "INVALID_REQUEST", "REQUEST_TOO_LARGE", "DOCUMENT_UNREADABLE",
] as const;

describe("classifySaveFailure", () => {
  it.each(REJECTED)("treats %s as a definite rejection, because it is raised before the write", (code) => {
    expect(classifySaveFailure(new ApiError(code, "x"))).toBe("rejected");
  });

  it("treats the route's catch-all as unconfirmed", () => {
    // SAVE_FAILED is the route's last resort, and `FileStore.transaction` can throw from the
    // `finally` that releases its lock — AFTER `rename` has committed. See commit-ordering.test.ts.
    expect(classifySaveFailure(new ApiError("SAVE_FAILED", "x"))).toBe("unconfirmed");
  });

  it("treats a transport failure as unconfirmed", () => {
    expect(classifySaveFailure(new TypeError("Failed to fetch"))).toBe("unconfirmed");
  });

  it("treats an unreadable reply as unconfirmed", () => {
    expect(classifySaveFailure(new SyntaxError("Unexpected end of JSON input"))).toBe("unconfirmed");
  });

  it("defaults an unknown code to unconfirmed rather than to a definite failure", () => {
    expect(classifySaveFailure(new ApiError("SOME_FUTURE_CODE", "x"))).toBe("unconfirmed");
  });
});
