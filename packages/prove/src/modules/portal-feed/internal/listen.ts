import { createServer, type Server } from "node:http";
import { Clock, Effect } from "effect";
import { PortalFeedFailed, type PortalFeedOptions } from "../types.ts";

/** A read that failed is its reason, beside the other source's answer: one source down never takes the other with it. */
const attempt = <A>(read: Effect.Effect<A, { readonly message: string }>) =>
  read.pipe(
    Effect.map((value) => ({ state: "available" as const, value })),
    Effect.catch((failure) => Effect.succeed({ state: "unavailable" as const, reason: failure.message })),
  );

/** The window as it stands now: the `now` it was read at, and each source's answer on its own. */
const answer = (options: PortalFeedOptions, startedAt: number) =>
  Effect.gen(function* () {
    const now = yield* options.now ?? Clock.currentTimeMillis;
    // What the source can really supply is what this feed has held it for, up to the cap: never more, so a longer alert window is unknown, not judged on the part.
    const historyMs = Math.min(options.historyMs ?? options.windowMs, Math.max(0, now - startedAt));
    // Traces span the history (the portal's calls page filters them to its window); the points stay the display window's.
    const traces = yield* attempt(options.source.window(Math.max(options.windowMs, historyMs), now).pipe(Effect.map((found) => Object.fromEntries(found))));
    const points = yield* attempt(options.metrics.window(options.windowMs, now));
    return { environment: options.environment, now, windowMs: options.windowMs, historyMs, traces, points };
  });

export const listen = (options: PortalFeedOptions, startedAt: number) =>
  Effect.callback<{ readonly server: Server; readonly url: string }, PortalFeedFailed>((resume) => {
    const server = createServer((request, response) => {
      if (request.method !== "GET") { response.writeHead(405).end(); return; }
      Effect.runPromise(answer(options, startedAt)).then((done) => {
        response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify(done));
      });
    });
    server.once("error", (error) => resume(Effect.fail(new PortalFeedFailed({ message: `the portal's telemetry feed couldn't listen: ${error.message}` }))));
    server.listen(0, "127.0.0.1", () => resume(Effect.succeed({ server, url: `http://127.0.0.1:${(server.address() as { port: number }).port}` })));
  });

export const close = ({ server }: { readonly server: Server }) =>
  Effect.callback<void>((resume) => {
    server.close(() => resume(Effect.void));
    server.closeAllConnections();
  });

