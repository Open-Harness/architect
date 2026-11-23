import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { Owned } from "#modules/owned/service.js";
import type { IssuerApi } from "./types.ts";

export { serve } from "./internal/server.ts";

/** The process entry that runs the issuer: `src/main.ts`, two folders up. */
const entry = join(import.meta.dirname, "..", "..", "main.ts");

export const Issuer: IssuerApi = {
  start: (options = {}) =>
    Effect.gen(function* () {
      const dir = options.dir ?? (yield* Effect.acquireRelease(
        Effect.sync(() => mkdtempSync(join(tmpdir(), "ortho-issuer-"))),
        (made) => Effect.sync(() => rmSync(made, { recursive: true, force: true })),
      ));
      const config = options.config ?? {};
      const file = join(dir, "issuer.json");
      writeFileSync(file, JSON.stringify(config));
      const on = (port: number) => {
        const url = `http://127.0.0.1:${port}/${config.tokenCallbacks?.[0]?.issuerId ?? "ortho"}`;
        return Owned.start({
          kind: "issuer",
          binary: process.execPath,
          args: [entry, "issuer", "--port", String(port), "--config", file],
          log: join(dir, "issuer.log"),
          ready: Effect.tryPromise({
            try: () => fetch(`${url}/.well-known/openid-configuration`).then((r) => (r.ok ? r : Promise.reject(new Error(String(r.status))))),
            catch: () => "waiting",
          }),
        }).pipe(Effect.map((owning) => ({ url, port, pid: owning.pid })));
      };
      // A port picked here is free when picked, not when the issuer listens: under load another process can take it first,
      // and the issuer exits (main.ts says why). Then pick again, up to three ports. A port the caller gave is never swapped.
      if (options.port !== undefined) return yield* on(options.port);
      return yield* (options.ports ?? Owned.freePort).pipe(
        Effect.flatMap(on),
        Effect.retry({ times: 2, while: (e) => e._tag === "ProcessFailed" && e.exited === true }),
      );
    }),
};
