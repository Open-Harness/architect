// What check 02 reads: Goal 3's generated files (the checked-in `generated/` of an example at the merge base with `origin/goal/stage-1`),
// a regeneration with the real `ortho generate`, and a snapshot of everything else in the example. Folders are compared byte for byte.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyOf, ortho, repo } from "../layer1/support.ts";

const hash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Every file under `root` (but `node_modules`), by relative path, with the hash of its bytes. */
export const fileMap = (root: string, dir = ""): ReadonlyMap<string, string> =>
  new Map(readdirSync(join(root, dir), { withFileTypes: true }).filter((d) => d.name !== "node_modules").flatMap((d) =>
    d.isDirectory() ? [...fileMap(root, join(dir, d.name))] : [[join(dir, d.name), hash(join(root, dir, d.name))] as const]));

/** What differs between two file maps: a file missing on either side, or one whose bytes differ. */
export const mapProblems = (want: ReadonlyMap<string, string>, got: ReadonlyMap<string, string>, wantName: string, gotName: string): ReadonlyArray<string> => [
  ...[...want.keys()].filter((f) => !got.has(f)).sort().map((f) => `${f} is in ${wantName} but not in ${gotName}`),
  ...[...got.keys()].filter((f) => !want.has(f)).sort().map((f) => `${f} is in ${gotName} but not in ${wantName}`),
  ...[...want].filter(([f, h]) => got.has(f) && got.get(f) !== h).map(([f]) => `${f} differs`),
];

/** Folder against folder, byte for byte; an empty or missing folder on either side is a problem (nothing to compare). */
export const treeProblems = (expected: string, actual: string): ReadonlyArray<string> => {
  const want = existsSync(expected) ? fileMap(expected) : new Map<string, string>();
  const got = existsSync(actual) ? fileMap(actual) : new Map<string, string>();
  return [
    ...(want.size === 0 ? [`${expected} holds no file, so there is nothing to compare`] : []),
    ...(got.size === 0 ? [`${actual} holds no file, so there is nothing to compare`] : []),
    ...mapProblems(want, got, "the expected tree", "the actual tree"),
  ];
};

/** `git merge-base HEAD origin/goal/stage-1`: Goal 3's output as of where this branch left it. */
export const goal3Base = (): { readonly rev?: string; readonly problem?: string } => {
  const r = spawnSync("git", ["merge-base", "HEAD", "origin/goal/stage-1"], { cwd: repo, encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() !== "" ? { rev: r.stdout.trim() } : { problem: `no merge base of HEAD and origin/goal/stage-1 (fetch it, with fetch-depth: 0): ${r.stderr.trim()}` };
};

/** The example's `generated/` at `rev`, extracted into a new folder (the caller removes it). */
export const generatedAt = (rev: string, example: string): { readonly dir: string; readonly generated: string } => {
  const dir = mkdtempSync(join(tmpdir(), "ortho-on-chain-base-"));
  const archive = spawnSync("git", ["archive", rev, `examples/${example}/generated`], { cwd: repo, maxBuffer: 256 * 1024 * 1024 });
  const untar = spawnSync("tar", ["-x", "-C", dir], { input: archive.stdout });
  return { dir, generated: archive.status === 0 && untar.status === 0 ? join(dir, "examples", example, "generated") : join(dir, "none") };
};

/**
 * What is wrong with an example, empty when right: its checked-in `generated/` is Goal 3's (at the merge base) byte for byte; regenerating
 * it, from a copy of the whole example with `generated/` removed, with the real `ortho generate`, gives Goal 3's files again; and generate
 * changed nothing outside `generated/` in that copy.
 */
export const seamProblems = (example: string): ReadonlyArray<string> => {
  const base = goal3Base();
  if (base.rev === undefined) return [base.problem!];
  const extracted = generatedAt(base.rev, example);
  const goal3 = extracted.generated;
  const root = join(repo, "examples", example);
  const parts = readdirSync(root).filter((p) => p !== "node_modules" && !p.startsWith("."));
  const copy = copyOf(root, parts);
  try {
    const checkedIn = treeProblems(goal3, join(root, "generated")).map((p) => `checked in, against Goal 3 at ${base.rev!.slice(0, 8)}: ${p}`);
    rmSync(join(copy.root, "generated"), { recursive: true, force: true });
    const outside = (m: ReadonlyMap<string, string>) => new Map([...m].filter(([f]) => !f.startsWith("generated/")));
    const before = outside(fileMap(copy.root));
    const ran = ortho(copy.root, "generate");
    if (ran.status !== 0) return [`ortho generate exited ${ran.status}: ${(ran.stdout + ran.stderr).slice(-1500)}`];
    const after = outside(fileMap(copy.root));
    return [
      ...checkedIn,
      ...treeProblems(goal3, join(copy.root, "generated")).map((p) => `regenerated, against Goal 3 at ${base.rev!.slice(0, 8)}: ${p}`),
      ...mapProblems(before, after, "the example before generate", "the example after generate").map((p) => `outside generated/: ${p}`),
    ];
  } finally { copy.remove(); rmSync(extracted.dir, { recursive: true, force: true }); }
};
