// Where the app's own CLI is installed, and the file its `ortho` bin runs.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const CLI = "@orthograph/cli";

/** The first `node_modules/@orthograph/cli` with a package.json, from `from` up. */
export const installedCli = (from: string): string | undefined => {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", CLI);
    if (existsSync(join(candidate, "package.json"))) return candidate;
    if (dirname(dir) === dir) return undefined;
  }
};

/** The file the package's `ortho` bin names, when the package names one that exists. */
export const binOf = (dir: string): string | undefined => {
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { readonly name?: string; readonly bin?: string | Readonly<Record<string, string>> };
  const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.["ortho"];
  return manifest.name === CLI && bin !== undefined && existsSync(join(dir, bin)) ? join(dir, bin) : undefined;
};

/** Whether two folders are one, links followed. */
export const same = (a: string, b: string): boolean => existsSync(a) && existsSync(b) && realpathSync(a) === realpathSync(b);
