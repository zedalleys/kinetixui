/**
 * The business discovery routes (/capabilities and each /use-cases/<domain> page), on their own.
 *
 * `seo.ts` lists every public route, and it is imported by client code (the analytics route list, the docs
 * breadcrumb). Reading these from discovery-index.json there put the whole ~90 KB index into the shared client
 * bundle (measured: the docs layout chunk set grew by 62 KB raw). `pnpm gen:capabilities` writes this list beside the
 * index from the same data, and `check:capabilities` fails if it is stale.
 */
import routes from "../../../../discovery-routes.json";

/** Routes the sitemap and `check:seo` must know about. Derived, so a new domain page is listed the day it is flagged. */
export const DISCOVERY_ROUTES: readonly string[] = routes.routes;
