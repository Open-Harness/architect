// `ortho build` on a copy of acme under git: the revision's bundle, once, with its hash.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { Build } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const visible = (from: string) => !basename(from).startsWith(".");
const git = (root: string, ...args: ReadonlyArray<string>) =>
  spawnSync("git", ["-c", "user.name=l2", "-c", "user.email=l2@example.test", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" }).stdout.trim();

/** A copy of acme under git, outside the repository: its revision is a commit of its own. */
const copyUnderGit = () => {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-l201-build-"));
  const root = join(parent, "acme");
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  mkdirSync(join(root, "node_modules"));
  for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  writeFileSync(join(root, ".gitignore"), "node_modules/\n.ortho/\n.wrangler/\n");
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "acme");
  return { root, revision: git(root, "rev-parse", "--short", "HEAD"), remove: () => rmSync(parent, { recursive: true, force: true }) };
};

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const project = copyUnderGit();
afterAll(() => project.remove());

describe("build", () => {
  it("builds a revision once: the same revision hashes the same, and the bundle is kept at its path", { timeout: 300_000 }, async () => {
    const first = await run(Build.build(project.root));
    utimesSync(first.main, 1, 1);
    const second = await run(Build.build(project.root));
    expect(first.revision).toBe(project.revision);
    expect(first.dirty).toBe(false);
    expect(first.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(second.sha256).toBe(first.sha256);
    expect(statSync(first.main).mtimeMs).toBe(1000);
    expect(first.main).toBe(join(project.root, ".ortho/artefacts", project.revision, "main.js"));
    expect(statSync(first.main).size).toBeGreaterThan(100_000);
    expect(await run(Build.find(project.root, project.revision))).toEqual({ revision: project.revision, commit: git(project.root, "rev-parse", "HEAD"), sha256: first.sha256, main: first.main, portal: first.portal });
    expect(await run(Build.find(project.root, "0000000"))).toBeUndefined();
  });

  it("a dirty build cannot replace a clean revision's bundle, even after its source is restored", { timeout: 300_000 }, async () => {
    const original = await run(Build.find(project.root, project.revision));
    const source = join(project.root, "src/allowance/spend.ts");
    const text = readFileSync(source, "utf8");
    writeFileSync(source, text.replace("return { remaining: remaining - amount }", "return { remaining: 0n }"));
    const result = await run(Build.build(project.root).pipe(Effect.result));
    writeFileSync(source, text);
    expect(result._tag).toBe("Failure");
    expect(await run(Build.find(project.root, project.revision))).toEqual(original);
  });

  it("refuses a legacy manifest, then rebuilds after its local cache is preserved aside", { timeout: 300_000 }, async () => {
    const record = join(project.root, ".ortho/artefacts", project.revision, "bundle.json");
    const original = readFileSync(record, "utf8");
    const old = JSON.parse(original) as { revision: string; sha256: string };
    writeFileSync(record, JSON.stringify({ revision: old.revision, sha256: old.sha256 }));
    const result = await run(Build.find(project.root, project.revision).pipe(Effect.result));
    expect(result._tag).toBe("Failure");
    renameSync(dirname(record), `${dirname(record)}.legacy`);
    const rebuilt = await run(Build.build(project.root));
    expect(rebuilt.sha256).toBe(old.sha256);
    expect(await run(Build.find(project.root, project.revision))).toEqual({ revision: rebuilt.revision, commit: git(project.root, "rev-parse", "HEAD"), sha256: rebuilt.sha256, main: rebuilt.main, portal: rebuilt.portal });
    expect(readFileSync(join(`${dirname(record)}.legacy`, "bundle.json"), "utf8")).toBe(JSON.stringify({ revision: old.revision, sha256: old.sha256 }));
  });

  it("records the portal's client beside the bundle, never reuses a revision built with another, and notices a client that was changed", { timeout: 300_000 }, async () => {
    const built = await run(Build.find(project.root, project.revision));
    const record = join(dirname(built!.main), "bundle.json");
    const kept = readFileSync(record, "utf8");
    const shipped = existsSync(join(dirname(built!.main), "portal/index.html"));
    expect(built!.portal, "the digest of what shipped, or none when this machine has no client").toEqual(shipped ? expect.stringMatching(/^[0-9a-f]{64}$/) : null);
    if (shipped) {
      // The same revision, recorded as built with no client: this machine has one, so this is not that build.
      writeFileSync(record, JSON.stringify({ ...JSON.parse(kept), portal: null }));
      expect((await run(Build.find(project.root, project.revision))))!.toMatchObject({ portal: null });
      expect((await run(Build.build(project.root).pipe(Effect.flip))).message).toContain("without the portal's client");
      writeFileSync(record, kept);
      // A client file changed after the build.
      const index = join(dirname(built!.main), "portal/index.html");
      const original = readFileSync(index, "utf8");
      writeFileSync(index, `${original}<!-- tampered -->`);
      expect((await run(Build.find(project.root, project.revision).pipe(Effect.flip))).message).toContain("no longer matches the client");
      writeFileSync(index, original);
    }
    expect(await run(Build.find(project.root, project.revision))).toEqual(built);
  });

  it("notices an artefact that is not what was built", { timeout: 60_000 }, async () => {
    const built = await run(Build.find(project.root, project.revision));
    writeFileSync(built!.main, `${readFileSync(built!.main, "utf8")}\n// tampered\n`);
    expect((await run(Build.find(project.root, project.revision).pipe(Effect.flip))).message).toContain("no longer matches");
  });

  it("refuses a project outside git", async () => {
    const outside = mkdtempSync(join(tmpdir(), "ortho-l201-nogit-"));
    const failure = await run(Build.build(outside).pipe(Effect.flip, Effect.ensuring(Effect.sync(() => rmSync(outside, { recursive: true, force: true })))));
    expect(failure.message).toContain("git");
  });
});
