// `/portal` and under it: the prebuilt client's files, from the Worker's static assets. A file of the client's namespace is served as it is; every
// other path is a route, and is the client's shell, which draws the page itself.
import { Effect } from "effect";
import type { PortalAssets } from "../types.ts";

/**
 * A static file is one inside the client's own namespace: what the build emits under `assets/` (vite's `assetsDir`, fixed in
 * `vite.config.ts`) and the shell itself. Anything else under `/portal/` is a route, whatever its last segment looks like: the compiler
 * accepts verbs like `map`, `json` and `svg`, so `/portal/operations/document.map` is a page, not a file.
 */
const isFile = (inside: string): boolean => inside === "/index.html" || inside.startsWith("/assets/");

/** The path inside the client's folder: `/portal` is `/`, `/portal/assets/a.js` is `/assets/a.js`. */
const insideOf = (pathname: string): string => {
  const rest = pathname.slice("/portal".length);
  return rest === "" ? "/" : rest;
};

const notInstalled = () => new Response("The portal's client is not installed in this Worker: it has no static assets.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export const client = (assets: PortalAssets | undefined, request: Request): Effect.Effect<Response> => {
  if (assets === undefined) return Effect.succeed(notInstalled());
  const url = new URL(request.url);
  const inside = insideOf(url.pathname);
  const ask = (path: string) => Effect.promise(() => assets.fetch(new Request(new URL(path, url.origin), { method: request.method, headers: request.headers })));
  return ask(inside).pipe(
    Effect.flatMap((found) => (found.status === 404 && !isFile(inside) ? ask("/") : Effect.succeed(found))),
  );
};
