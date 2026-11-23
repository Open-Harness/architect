import { Effect } from "effect";
import { Wire } from "@orthograph/portal";
import { ServedPortalUnavailable, type OpenOptions, type ServedPortal } from "../types.ts";

/**
 * The page of a route as a person sees it, for the grid's evals: the project's blueprint served (the data API from the server half,
 * the built client at `/portal`) and the route opened in Chromium. One served portal per blueprint, opened on the first route and
 * closed with `closeAll`. A page that is not a 200, or a portal that cannot be served, is `undefined`; the second says why once, through
 * `onUnavailable` (the entry file prints it), so a red eval has its K19 reason next to it.
 */
export const pagesOf = (
  open: (options: OpenOptions) => Promise<ServedPortal>,
  wire: unknown,
  serve: Omit<OpenOptions, "context"> = {},
  onUnavailable: (message: string) => void = () => undefined,
) => {
  let portal: Promise<ServedPortal | undefined> | undefined;
  const served = (): Promise<ServedPortal | undefined> => {
    portal ??= Effect.runPromise(Wire.decode(wire)).then((blueprint) => open({ ...serve, context: { blueprint, reader: null, bundleRevision: null } })).catch((error: unknown) => {
      onUnavailable(error instanceof ServedPortalUnavailable ? error.message : `K19: the portal could not be served (${String(error).split("\n")[0]})`);
      return undefined;
    });
    return portal;
  };
  return (route: string): Effect.Effect<string | undefined> => Effect.promise(async () => {
    const found = await served();
    if (found === undefined) return undefined;
    const page = await found.page(route).catch((error: unknown) => { onUnavailable(error instanceof Error ? error.message : String(error)); return undefined; });
    return page !== undefined && page.status === 200 ? page.html : undefined;
  });
};
