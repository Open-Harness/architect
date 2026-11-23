// The stand-ins of a world (`Stand.process`): each is a program of the mounted package, started as `node <entry> --port 0 --dir <state>`, whose
// address is its first line, `stand-in listening on <url>` (the contract slice 4's stand-ins keep). It leads its own process group so it can be
// stopped whole, and it belongs to the world's scope, never to the Worker's: a killed runner leaves it running (GOAL17-check-harness, call 2).
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Effect, type Scope } from "effect";
import type { Model } from "@orthograph/compiler";
import { WorldFailed, type StandRunning } from "../types.ts";
import { stopGroup } from "./wrangler.ts";

const LISTENING = /^stand-in listening on (http:\/\/127\.0\.0\.1:\d+)$/m;
/** A stand-in that guards its control routes says its secret first (the launcher contract of GOAL17-slice9-sandbox): kept in memory, sent as `x-bridge-secret`, never written. */
const SECRET = /^stand-in secret ([0-9a-f]{64})$/m;
const hidden = (text: string) => text.replace(SECRET, "stand-in secret <hidden>");

/** One stand-in process, ready once it has said where it listens, stopped (its group, and its folder removed) when the scope closes. */
export const standProcess = (mount: string, entry: string, cwd: string): Effect.Effect<StandRunning, WorldFailed, Scope.Scope> =>
  Effect.gen(function* () {
    const dir = mkdtempSync(join(tmpdir(), `ortho-stand-${mount}-`));
    const child = yield* Effect.acquireRelease(
      Effect.sync(() => spawn(process.execPath, [entry, "--port", "0", "--dir", dir], { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] })),
      (c) => stopGroup(c, "SIGTERM").pipe(Effect.andThen(Effect.sync(() => rmSync(dir, { recursive: true, force: true })))),
    );
    const heard = { out: "" };
    const url = yield* Effect.callback<string, WorldFailed>((resume) => {
      const read = (chunk: Buffer) => {
        heard.out += chunk.toString();
        const found = LISTENING.exec(heard.out);
        if (found) resume(Effect.succeed(found[1]!));
      };
      child.stdout?.on("data", read);
      child.stderr?.on("data", read);
      child.once("exit", (code) => resume(Effect.fail(new WorldFailed({ message: `the ${mount} stand-in exited ${String(code)} before it listened:\n${hidden(heard.out)}` }))));
    }).pipe(Effect.timeoutOrElse({ duration: "60 seconds", orElse: () => Effect.fail(new WorldFailed({ message: `the ${mount} stand-in said nothing in 60 s:\n${hidden(heard.out)}` })) }));
    const secret = SECRET.exec(heard.out)?.[1];
    heard.out = "";
    // What the stand-in prints from now on is drained and dropped: its output is never kept, and never reaches a file or a log.
    for (const stream of [child.stdout, child.stderr]) { stream?.removeAllListeners("data"); stream?.resume(); }
    return { url, pid: child.pid ?? 0, ...(secret === undefined ? {} : { secret }) };
  });

/** The folder of a package, found from where its entry resolves: the nearest package.json above it that names it (a package need not export its own manifest). */
const packageDir = (entry: string, name: string): string | undefined => {
  for (let dir = dirname(entry); dir !== dirname(dir); dir = dirname(dir)) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest) && (JSON.parse(readFileSync(manifest, "utf8")) as { readonly name?: unknown }).name === name) return dir;
  }
  return undefined;
};

/** The entry a package names for its stand-in: `orthograph.standIn` in its package.json, relative to the package. */
const entryOf = (dir: string): string | undefined => {
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { readonly orthograph?: { readonly standIn?: unknown } };
  return typeof manifest.orthograph?.standIn === "string" ? manifest.orthograph.standIn : undefined;
};

/**
 * Each mount whose adapter declares a stand-in process (the model's `standIn`, and an `orthograph.standIn` entry in its package), by the mount's name,
 * as an effect `Worlds.start` acquires in the world's scope. A mount whose package names no entry is not stood up.
 */
export const standsOf = (root: string, model: Model): Readonly<Record<string, Effect.Effect<StandRunning, WorldFailed, Scope.Scope>>> =>
  Object.fromEntries(Object.entries(model.mounts ?? {}).flatMap(([mount, m]) => {
    if (m.standIn?.how !== "process") return [];
    const place = Effect.try({
      try: () => {
        const dir = packageDir(createRequire(join(root, "package.json")).resolve(m.package), m.package);
        return dir === undefined ? undefined : { dir, entry: entryOf(dir) };
      },
      catch: (e) => new WorldFailed({ message: `the ${mount} stand-in's package ${m.package} cannot be read from ${root}: ${String(e)}` }),
    });
    return [[mount, Effect.flatMap(place, (found) => (found === undefined || found.entry === undefined ? Effect.fail(new WorldFailed({ message: `${m.package}'s package.json names no orthograph.standIn entry` })) : standProcess(mount, join(found.dir, found.entry), found.dir)))] as const];
  }));
