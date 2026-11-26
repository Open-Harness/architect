// The world a prove runs in: one of its own (started, and stopped when the scope closes), or the warm one `ortho dev` keeps (ST1.24).
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect, type Scope } from "effect";
import { Names } from "orthograph/server";
import { packageDir, type Model } from "@orthograph/compiler";
import { Timers, TimersLive } from "@orthograph/language-effect";
import { WorldFailed, type StandIns } from "#modules/world/types.js";
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
  /** The address of each stand-in this world stood up, by mount; a warm world has none. */
  readonly stands: Readonly<Record<string, string>>;
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

/** A mount's name as the Worker's environment spells it: `fx-backup` is `FX_BACKUP`. */
const envName = (mount: string) => mount.toUpperCase().replaceAll("-", "_");

/** The mounts whose adapter declared a process stand-in (G16-adapter-mounts call 3): the model decides, never what a package names. */
const processMounts = (model: Model) =>
  Object.entries(model.mounts ?? {}).filter(([, m]) => m.kind === "adapter" && m.standIn?.how === "process");

/** Whether a prove of this model needs stand-ins, so a world of its own: a warm `ortho dev` world has none. */
export const needsStandIns = (model: Model) => processMounts(model).length > 0;

interface Running {
  readonly mount: string;
  readonly child: ChildProcess;
  /** Resolves with the address once the whole line is read, or fails when the stand-in exits first. */
  readonly listening: Effect.Effect<string, WorldFailed, Timers>;
}

const LINE = /^stand-in listening on (\S+)$/;
const KEEP = 4096;
/** How long a stand-in may take to say where it listens, and its grace between SIGTERM and SIGKILL (at most 10 s). */
const SILENCE = "60 seconds";
const GRACE = "5 seconds";

/** `node <entry> --port 0 --dir <dir>` in the package's folder, in a process group of its own so all it starts is stopped with it. */
const spawnStandIn = (mount: string, cwd: string, entry: string, dir: string): Running => {
  const child = spawn(process.execPath, [join(cwd, entry), "--port", "0", "--dir", dir], { cwd, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let tail = "";
  let pending = "";
  let url: string | undefined;
  let closed = false;
  const waiters: Array<(found: Effect.Effect<string, WorldFailed, Timers>) => void> = [];
  const settle = (found: Effect.Effect<string, WorldFailed, Timers>) => { for (const w of waiters.splice(0)) w(found); };
  const keep = (chunk: string) => { tail = (tail + chunk).slice(-KEEP); };
  // Both pipes are read for as long as the stand-in lives: one that goes on talking after its line never blocks.
  child.stderr!.setEncoding("utf8").on("data", keep);
  child.stdout!.setEncoding("utf8").on("data", (chunk: string) => {
    keep(chunk);
    if (url !== undefined) return;
    pending += chunk;
    const lines = pending.split("\n");
    pending = lines.pop()!;
    const found = lines.map((l) => LINE.exec(l.replace(/\r$/, ""))?.[1]).find((u) => u !== undefined);
    if (found !== undefined) { url = found; pending = ""; settle(Effect.succeed(found)); }
  });
  const gone = (why: string) => new WorldFailed({ message: `the stand-in for mount ${mount} ${why} before it said where it listens (${join(cwd, entry)}):\n${tail.trimEnd()}` });
  child.once("close", () => { closed = true; });
  // `exit` comes before the pipes are read to the end: what it said last (its crash) is waited for, a second at most, since a child of its own may hold them open.
  const drained = Effect.callback<void>((resume) => { if (closed) return resume(Effect.void); child.once("close", () => resume(Effect.void)); });
  const exitedEarly = (why: string) =>
    Effect.gen(function* () {
      yield* Effect.raceFirst(drained, (yield* Timers).sleep("prove.stand-in.drain", "1 second"));
      return yield* Effect.fail(gone(why));
    });
  const exitWhy = () => `exited (${child.signalCode ?? child.exitCode})`;
  child.once("error", (e) => settle(Effect.fail(gone(`could not start (${e.message})`))));
  child.once("exit", () => { if (url === undefined) settle(exitedEarly(exitWhy())); });
  const listening = Effect.callback<string, WorldFailed, Timers>((resume) => {
    if (url !== undefined) return resume(Effect.succeed(url));
    if (child.exitCode !== null || child.signalCode !== null) return resume(exitedEarly(exitWhy()));
    waiters.push(resume);
  });
  return { mount, child, listening };
};

/** A signal to the stand-in's whole group; one already gone is no matter. */
const signalGroup = (child: ChildProcess, signal: NodeJS.Signals) =>
  Effect.try({ try: () => (child.pid === undefined ? undefined : process.kill(-child.pid, signal)), catch: () => undefined }).pipe(Effect.ignore);

const exited = (child: ChildProcess) =>
  Effect.callback<void>((resume) => {
    if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) return resume(Effect.void);
    child.once("exit", () => resume(Effect.void));
  });

/** SIGTERM to the stand-in's group, SIGKILL to it once the stand-in has gone or the grace is up: its children go too. */
const stopStandIn = (child: ChildProcess) =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    yield* signalGroup(child, "SIGTERM");
    yield* Effect.raceFirst(exited(child), timers.sleep("prove.stand-in.stop", GRACE));
    yield* signalGroup(child, "SIGKILL");
    yield* exited(child);
  });

/**
 * Each process stand-in of the model, started under `<state>/stands/<mount>` and stopped, all together, when the scope
 * closes. What the Worker is told: `ORTHO_STAND_<MOUNT>` and `<MOUNT>_API_KEY` = `world-<mount>`.
 */
