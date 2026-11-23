import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect, Option } from "effect";
import { Names } from "orthograph/server";
import { WarmFailed, type DevRecord, type WarmApi } from "./types.ts";
import { fingerprint, newestChange } from "./internal/source.ts";

const fileOf = (root: string) => resolve(root, Names.folder, "dev.json");

const alive = (pid: number) => Effect.try({ try: () => process.kill(pid, 0), catch: () => "gone" as const }).pipe(Effect.match({ onFailure: () => false, onSuccess: () => true }));
/** The world at `url` answers, and says this nonce: it is the world `ortho dev` made, not whatever took its port or its pid. */
const answers = (url: string, nonce: string) =>
  Effect.tryPromise({ try: () => fetch(`${url}/_world/health`).then((r) => (r.ok ? r.json() : {})), catch: () => "silent" as const }).pipe(
    Effect.match({ onFailure: () => false, onSuccess: (body) => (body as { readonly nonce?: unknown }).nonce === nonce }),
  );

const isRecord = (x: unknown): x is DevRecord => {
  const r = x as Partial<Record<keyof DevRecord, unknown>> | null;
  return typeof r === "object" && r !== null && typeof r.pid === "number" && typeof r.url === "string" && typeof r.collector === "string" && typeof r.telemetry === "string" && typeof r.startedAt === "number" && typeof r.sources === "string" && typeof r.nonce === "string";
};

const read = (root: string) =>
  Effect.try({ try: () => JSON.parse(readFileSync(fileOf(root), "utf8")) as unknown, catch: () => "unreadable" as const }).pipe(
    Effect.map((x) => (isRecord(x) ? Option.some(x) : Option.none<DevRecord>())),
    Effect.orElseSucceed(() => Option.none<DevRecord>()),
  );

const lockOf = (root: string) => resolve(root, Names.folder, "warm.lock");

/** Create the lock file whole, so two proves cannot both think they made it. A lock whose process is gone is taken over. */
const take = (root: string): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const made = yield* Effect.try({
      try: () => { mkdirSync(resolve(root, Names.folder), { recursive: true }); writeFileSync(lockOf(root), `${process.pid}\n`, { flag: "wx" }); },
      catch: (e) => e as NodeJS.ErrnoException,
    }).pipe(Effect.match({ onFailure: (e) => e, onSuccess: () => undefined }));
    if (made === undefined) return true;
    if (made.code !== "EEXIST") return false;
    const holder = yield* Effect.try({ try: () => Number(readFileSync(lockOf(root), "utf8").trim()), catch: () => "gone" as const }).pipe(Effect.orElseSucceed(() => 0));
    if (holder !== 0 && (yield* alive(holder))) return false;
    // Left by a prove that was killed: remove it and try once more.
    yield* Effect.sync(() => rmSync(lockOf(root), { force: true }));
    return yield* Effect.try({ try: () => { writeFileSync(lockOf(root), `${process.pid}\n`, { flag: "wx" }); return true; }, catch: () => false as const }).pipe(Effect.orElseSucceed(() => false));
  });

export const Warm: WarmApi = {
  lock: (root) =>
    Effect.acquireRelease(take(root), (held) => Effect.sync(() => { if (held) rmSync(lockOf(root), { force: true }); })),
  publish: (root, record) =>
    Effect.acquireRelease(
      Effect.try({
        try: () => {
          mkdirSync(resolve(root, Names.folder), { recursive: true });
          writeFileSync(fileOf(root), JSON.stringify(record, null, 2) + "\n");
        },
        catch: (e) => new WarmFailed({ message: `couldn't write ${fileOf(root)}: ${String(e)}` }),
      }),
      () => Effect.sync(() => rmSync(fileOf(root), { force: true })),
    ),
  find: (root) =>
    Effect.gen(function* () {
      if (!existsSync(fileOf(root))) return undefined;
      const found = yield* read(root);
      if (Option.isNone(found)) return undefined;
      const record = found.value;
      if (!(yield* alive(record.pid)) || !(yield* answers(record.url, record.nonce))) return undefined;
      // An edit is a newer file; an addition, a deletion or a rename is a different list of files.
      return newestChange(root) > record.startedAt || fingerprint(root) !== record.sources ? undefined : record;
    }),
  reset: ({ url, telemetry, nonce }) =>
    // The collector's files too: a run reads them whole, and the last run's spans would only be in its way. Each is replaced by an
    // empty one made while the old still exists, so the new file never has the old one's inode (a file removed and made again can
    // get the number back, and then a reader that tells files apart by it cannot tell a fresh file from the old one grown).
    Effect.try({
      try: () => {
        if (!existsSync(telemetry)) return;
        for (const entry of readdirSync(telemetry)) {
          const file = join(telemetry, entry);
          const fresh = join(telemetry, `.${entry}.fresh`);
          writeFileSync(fresh, "");
          renameSync(fresh, file);
        }
      },
      catch: (e) => new WarmFailed({ message: `couldn't empty ${telemetry}: ${String(e)}` }),
    }).pipe(Effect.andThen(Effect.tryPromise({
      try: () => fetch(`${url}/_world/reset`, { method: "POST", headers: { "x-ortho-world": nonce } }).then((r) => (r.ok ? undefined : Promise.reject(new Error(`answered ${r.status}`)))),
      catch: (e) => new WarmFailed({ message: `couldn't empty the world of ortho dev at ${url}: ${String(e)}` }),
    }))),
};
