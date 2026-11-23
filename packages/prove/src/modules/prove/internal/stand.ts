// The world a prove runs in: one of its own (started, and stopped when the scope closes), or the warm one `ortho dev` keeps (ST1.24).
import { resolve } from "node:path";
import { Effect, type Scope } from "effect";
import { Names } from "orthograph/server";
import type { Model } from "@orthograph/compiler";
import type { DeviceHost } from "#modules/journeys/types.js";
import { PortalFeed } from "#modules/portal-feed/service.js";
import { Sinks } from "#modules/sinks/service.js";
import { Collectors, FileMetrics, privateKeys } from "#modules/telemetry/service.js";
import type { TraceSource } from "#modules/telemetry/types.js";
import { Warm } from "#modules/warm/service.js";
import { Worlds } from "#modules/world/service.js";
import { ProveFailed } from "../types.ts";
import { deviceHost, needsDevice, standChain } from "./device-host.ts";

/** The longest window a derived alert names (3 days): the most history a world's feed supplies for monitoring, apart from the Calls page's display window. */
export const PORTAL_HISTORY_MS = 3 * 24 * 60 * 60_000;

/** The portal reads a world's last half hour: check 21's window, and the portal's own default. */
export const PORTAL_WINDOW_MS = 30 * 60_000;

const failed = (e: { readonly message: string }) => new ProveFailed({ message: e.message });

export interface Stand {
  readonly url: string;
  readonly collector: TraceSource;
  /** Where the run's own spans (the journeys' roots) are exported. */
  readonly otlp: string;
  readonly device: DeviceHost | undefined;
  /** What to say before the journeys. */
  readonly notes: ReadonlyArray<string>;
}

interface Wanted {
  readonly root: string;
  /** Where the world's files live: the project, or the scaffold world of `--empty`. */
  readonly world: string;
  readonly model: Model;
  readonly port: number;
  readonly empty: boolean;
  readonly env: Readonly<Record<string, string | undefined>> | undefined;
}

/** The warm world of a live `ortho dev`, emptied; `undefined` when a prove must have one of its own (or there is none to use). */
const warmWorld = ({ root, model, port, empty }: Wanted): Effect.Effect<Stand | undefined, ProveFailed, Scope.Scope> =>
  Effect.gen(function* () {
    // A scaffold world, a chosen port and a device chain are each a world of the run's own making.
    if (empty || port !== 0 || needsDevice(model)) return undefined;
    const record = yield* Warm.find(root);
    if (record === undefined) return undefined;
    // Another prove is running in it: resetting now would empty the world under that run, so this one starts a world of its own.
    if (!(yield* Warm.lock(root))) return undefined;
    yield* Warm.reset(record).pipe(Effect.mapError(failed));
    return { url: record.url, collector: Collectors.read(record.telemetry), otlp: record.collector, device: undefined, notes: [`prove: reusing the world of ortho dev at ${record.url}`] };
  });

/** A fresh world and collector of the run's own. */
const ownWorld = ({ world, model, port, empty, env }: Wanted): Effect.Effect<Stand, ProveFailed, Scope.Scope> =>
  Effect.gen(function* () {
    const dir = resolve(world, Names.folder, "prove-telemetry");
    const collector = yield* Collectors.local(dir, privateKeys(model)).pipe(Effect.mapError(failed));
    const sinks = yield* Sinks.resolve({ sinks: empty ? [{ sink: "local" }] : model.environments?.["local"]?.telemetry ?? [{ sink: "local" }], env: env ?? {} });
    // A plugin that runs operations on the device gets a chain in the world (Anvil as a process, K7 Q7), released after the Worker.
    const stood = yield* standChain(model);
    // The world's portal reads this run's telemetry through a feed this process answers (the Worker cannot open the collector's files).
    const feed = yield* PortalFeed.serve({ source: collector, metrics: FileMetrics.open(dir), environment: "local", windowMs: PORTAL_WINDOW_MS, historyMs: PORTAL_HISTORY_MS }).pipe(Effect.mapError(failed));
    const { url, chain } = yield* Worlds.start({ root: world, port, name: "prove", otlp: collector.url, portalFeed: feed.url, environment: "local", secretEnv: sinks.secretEnv, ...(stood.chain ? { chain: Effect.succeed(stood.chain) } : {}) }).pipe(Effect.mapError(failed));
    const device = needsDevice(model) ? yield* deviceHost(world, collector.url, chain).pipe(Effect.mapError(failed)) : undefined;
    return { url, collector, otlp: collector.url, device, notes: [...sinks.notes, ...stood.notes] };
  });

/** The world warm if there is one to use, else the run's own. */
export const standWorld = (wanted: Wanted): Effect.Effect<Stand, ProveFailed, Scope.Scope> =>
  warmWorld(wanted).pipe(Effect.flatMap((warm) => (warm === undefined ? ownWorld(wanted) : Effect.succeed(warm))));
