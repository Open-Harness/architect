// R1: a registry release younger than three days is refused unless the project names it in pnpm's own override.
// A package from no registry (a local tarball, a link) has no release to age, and says so.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Clock, Effect } from "effect";

export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const upward = (from: string, file: string): string | undefined => {
  for (let dir = from; ; dir = dirname(dir)) {
    if (existsSync(join(dir, file))) return join(dir, file);
    if (dirname(dir) === dir) return undefined;
  }
};

/** Whether the project's lockfile says the package came from a registry (an integrity, no tarball or directory). */
export const fromRegistry = (root: string, pkg: string, version: string): boolean => {
  const lock = upward(root, "pnpm-lock.yaml");
  if (!lock) return false;
  const lines = readFileSync(lock, "utf8").split("\n");
  const at = lines.findIndex((l) => l === `  ${pkg}@${version}:` || l === `  '${pkg}@${version}':`);
  if (at < 0) return false;
  const entry = lines.slice(at + 1, lines.findIndex((l, i) => i > at && !l.startsWith("    "))).join("\n");
  return /integrity:/.test(entry) && !/tarball:|directory:/.test(entry);
};

/** The packages the project lets under three days, from `minimumReleaseAgeExclude` in its pnpm-workspace.yaml. */
export const excluded = (root: string): ReadonlyArray<string> => {
  const file = upward(root, "pnpm-workspace.yaml");
  if (!file) return [];
  const text = readFileSync(file, "utf8");
  const inline = /^minimumReleaseAgeExclude:\s*\[(.*)\]\s*$/m.exec(text);
  if (inline) return inline[1]!.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  const block = /^minimumReleaseAgeExclude:\s*\n((?:\s+-.*\n?)*)/m.exec(text);
  return block ? block[1]!.split("\n").map((l) => l.replace(/^\s+-\s*/, "").replace(/\s+#.*$/, "").trim().replace(/^['"]|['"]$/g, "")).filter(Boolean) : [];
};

export type Fetch = (url: string) => Effect.Effect<unknown, string>;

/** How old the release is, read from the registry, or why it can't be. */
export const ageOf = (fetchJson: Fetch, registry: string, pkg: string, version: string) =>
  Effect.gen(function* () {
    const meta = yield* fetchJson(`${registry.replace(/\/$/, "")}/${pkg.replace("/", "%2f")}`);
    const published = (meta as { readonly time?: Readonly<Record<string, string>> }).time?.[version];
    if (!published) return yield* Effect.fail(`${registry} has no publish time for ${pkg} ${version}`);
    const now = yield* Clock.currentTimeMillis;
    return now - Date.parse(published);
  });
