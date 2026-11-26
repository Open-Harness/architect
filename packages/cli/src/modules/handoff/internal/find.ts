// Where the app's own CLI is installed, and the file its `ortho` bin runs.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Option } from "effect";

const CLI = "@orthograph/cli";

/** The first `node_modules/@orthograph/cli` with a package.json, from `from` up. */
export const installedCli = (from: string): string | undefined => {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", CLI);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    if (dirname(dir) === dir) return undefined;
  }
};

interface Manifest { readonly name?: string; readonly bin?: string | Readonly<Record<string, string>> }

/** The package's manifest, or nothing when it can't be read or parsed. */
const manifestOf = (dir: string): Manifest | undefined =>
  Option.getOrUndefined(Effect.runSync(Effect.option(Effect.try(() => JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as Manifest))));

/** The file the package's `ortho` bin names, when the package names one that exists. */
export const binOf = (dir: string): string | undefined => {
  const manifest = manifestOf(dir);
  if (manifest === undefined || manifest === null || typeof manifest !== "object") return undefined;
  const named: unknown = typeof manifest.bin === "string" ? manifest.bin : typeof manifest.bin === "object" && manifest.bin !== null ? manifest.bin["ortho"] : undefined;
  // A `bin.ortho` that is not a string (a number, an object) is a package that can't be run, not a crash at startup.
  const bin = typeof named === "string" ? named : undefined;
  return manifest.name === CLI && bin !== undefined && existsSync(join(dir, bin)) ? join(dir, bin) : undefined;
};

/** Whether two folders are one, links followed. */
export const same = (a: string, b: string): boolean => existsSync(a) && existsSync(b) && realpathSync(a) === realpathSync(b);
