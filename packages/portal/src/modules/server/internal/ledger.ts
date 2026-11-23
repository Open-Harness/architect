// The monitor's ledger for a Worker (M1.49): the binding the Worker names (`PORTAL_LEDGER`, a key-value store), or, with none, a book that lives as long as the
// isolate does. The isolate's book is honest about what it is: issues survive the window, not a restart. Opaque JSON by key either way. A ledger that fails
// reads as empty and drops a write: the monitor then shows what the window holds, never a made-up issue.
import { Effect } from "effect";
import type { MonitorLedger } from "#modules/monitor/types.js";
import type { PortalLedgerBinding } from "../types.ts";

const isolate = new Map<string, string>();

const stored = (binding: PortalLedgerBinding | undefined, key: string): Effect.Effect<string | null | undefined, string> =>
  binding === undefined ? Effect.succeed(isolate.get(key)) : Effect.tryPromise({ try: () => binding.get(key), catch: String });

export const ledgerOf = (binding: PortalLedgerBinding | undefined): MonitorLedger => ({
  get: (key) => stored(binding, key).pipe(
    Effect.map((text) => (text === null || text === undefined ? undefined : (JSON.parse(text) as unknown))),
    Effect.catchCause(() => Effect.succeed(undefined)),
  ),
  put: (key, value) => (binding === undefined
    ? Effect.sync(() => { isolate.set(key, JSON.stringify(value)); })
    : Effect.tryPromise({ try: () => binding.put(key, JSON.stringify(value)), catch: String }).pipe(Effect.asVoid)
  ).pipe(Effect.catchCause(() => Effect.void)),
});
