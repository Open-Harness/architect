import { Names } from "orthograph/server";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import { ServerConfig } from "#modules/server-config/service.js";
import { BuildFailed, type BuildApi } from "./types.ts";
import { digest, io, read, treeDigest } from "./internal/manifest.ts";

const wrangler = join(dirname(fileURLToPath(import.meta.resolve("wrangler/package.json"))), "bin/wrangler.js");
const artefacts = (root: string, revision: string) => join(resolve(root), Names.folder, "artefacts", revision);

const git = (root: string, ...args: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const run = yield* io(() => spawnSync("git", args, { cwd: root, encoding: "utf8" }));
    if (run.status !== 0) return yield* new BuildFailed({ message: `${resolve(root)} is not in a git repository, and the revision is the git commit (${run.stderr?.trim() || run.error?.message || `git exited ${run.status}`})` });
    return run.stdout.trim();
  });

const revision: BuildApi["revision"] = (root) => git(root, "rev-parse", "--short", "HEAD");
const dirty: BuildApi["dirty"] = (root) => git(root, "status", "--porcelain").pipe(Effect.map((out) => out.length > 0));
const unchanged: BuildApi["unchanged"] = (root, commit) => Effect.gen(function* () {
  if ((yield* dirty(root)) || (yield* git(root, "rev-parse", "HEAD")) !== commit) return yield* new BuildFailed({ message: "the source changed while proving: commit it and prove again" });
});
const find: BuildApi["find"] = (root, rev) => read(artefacts(root, rev), rev);

/** Only tooling environment reaches the bundler. No account credential is needed by a local dry run. */
const toolingEnv = (env: Readonly<Record<string, string | undefined>>) => Object.fromEntries(
  Object.entries(env).filter(([name]) => /^(PATH|HOME|TMPDIR|TMP|TEMP|LANG|LC_.*|HTTPS?_PROXY|NO_PROXY|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE)$/i.test(name)),
);

const build: BuildApi["build"] = (root, env = {}) =>
  Effect.gen(function* () {
    const rev = yield* revision(root);
    if (yield* dirty(root)) return yield* new BuildFailed({ message: `refused: the working tree differs from ${rev}: commit or stash what changed before building a deployable bundle` });
    const commit = yield* git(root, "rev-parse", "HEAD");
    const held = yield* find(root, rev);
    const generated = resolve(root, "generated/server/wrangler.jsonc");
    if (!existsSync(generated)) return yield* new BuildFailed({ message: `${generated} is missing: run nx sync first` });
    // The portal's prebuilt client ships with the revision, beside the bundle (K19); a machine that has none builds a revision without it.
    const client = ServerConfig.clientOf(root);
    // A revision is its bundle and its client: one held with another client (or none, or one where there was none) is not this build, and is never overwritten.
    if (held !== undefined) {
      const wanted = client === undefined ? null : yield* io(() => treeDigest(client));
      if (held.portal !== wanted) {
        return yield* new BuildFailed({ message: `the artefact of ${rev} was built ${held.portal === null ? "without the portal's client" : "with another portal client"} and the client here is ${wanted === null ? "not built" : "another one"}: move .ortho/artefacts/${rev} aside, then run ortho build and ortho prove --env test` });
      }
      yield* unchanged(root, held.commit);
      return { ...held, dirty: false };
    }
    const dir = artefacts(root, rev);
    yield* io(() => mkdirSync(dirname(dir), { recursive: true }));
    return yield* Effect.acquireUseRelease(
      io(() => mkdtempSync(`${dir}-building-`)),
      (scratch) => Effect.gen(function* () {
        const main = join(scratch, "main.js");
        // The dry run reads a config derived from the generated one (absolute paths, and the client as static assets); it lives beside the scratch folder, not in it.
        const config = `${scratch}.wrangler.jsonc`;
        yield* io(() => writeFileSync(config, ServerConfig.derive(root, readFileSync(generated, "utf8"), client)));
        const run = yield* io(() => spawnSync(process.execPath, [wrangler, "deploy", "--dry-run", "--outdir", scratch, "--config", config], {
          cwd: resolve(root), encoding: "utf8", env: { ...toolingEnv(env), CI: "1", WRANGLER_SEND_METRICS: "false" }, maxBuffer: 64 * 1024 * 1024,
        }));
        if (run.status !== 0 || !existsSync(main)) return yield* new BuildFailed({ message: `wrangler couldn't build the bundle:\n${run.stderr || run.stdout || run.error?.message || `exit ${run.status}`}` });
        if ((yield* dirty(root)) || (yield* git(root, "rev-parse", "HEAD")) !== commit) return yield* new BuildFailed({ message: "the source changed while bundling: commit it and build again" });
        if (client !== undefined) yield* io(() => cpSync(client, join(scratch, "portal"), { recursive: true }));
        const sha256 = yield* io(() => digest(main));
        const portal = client === undefined ? null : { sha256: yield* io(() => treeDigest(join(scratch, "portal"))) };
        yield* io(() => writeFileSync(join(scratch, "bundle.json"), JSON.stringify({ schemaVersion: 1, source: "clean", revision: rev, commit, sha256, portal }) + "\n"));
        // Publish only a complete clean build. A concurrent winner is reused; its files are never overwritten.
        const winner = yield* find(root, rev);
        if (winner !== undefined) return { ...winner, dirty: false };
        yield* io(() => renameSync(scratch, dir));
        return { revision: rev, commit, sha256, main: join(dir, "main.js"), portal: portal?.sha256 ?? null, dirty: false };
      }),
      (scratch) => io(() => { rmSync(scratch, { recursive: true, force: true }); rmSync(`${scratch}.wrangler.jsonc`, { force: true }); }).pipe(Effect.ignore),
    );
  });

export const Build: BuildApi = { revision, build, dirty, find, unchanged };
