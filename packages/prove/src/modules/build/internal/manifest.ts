import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { BuildFailed } from "../types.ts";

export const digest = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

const filesUnder = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(dir.length + 1)).sort();

/** The digest of a folder: each file's path and bytes, in path order. The portal's client is judged by it (K19). */
export const treeDigest = (dir: string) =>
  filesUnder(dir).reduce((hash, file) => hash.update(`${file}\0${digest(join(dir, file))}\n`), createHash("sha256")).digest("hex");
export const failure = (error: unknown) => new BuildFailed({ message: String(error).replace(/^Error: /, "") });
export const io = <A>(work: () => A) => Effect.try({ try: work, catch: failure });

const Manifest = Schema.Struct({
  schemaVersion: Schema.Literal(1), source: Schema.Literal("clean"),
  revision: Schema.String, commit: Schema.String.check(Schema.isPattern(/^[0-9a-f]{40}$/)),
  sha256: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
  /** The portal's prebuilt client the revision ships (K19): its digest, or null when it shipped none. A record from before this has no key, and means none. */
  portal: Schema.optionalKey(Schema.NullOr(Schema.Struct({ sha256: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/)) }))),
});

/** Legacy records are deliberately not inferred from whatever source happens to be present now. */
export const read = (dir: string, revision: string) =>
  Effect.gen(function* () {
    const main = join(dir, "main.js");
    const record = join(dir, "bundle.json");
    if (!existsSync(main) && !existsSync(record)) return undefined;
    if (!existsSync(main) || !existsSync(record)) return yield* new BuildFailed({ message: `the artefact of ${revision} is incomplete: move its local cache aside, then run ortho build and ortho prove --env test` });
    const raw: unknown = yield* io(() => JSON.parse(readFileSync(record, "utf8")));
    const manifest = yield* Schema.decodeUnknownEffect(Manifest)(raw).pipe(
      Effect.mapError(() => new BuildFailed({ message: `the artefact of ${revision} has no trusted clean-source provenance: move its local cache aside, then run ortho build and ortho prove --env test` })),
    );
    if (manifest.revision !== revision || !manifest.commit.startsWith(revision)) return yield* new BuildFailed({ message: `the artefact's source commit does not match ${revision}` });
    const actual = yield* io(() => digest(main));
    if (actual !== manifest.sha256) return yield* new BuildFailed({ message: `${main} no longer matches the hash recorded when it was built` });
    const shipped = manifest.portal?.sha256 ?? null;
    if (shipped !== null && (!existsSync(join(dir, "portal")) || treeDigest(join(dir, "portal")) !== shipped)) return yield* new BuildFailed({ message: `${join(dir, "portal")} no longer matches the client recorded when ${revision} was built` });
    return { revision, commit: manifest.commit, sha256: actual, main, portal: shipped };
  });
