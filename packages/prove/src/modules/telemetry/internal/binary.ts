// The Collector as its pinned binary (K10 section 8): `otelcol-contrib` from the official opentelemetry-collector-releases,
// fetched once, checked against the digest pinned here and kept outside the repository, so the Mac, a sandbox and CI run
// the same file. Nothing here runs a container.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Effect } from "effect";
import { CollectorFailed } from "../types.ts";

/** v0.164.0 of the contrib distribution, published 26 October 2026 (the version the spike and every gate ran). */
export const VERSION = "0.164.0";

/** SHA-256 of each platform's archive, as the release lists it (the `.sha256` asset beside each archive says the same). */
export const DIGESTS: Readonly<Record<string, string>> = {
  darwin_arm64: "af6a0c56886e3cc36ccebe849fa167bad2bc47a97a48fd8497a0d6f93d0cf73a",
  darwin_amd64: "b53ab416e9a90625c1453692f1d3a3c4eba72904424e31516866f73064b65d4f",
  linux_amd64: "f0c1ce9f661399beb4a58b711924716e08ea70c3802db0715fcfde3cbbada2d4",
  linux_arm64: "8bd4a7f443405522a2175cc1a8675f9e99cc047c7181b73461efd08efbba38d3",
};

/** `ORTHO_CACHE_DIR`, else `$XDG_CACHE_HOME/orthograph`, else `~/.cache/orthograph`: never inside a repository. */
export const cacheRoot = () => process.env["ORTHO_CACHE_DIR"] ?? join(process.env["XDG_CACHE_HOME"] ?? join(homedir(), ".cache"), "orthograph");

export const platform = () => `${process.platform}_${process.arch === "x64" ? "amd64" : process.arch}`;

const releaseUrl = (kind: string) => `https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${VERSION}/otelcol-contrib_${VERSION}_${kind}.tar.gz`;

const failed = (message: string) => new CollectorFailed({ message });

const download = (url: string, to: string) =>
  Effect.tryPromise({
    try: () => fetch(url).then((response) =>
      response.ok && response.body !== null ? pipeline(Readable.fromWeb(response.body as never), createWriteStream(to)) : Promise.reject(new Error(`${response.status}`))),
    catch: (e) => failed(`couldn't fetch the collector from ${url}: ${e instanceof Error ? e.message : "failed"}`),
  });

/** Fetch, verify and unpack into a folder of our own, then move it into place: two processes asking at once both end with one good copy. */
const install = (kind: string, folder: string) =>
  Effect.gen(function* () {
    const wanted = DIGESTS[kind];
    if (wanted === undefined) return yield* failed(`no pinned collector for ${kind}: set ORTHO_COLLECTOR_BIN to one`);
    const scratch = `${folder}.tmp-${process.pid}-${Math.floor(Math.random() * 1e9)}`;
    yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(scratch, { recursive: true, force: true })));
    mkdirSync(scratch, { recursive: true });
    const archive = join(scratch, "archive.tar.gz");
    yield* download(releaseUrl(kind), archive);
    const got = createHash("sha256").update(readFileSync(archive)).digest("hex");
    if (got !== wanted) return yield* failed(`the collector archive for ${kind} has digest ${got}, not the pinned ${wanted}: it was not used`);
    const unpacked = spawnSync("tar", ["-xzf", archive, "-C", scratch, "otelcol-contrib"], { encoding: "utf8" });
    if (unpacked.status !== 0) return yield* failed(`couldn't unpack the collector: ${unpacked.stderr.trim()}`);
    rmSync(archive);
    chmodSync(join(scratch, "otelcol-contrib"), 0o755);
    yield* Effect.try({ try: () => renameSync(scratch, folder), catch: () => failed("couldn't place the collector") }).pipe(
      // Someone else placed it first: theirs is the same verified file.
      Effect.catch((e) => (existsSync(join(folder, "otelcol-contrib")) ? Effect.void : Effect.fail(e))),
    );
  }).pipe(Effect.scoped);

/** The Collector's path: `ORTHO_COLLECTOR_BIN` when set, else the cached pinned binary, fetched when it isn't there yet. */
export const collectorBinary: Effect.Effect<string, CollectorFailed> = Effect.gen(function* () {
  const given = process.env["ORTHO_COLLECTOR_BIN"];
  if (given !== undefined && given !== "") return existsSync(given) ? given : yield* failed(`ORTHO_COLLECTOR_BIN names ${given}, which isn't there`);
  const kind = platform();
  const folder = join(cacheRoot(), "otelcol-contrib", VERSION, kind);
  const binary = join(folder, "otelcol-contrib");
  if (!existsSync(binary)) {
    mkdirSync(join(cacheRoot(), "otelcol-contrib", VERSION), { recursive: true });
    yield* install(kind, folder);
  }
  return binary;
});
