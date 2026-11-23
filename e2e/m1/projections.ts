// What check 12 shares: how a generated folder is compared with what acme's `generated/` was before its projections were
// mounted (M1.11: "its `generated/server` is unchanged"). Pure functions of bytes; no process, no port.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { repo } from "../layer1/support.ts";

const tree = (root: string, dir: string): ReadonlyArray<string> => existsSync(join(root, dir))
  ? readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? tree(root, `${dir}/${e.name}`) : [`${dir}/${e.name}`])).sort()
  : [];

/** The recorded baseline of acme's `generated/`, taken from the checked-in files at m1 cccc2aab, before any mount. */
export const baselinePath = join(repo, "e2e/fixtures/m1/projections/acme-baseline.json");
export interface Baseline {
  /** `<path under generated/>` to the digest of its bytes, header line aside (see `headerless`). */
  readonly files: Record<string, string>;
  /** sha256 of `generated/model/model.json` with its `mounts` key removed, as JSON text. */
  readonly model: string;
}
export const baseline = () => JSON.parse(readFileSync(baselinePath, "utf8")) as Baseline;

/**
 * The only difference a mount may make to a generated file is its first line, which says where it came from
 * (milestones, risk 2: "only header paths may differ"): the blueprint as a whole, or the mount's own file. Everything else
 * is compared byte for byte, so the first line is read as one of those two headers and replaced by a fixed one.
 */
export const HEADER = /^\/\/ Generated from (the blueprint|blueprint\/projections\/[a-z][a-z0-9-]*\.ts)\. Do not edit\.$/;
export const headerless = (text: string) => {
  const [first = "", ...rest] = text.split("\n");
  return [HEADER.test(first) ? "// Generated from <header>. Do not edit." : first, ...rest].join("\n");
};
export const sha = (text: string) => createHash("sha256").update(text).digest("hex");

/** Every file of `generated/<folder>/` in a project, by path under `generated/`, with its header-less digest. */
export const digestOf = (root: string, folder: string): Record<string, string> =>
  Object.fromEntries(tree(root, `generated/${folder}`).map((path) => [path.slice("generated/".length), sha(headerless(readFileSync(join(root, path), "utf8")))]));

/** The model as `ortho generate` wrote it, without its `mounts` (what a mount adds, and nothing else). */
export const modelDigest = (root: string) => {
  const { mounts: _mounts, ...rest } = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as Record<string, unknown>;
  return sha(JSON.stringify(rest));
};

/** Which paths differ between two digests: missing, extra, or changed. */
export const differences = (want: Record<string, string>, got: Record<string, string>) => [
  ...Object.keys(want).filter((p) => !(p in got)).map((p) => `missing ${p}`),
  ...Object.keys(got).filter((p) => !(p in want)).map((p) => `extra ${p}`),
  ...Object.keys(want).filter((p) => p in got && want[p] !== got[p]).map((p) => `changed ${p}`),
].sort();
