import { NextRequest, NextResponse } from "next/server";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StudioService, ServiceError } from "@/lib/create-studio/service";
import { FileStore } from "@/lib/create-studio/file-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "kinetix-create-local";
const service = () => new StudioService(new FileStore(process.env.KINETIX_CREATE_DEV_DIR ?? join(tmpdir(), "kinetixui-create-m1")));
function developmentAllowed(request: NextRequest) {
  try {
    const host = new URL("http://" + request.headers.get("host"));
    return process.env.NODE_ENV === "development" && process.env.KINETIX_CREATE_DEV === "1" && ["localhost", "127.0.0.1", "[::1]"].includes(host.hostname);
  } catch { return false; }
}
function response(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
function failure(error: unknown) {
  if (error instanceof ServiceError) return response({ code: error.code, message: error.message }, error.status);
  if (error instanceof SyntaxError) return response({ code: "INVALID_REQUEST", message: "The request could not be read." }, 400);
  // Storage paths and operating-system details never cross the response boundary.
  return response({ code: "SAVE_FAILED", message: "The operation could not be saved. Your current draft is unchanged. Download it or retry." }, 422);
}
export async function GET(request: NextRequest) {
  if (!developmentAllowed(request)) return response({ code: "NOT_CONFIGURED", message: "Create Studio's local adapter is available only on an explicitly enabled local development server." }, 404);
  try {
    const token = request.cookies.get(COOKIE)?.value ?? "";
    const id = request.nextUrl.searchParams.get("id");
    return response(id ? await service().load(token, id) : await service().list(token));
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  if (!developmentAllowed(request)) return response({ code: "NOT_CONFIGURED", message: "Local development adapter is not configured." }, 404);
  if (request.headers.get("origin") !== `${request.nextUrl.protocol}//${request.headers.get("host")}`) return response({ code: "ORIGIN_REJECTED", message: "Open Create Studio on this local server before making changes." }, 403);
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 1_050_000) return response({ code: "REQUEST_TOO_LARGE", message: "This request is too large." }, 413);
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || !("operation" in body)) throw new SyntaxError();
    const token = request.cookies.get(COOKIE)?.value ?? "";
    if (body.operation === "session") {
      if (token) { try { return response(await service().list(token)); } catch (e) { if (!(e instanceof ServiceError) || e.code !== "SESSION_REQUIRED") throw e; } }
      const session = await service().start();
      const res = response(await service().list(session));
      res.cookies.set(COOKIE, session, { httpOnly: true, sameSite: "strict", path: "/api/create-studio", maxAge: 60 * 60 * 24 * 30 });
      return res;
    }
    if (body.operation === "create" && "name" in body && typeof body.name === "string" && "key" in body && typeof body.key === "string") return response(await service().create(token, body.name, body.key), 201);
    if (body.operation === "save" && "id" in body && typeof body.id === "string" && "revision" in body && typeof body.revision === "number" && "doc" in body) return response(await service().save(token, body.id, body.revision, body.doc));
    throw new SyntaxError();
  } catch (error) { return failure(error); }
}
