/**
 * Attach a DevTools name without leaving a top-level side effect behind.
 *
 * `Component.displayName = "Component"` is a property assignment on a module-level binding, and a
 * bundler cannot prove that dropping it is safe. So it keeps the assignment — and therefore the
 * component, and therefore every component reachable from the entry barrel, even when the consumer
 * imported exactly one.
 *
 * That is not theoretical. Measured on this package with esbuild (`--bundle --minify`, React
 * external): importing one component produced **45.91 KB**, importing all twenty-one produced
 * **46.54 KB** — one component cost 98.6% of the library. Stripping the twenty-three assignments
 * from the built output and re-measuring the same import produced **3.97 KB**, a 91% reduction, which
 * identifies the assignments as the sole cause rather than a contributing one.
 *
 * Wrapping the assignment in a call annotated `/* @__PURE__ *\/` tells the bundler the whole
 * expression may be discarded when its result is unused. The name still reaches React DevTools for
 * anyone who does use the component; it simply stops pinning the other twenty.
 *
 * `sideEffects: false` in `package.json` does not solve this on its own: it lets a bundler drop an
 * unused *module*, and `tsup` has already merged these modules into one chunk by then.
 */
export function withDisplayName<T>(component: T, displayName: string): T {
  (component as { displayName?: string }).displayName = displayName;
  return component;
}
