import { searchProjection } from "@/lib/search-projection";

/**
 * /search-index.json — the command menu's blocks, use cases and component business terms, built once at build time
 * from the repository's own data (lib/search-projection.ts). Static: no request ever runs this code.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(searchProjection());
}