export const standIns = (root: string, model: Model) => (state: string): Effect.Effect<StandIns, WorldFailed, Scope.Scope> =>
  Effect.gen(function* () {
    const unfit = (message: string) => Effect.fail(new WorldFailed({ message: `the stand-ins couldn't start: ${message}` }));
    const wanted = yield* Effect.forEach(processMounts(model), ([mount, m]) => {
      const dir = packageDir(root, m.package);
      if (dir === undefined) return unfit(`mount ${mount}: ${m.package} is not installed`);
      return Effect.try({
        try: () => (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { readonly orthograph?: { readonly standIn?: unknown } }).orthograph?.standIn,
        catch: () => new WorldFailed({ message: `the stand-ins couldn't start: mount ${mount}: ${m.package}'s package.json can't be read` }),
      }).pipe(Effect.flatMap((entry) => typeof entry === "string" ? Effect.succeed({ mount, dir, entry })
        : unfit(`mount ${mount}: ${m.package}'s package.json names no orthograph.standIn, and its adapter stands in as a process`)));
    });
    if (wanted.length === 0) return { env: {}, addresses: {} };
    // Every folder is made before any stand-in starts: a failure here leaves nothing running, and the spawns that follow don't throw.
    const dirs = yield* Effect.try({
      try: () => wanted.map(({ mount }) => { const dir = join(state, "stands", mount); mkdirSync(dir, { recursive: true }); return dir; }),
      catch: (e) => new WorldFailed({ message: `the stand-ins couldn't start: their folders under ${join(state, "stands")} couldn't be made (${String(e)})` }),
    });
    const running = yield* Effect.acquireRelease(
      Effect.sync(() => wanted.map(({ mount, dir, entry }, i) => spawnStandIn(mount, dir, entry, dirs[i]!))),
      (all) => Effect.forEach(all, (r) => stopStandIn(r.child), { concurrency: "unbounded", discard: true }).pipe(Effect.provide(TimersLive)),
    );
    const urls = yield* Effect.forEach(running, (r) =>
      Effect.raceFirst(
        r.listening,
        Effect.gen(function* () { yield* (yield* Timers).sleep("prove.stand-in.listen", SILENCE); }).pipe(
          Effect.andThen(Effect.fail(new WorldFailed({ message: `the stand-in for mount ${r.mount} said no "stand-in listening on <url>" line within 60 s` }))),
        ),
      ), { concurrency: "unbounded" }).pipe(Effect.provide(TimersLive));
    return {
      env: Object.fromEntries(running.flatMap((r, i) => [[`ORTHO_STAND_${envName(r.mount)}`, urls[i]!], [`${envName(r.mount)}_API_KEY`, `world-${r.mount}`]])),
      addresses: Object.fromEntries(running.map((r, i) => [r.mount, urls[i]!])),
    };
  });

/** The warm world of a live `ortho dev`, emptied; `undefined` when a prove must have one of its own (or there is none to use). */
const warmWorld = ({ root, model, port, empty }: Wanted): Effect.Effect<Stand | undefined, ProveFailed, Scope.Scope> =>
  Effect.gen(function* () {
    // A scaffold world, a chosen port, a device chain and a mount's stand-in are each a world of the run's own making.
    if (empty || port !== 0 || needsDevice(model) || needsStandIns(model)) return undefined;
    const record = yield* Warm.find(root);
    if (record === undefined) return undefined;
    // Another prove is running in it: resetting now would empty the world under that run, so this one starts a world of its own.
    if (!(yield* Warm.lock(root))) return undefined;
    yield* Warm.reset(record).pipe(Effect.mapError(failed));
    return { url: record.url, collector: Collectors.read(record.telemetry), otlp: record.collector, device: undefined, stands: {}, notes: [`prove: reusing the world of ortho dev at ${record.url}`] };
  });

/** A fresh world and collector of the run's own. */
const ownWorld = ({ root, world, model, port, empty, env }: Wanted): Effect.Effect<Stand, ProveFailed, Scope.Scope> =>
  Effect.gen(function* () {
    const dir = resolve(world, Names.folder, "prove-telemetry");
    const collector = yield* Collectors.local(dir, privateKeys(model)).pipe(Effect.mapError(failed));
    const sinks = yield* Sinks.resolve({ sinks: empty ? [{ sink: "local" }] : model.environments?.["local"]?.telemetry ?? [{ sink: "local" }], env: env ?? {} });
    // A plugin that runs operations on the device gets a chain in the world (Anvil as a process, K7 Q7), released after the Worker.
    const stood = yield* standChain(model);
    // The world's portal reads this run's telemetry through a feed this process answers (the Worker cannot open the collector's files).
    const feed = yield* PortalFeed.serve({ source: collector, metrics: FileMetrics.open(dir), environment: "local", windowMs: PORTAL_WINDOW_MS, historyMs: PORTAL_HISTORY_MS }).pipe(Effect.mapError(failed));
    const { url, chain, stands } = yield* Worlds.start({ root: world, port, name: "prove", otlp: collector.url, portalFeed: feed.url, environment: "local", secretEnv: sinks.secretEnv, stands: standIns(root, model), ...(stood.chain ? { chain: Effect.succeed(stood.chain) } : {}) }).pipe(Effect.mapError(failed));
    const device = needsDevice(model) ? yield* deviceHost(world, collector.url, chain).pipe(Effect.mapError(failed)) : undefined;
    return { url, collector, otlp: collector.url, device, stands: stands ?? {}, notes: [...sinks.notes, ...stood.notes] };
  });

/** The world warm if there is one to use, else the run's own. */
export const standWorld = (wanted: Wanted): Effect.Effect<Stand, ProveFailed, Scope.Scope> =>
  warmWorld(wanted).pipe(Effect.flatMap((warm) => (warm === undefined ? ownWorld(wanted) : Effect.succeed(warm))));
