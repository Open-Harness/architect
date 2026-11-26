// Check 47 (Goal 18, slice 5, #1063: publishing that works). Written by the author before the build; a builder never edits it (AGENTS.md, "Journeys and checks come first").
// What it states, in the words of design/goals/18-framework.md slice 5 and K44 section 2:
//  (a) THE DRY RUN REFUSES A `workspace:` LINK. `tools/release/preview.mjs --dry-run` judges what pnpm would publish (pnpm rewrites `workspace:` to the sibling's version, so a link
//      that pnpm can resolve is fine and one that survives is not). A link in `dependencies`, `devDependencies`, `optionalDependencies` or `peerDependencies` that pnpm cannot rewrite
//      (the workspace is not installed, so `pnpm pack` says ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL) is refused: exit 1 and a line `refused: ...` that names the package and the dependency.
//  (b) THE DRY RUN REFUSES A `bin` OUTSIDE THE TARBALL. The `bin` of the manifest pnpm would publish (publishConfig applied) must name a file in that tarball: a file that does not exist
//      (`dist/main.js` not built) and a file that exists but is outside `files` are both refused, by a `refused:` line naming the package and the path.
//  (c) THE DRY RUN REFUSES A PRESET WITH NO STARTER. The tarball of `@orthograph/preset` must hold the starter: `files/blueprint/`, `files/src/`, `files/journeys/` and
//      `files/generated/model/model.json` (what `tools/e2e/starter.sh` copies from `examples/starter`). A `refused:` line naming `@orthograph/preset` and the word "starter". Judged on the tarball,
//      not on the disk: a `files/` folder that `package.json`'s `files` leaves out is as missing as none.
//  (d) THE REPOSITORY: every public package is at one version, `0.1.0-next.<n>`; the real dry run lists the preset with the starter's files in its tarball, packed there from `examples/starter`
//      (the copy is made when it is packed, not checked in: the dry run leaves no `packages/preset/files` behind that it did not find).
//  (e) THE PRESET'S WORKSPACE EXEMPTS `orthograph` AND `@orthograph/*` FROM pnpm's minimum release age: the pnpm-workspace.yaml `Starter.write` leaves lists both under `minimumReleaseAgeExclude`,
//      keeps what Nx wrote there, adds each once, adds nothing else, and does not turn the age off.
// Every refusal is one line on stdout or stderr that starts `refused:`; the verdict is exit 1; the blocks of every package are still printed (as check 44 says). Nothing here says how the command
// gets pnpm's answer: it may run `pnpm pack`, or anything else that judges the same tarball. The expected values come from pnpm itself and from `examples/starter`, never from the command's output.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { repo } from "./support.ts";
import { blocks, cleanup, preview, publicOf, quiet, shimmed, type Ran } from "./npm-preview.ts";

const roots: string[] = [];
afterAll(() => { cleanup(); for (const r of roots) rmSync(r, { recursive: true, force: true }); });

// ---- fixtures: a pnpm workspace written fresh, optionally installed (offline: it holds only workspace links) ----

type Json = Record<string, unknown>;
interface Pkg { readonly dir: string; readonly manifest: Json; readonly files?: Readonly<Record<string, string>> }
const pkg = (name: string, manifest: Json = {}, files: Readonly<Record<string, string>> = { "dist/index.js": "export {};\n" }): Pkg =>
  ({ dir: name.replace(/^@orthograph\//, ""), manifest: { name, version: "0.1.0-next.1", license: "Apache-2.0", type: "module", files: ["dist"], ...manifest }, files });
const STARTER: Readonly<Record<string, string>> = {
  "files/blueprint/app.ts": "export {};\n", "files/src/handler.ts": "export {};\n", "files/journeys/first.ts": "export {};\n", "files/generated/model/model.json": "{}\n",
};
const preset = (manifest: Json = {}, files: Readonly<Record<string, string>> = STARTER): Pkg =>
  pkg("@orthograph/preset", { files: ["dist", "generators.json", "files"], ...manifest }, { "dist/index.js": "export {};\n", "generators.json": "{}\n", ...files });
const without = (files: Readonly<Record<string, string>>, prefix: string) => Object.fromEntries(Object.entries(files).filter(([k]) => !k.startsWith(prefix)));

const fixture = (pkgs: ReadonlyArray<Pkg>, install = false): string => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "ortho-g18-5-"));
  roots.push(root);
  const put = (path: string, text: string) => { mkdirSync(join(root, path, ".."), { recursive: true }); writeFileSync(join(root, path), text); };
  put("pnpm-workspace.yaml", "packages:\n  - packages/*\n");
  put("package.json", JSON.stringify({ name: "fixture-root", private: true }));
  for (const p of pkgs) {
    put(`packages/${p.dir}/package.json`, JSON.stringify(p.manifest, null, 2));
    for (const [path, text] of Object.entries(p.files ?? {})) put(`packages/${p.dir}/${path}`, text);
  }
  if (install) {
    const env = { ...quiet(), npm_config_store_dir: join(root, ".store"), npm_config_offline: "true" };
    const done = spawnSync("pnpm", ["install", "--offline", "--ignore-scripts"], { cwd: root, encoding: "utf8", env });
    if (done.status !== 0) throw new Error(`the fixture could not be installed offline: ${done.stdout}${done.stderr}`.slice(0, 600));
  }
  return root;
};
const dry = (root: string, ...more: ReadonlyArray<string>) => preview(["--dry-run", "--root", root, ...more]);
const lines = (ran: Ran) => ran.all.split("\n").filter((l) => l.trim() !== "").slice(0, 6).join(" | ").slice(0, 400);
const refusals = (ran: Ran) => ran.all.split("\n").filter((l) => l.startsWith("refused:"));
/** The refusals that mention `needle` (a package name). */
const about = (ran: Ran, needle: string) => refusals(ran).filter((l) => l.includes(needle));
/** What pnpm itself says the tarball of one package of a fixture is: its manifest as published, and its files. */
const pnpmSays = (root: string, dir: string): { status: number | null; manifest?: Json; files?: ReadonlyArray<string> } => {
  const out = mkdtempSync(join(realpathSync(tmpdir()), "ortho-g18-5-out-"));
  roots.push(out);
  const done = spawnSync("pnpm", ["pack", "--pack-destination", out], { cwd: join(root, "packages", dir), encoding: "utf8", env: quiet() });
  if (done.status !== 0) return { status: done.status };
  const tgz = join(out, readdirSync(out).find((f) => f.endsWith(".tgz"))!);
  const listed = spawnSync("tar", ["-tzf", tgz], { encoding: "utf8" }).stdout.split("\n").filter(Boolean).map((f) => f.replace(/^package\//, "")).sort();
  const manifest = JSON.parse(spawnSync("tar", ["-xOzf", tgz, "package/package.json"], { encoding: "utf8" }).stdout) as Json;
  return { status: 0, manifest, files: listed };
};

const FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const;
/** The good workspace: the front door, three siblings, a cli whose four dependency fields each link one of them and whose `bin` is rewritten by publishConfig, and a preset with its starter. Installed. */
const good = (): ReadonlyArray<Pkg> => [
  pkg("orthograph"), pkg("@orthograph/one"), pkg("@orthograph/two"), pkg("@orthograph/three"),
  pkg("@orthograph/cli", {
    dependencies: { orthograph: "workspace:*" }, devDependencies: { "@orthograph/one": "workspace:*" },
    optionalDependencies: { "@orthograph/two": "workspace:^" }, peerDependencies: { "@orthograph/three": "workspace:~" },
    bin: { tool: "./src/main.ts" }, publishConfig: { bin: { tool: "./dist/main.js" } },
  }, { "dist/main.js": "#!/usr/bin/env node\n", "src/main.ts": "export {};\n" }),
  preset({ dependencies: { orthograph: "workspace:*" } }),
];

describe("47 controls: the oracle is real", () => {
  const root = fixture(good(), true);
  it("pnpm rewrites every link and the bin of the good workspace, and puts the starter and the bin file in the tarball", () => {
    const cli = pnpmSays(root, "cli");
    expect(cli.status).toBe(0);
    expect(JSON.stringify(cli.manifest)).not.toContain("workspace:");
    expect(cli.manifest!["bin"]).toEqual({ tool: "./dist/main.js" });
    expect(cli.files).toContain("dist/main.js");
    const p = pnpmSays(root, "preset");
    expect(p.status).toBe(0);
    for (const f of Object.keys(STARTER)) expect(p.files, f).toContain(f);
  });
  it("a bin file is in pnpm's tarball whatever `files` says, so a bin is outside it only when it is missing or beyond the package's folder", () => {
    const here = fixture([pkg("@orthograph/cli", { bin: { tool: "./bin/run.js" } }, { "bin/run.js": "#!/usr/bin/env node\n", "dist/index.js": "export {};\n" })]);
    expect(pnpmSays(here, "cli").files).toContain("bin/run.js");
    const gone = fixture([pkg("orthograph"), pkg("@orthograph/cli", { bin: { tool: "../shared/run.js" } }), pkg("@orthograph/shared", {}, { "run.js": "x\n" })]);
    expect(pnpmSays(gone, "cli").files!.filter((f) => f.includes("run.js"))).toEqual([]);
  });
  it("the same links, not installed, are ones pnpm cannot rewrite", () => {
    for (const field of FIELDS) {
      const lone = fixture([pkg("@orthograph/lib"), pkg("@orthograph/app", { [field]: { "@orthograph/lib": "workspace:*" } })]);
      const said = pnpmSays(lone, "app");
      expect(said.status, field).not.toBe(0);
    }
  });
  it("the good workspace passes the dry run: no refusal of any kind, every package listed, the starter and the bin file in their blocks", () => {
    const ran = dry(root);
    expect(ran.status, lines(ran)).toBe(0);
    expect(refusals(ran), lines(ran)).toEqual([]);
    const got = blocks(ran.out);
    expect(got.map((b) => b.name).sort()).toEqual(["@orthograph/cli", "@orthograph/one", "@orthograph/preset", "@orthograph/three", "@orthograph/two", "orthograph"]);
    expect(got.find((b) => b.name === "@orthograph/cli")!.files).toContain("dist/main.js");
    for (const f of Object.keys(STARTER)) expect(got.find((b) => b.name === "@orthograph/preset")!.files, f).toContain(f);
  });
});

describe("47 (a) a `workspace:` link that survives is refused", () => {
  for (const field of FIELDS) {
    it(`in ${field}: exit 1, one refusal naming the package and the dependency, and no other package`, () => {
      const root = fixture([pkg("@orthograph/lib"), pkg("@orthograph/other"), pkg("@orthograph/app", { [field]: { "@orthograph/lib": "workspace:*" } })]);
      const ran = dry(root);
      expect(ran.status, lines(ran)).toBe(1);
      const named = about(ran, "@orthograph/app");
      expect(named.length, lines(ran)).toBeGreaterThanOrEqual(1);
      expect(named.every((l) => l.includes("@orthograph/lib")), named.join(" | ")).toBe(true);
      expect(refusals(ran).filter((l) => !l.includes("@orthograph/app")), lines(ran)).toEqual([]);
    });
  }
  it("two packages with a link are both named, a third without one is not, and every block is still printed", () => {
    const root = fixture([pkg("@orthograph/lib"), pkg("@orthograph/a", { dependencies: { "@orthograph/lib": "workspace:*" } }), pkg("@orthograph/b", { peerDependencies: { "@orthograph/lib": "workspace:^" } }), pkg("@orthograph/c")]);
    const ran = dry(root);
    expect(ran.status, lines(ran)).toBe(1);
    expect(about(ran, "@orthograph/a").length).toBeGreaterThanOrEqual(1);
    expect(about(ran, "@orthograph/b").length).toBeGreaterThanOrEqual(1);
    expect(about(ran, "@orthograph/c")).toEqual([]);
    expect(blocks(ran.out).map((b) => b.name).sort()).toEqual(["@orthograph/a", "@orthograph/b", "@orthograph/c", "@orthograph/lib"]);
  });
  it("a package that is private is not judged", () => {
    const root = fixture([pkg("@orthograph/lib"), pkg("@orthograph/app", { private: true, dependencies: { "@orthograph/lib": "workspace:*" } })]);
    const ran = dry(root);
    expect(ran.status, lines(ran)).toBe(0);
    expect(refusals(ran)).toEqual([]);
  });
});

describe("47 (b) a `bin` outside the tarball is refused", () => {
  const withBin = (manifest: Json, files: Readonly<Record<string, string>>) => dry(fixture([pkg("orthograph"), pkg("@orthograph/cli", manifest, files)]));
  const cliRefusals = (ran: Ran) => about(ran, "@orthograph/cli");
  it("`publishConfig.bin` names a file that does not exist (dist/main.js, not built)", () => {
    const ran = withBin({ bin: { tool: "./src/main.ts" }, publishConfig: { bin: { tool: "./dist/main.js" } } }, { "src/main.ts": "export {};\n" });
    expect(ran.status, lines(ran)).toBe(1);
    expect(cliRefusals(ran).some((l) => l.includes("dist/main.js")), lines(ran)).toBe(true);
    expect(refusals(ran).filter((l) => !l.includes("@orthograph/cli"))).toEqual([]);
  });
  it("the file exists, but outside the package's folder (`../shared/run.js`)", () => {
    const root = fixture([pkg("orthograph"), pkg("@orthograph/cli", { bin: { tool: "../shared/run.js" } }), pkg("@orthograph/shared", {}, { "run.js": "#!/usr/bin/env node\n", "dist/index.js": "export {};\n" })]);
    const ran = dry(root);
    expect(ran.status, lines(ran)).toBe(1);
    expect(about(ran, "@orthograph/cli").some((l) => l.includes("shared/run.js")), lines(ran)).toBe(true);
  });
  it("`bin` as a string is judged the same way", () => {
    const ran = withBin({ bin: "./dist/missing.js" }, { "dist/index.js": "export {};\n" });
    expect(ran.status, lines(ran)).toBe(1);
    expect(cliRefusals(ran).some((l) => l.includes("dist/missing.js")), lines(ran)).toBe(true);
  });
  it("two entries, one inside the tarball and one outside: only the one outside is named", () => {
    const ran = withBin({ bin: { fine: "./dist/a.js", lost: "./dist/gone.js" } }, { "dist/a.js": "#!/usr/bin/env node\n" });
    expect(ran.status, lines(ran)).toBe(1);
    const named = cliRefusals(ran).join(" | ");
    expect(named).toContain("dist/gone.js");
    expect(named).not.toContain("dist/a.js");
  });
  it("a `bin` that is in the tarball passes, whether it is the plain one or the one publishConfig rewrites", () => {
    for (const [manifest, files] of [
      [{ bin: { tool: "./dist/main.js" } }, { "dist/main.js": "#!/usr/bin/env node\n" }],
      [{ bin: { tool: "./src/main.ts" }, publishConfig: { bin: { tool: "./dist/main.js" } } }, { "dist/main.js": "#!/usr/bin/env node\n", "src/main.ts": "export {};\n" }],
      [{ bin: "./dist/main.js" }, { "dist/main.js": "#!/usr/bin/env node\n" }],
    ] as const) {
      const ran = withBin(manifest, files);
      expect(ran.status, lines(ran)).toBe(0);
      expect(refusals(ran), lines(ran)).toEqual([]);
    }
  });
  it("a private package with a lost `bin` is not judged", () => {
    const ran = withBin({ private: true, bin: { tool: "./dist/gone.js" } }, { "dist/index.js": "export {};\n" });
    expect(ran.status, lines(ran)).toBe(0);
    expect(refusals(ran)).toEqual([]);
  });
});

describe("47 (c) a preset with no starter is refused", () => {
  const withPreset = (p: Pkg) => dry(fixture([pkg("orthograph"), p]));
  const starterRefusals = (ran: Ran) => about(ran, "@orthograph/preset").filter((l) => /starter/i.test(l));
  it("no `files/` at all", () => {
    const ran = withPreset(preset({}, {}));
    expect(ran.status, lines(ran)).toBe(1);
    expect(starterRefusals(ran).length, lines(ran)).toBeGreaterThanOrEqual(1);
    expect(refusals(ran).filter((l) => !l.includes("@orthograph/preset")), lines(ran)).toEqual([]);
  });
  for (const part of ["files/blueprint/", "files/src/", "files/journeys/", "files/generated/model/model.json"]) {
    it(`everything but ${part}`, () => {
      const ran = withPreset(preset({}, without(STARTER, part)));
      expect(ran.status, lines(ran)).toBe(1);
      expect(starterRefusals(ran).length, lines(ran)).toBeGreaterThanOrEqual(1);
    });
  }
  it("the starter is on the disk but `package.json`'s `files` leaves it out of the tarball", () => {
    const ran = withPreset(preset({ files: ["dist", "generators.json"] }));
    expect(ran.status, lines(ran)).toBe(1);
    expect(starterRefusals(ran).length, lines(ran)).toBeGreaterThanOrEqual(1);
  });
  it("every part is there: the run passes, and only the preset is held to it (the front door has no starter and is not refused)", () => {
    const ran = withPreset(preset());
    expect(ran.status, lines(ran)).toBe(0);
    expect(refusals(ran)).toEqual([]);
    expect(blocks(ran.out).map((b) => b.name).sort()).toEqual(["@orthograph/preset", "orthograph"]);
  });
  it("a package that is not the preset and has no starter is not refused, whatever it holds", () => {
    const ran = dry(fixture([pkg("orthograph"), pkg("@orthograph/presets-friend")]));
    expect(ran.status, lines(ran)).toBe(0);
  });
  it("all three mistakes at once: each is named, under its own package, and every block is printed", () => {
    const root = fixture([
      pkg("@orthograph/lib"), pkg("@orthograph/app", { dependencies: { "@orthograph/lib": "workspace:*" } }),
      pkg("@orthograph/cli", { bin: { tool: "./dist/gone.js" } }), preset({}, {}),
    ]);
    const ran = dry(root);
    expect(ran.status, lines(ran)).toBe(1);
    expect(about(ran, "@orthograph/app").length).toBeGreaterThanOrEqual(1);
    expect(about(ran, "@orthograph/cli").some((l) => l.includes("dist/gone.js"))).toBe(true);
    expect(about(ran, "@orthograph/preset").some((l) => /starter/i.test(l))).toBe(true);
    expect(blocks(ran.out).map((b) => b.name).sort()).toEqual(["@orthograph/app", "@orthograph/cli", "@orthograph/lib", "@orthograph/preset"]);
  });
});

describe("47 (d) the repository: a real version, and the starter packed into the preset", () => {
  const starterRoot = join(repo, "examples/starter");
  const walk = (dir: string): ReadonlyArray<string> => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
  const starterFiles = [...["blueprint", "src", "journeys"].flatMap((p) => walk(join(starterRoot, p))).map((f) => `files/${relative(starterRoot, f)}`), "files/generated/model/model.json"].sort();
  const presetFiles = join(repo, "packages/preset/files");
  const before = existsSync(presetFiles);
  let real: Ran | undefined;
  const realRun = () => (real ??= preview(["--dry-run"]));

  it("the starter the preset must carry is real: its blueprint, handlers, journeys and compiled model are on the disk", () => {
    expect(starterFiles.length).toBeGreaterThan(20);
    expect(existsSync(join(starterRoot, "generated/model/model.json"))).toBe(true);
    expect(starterFiles.some((f) => f.startsWith("files/blueprint/"))).toBe(true);
    expect(starterFiles.some((f) => f.startsWith("files/src/"))).toBe(true);
    expect(starterFiles.some((f) => f.startsWith("files/journeys/"))).toBe(true);
  });
  it("every public package is at one version, 0.1.0-next.<n>, and not 0.0.0", () => {
    const versions = publicOf(repo).map((m) => `${m.name}@${m.version}`);
    expect(publicOf(repo).length).toBeGreaterThanOrEqual(14);
    for (const m of publicOf(repo)) expect(m.version, m.name).toMatch(/^0\.1\.0-next\.\d+$/);
    expect(new Set(publicOf(repo).map((m) => m.version)).size, versions.join(" ")).toBe(1);
  });
  it("the real dry run lists the preset with the starter's every file in its tarball", () => {
    const ran = realRun();
    const block = blocks(ran.out).find((b) => b.name === "@orthograph/preset");
    expect(block, lines(ran)).toBeDefined();
    const missing = starterFiles.filter((f) => !block!.files.includes(f));
    expect(missing.slice(0, 5), `${missing.length} of the starter's ${starterFiles.length} files are not in the preset's tarball`).toEqual([]);
  });
  it("the preset's tarball holds nothing of the starter's that the starter does not have (no stale copy, no extras under files/)", () => {
    const block = blocks(realRun().out).find((b) => b.name === "@orthograph/preset");
    expect(block).toBeDefined();
    const extra = block!.files.filter((f) => f.startsWith("files/") && !starterFiles.includes(f));
    expect(extra).toEqual([]);
    expect(starterFiles.filter((f) => f.startsWith("files/")).length).toBeGreaterThan(0);
    expect(block!.files.filter((f) => f.startsWith("files/")).length, "the preset carries a starter").toBeGreaterThan(0);
  });
  it("a dry run sends nothing and leaves nothing: `packages/preset/files` is as it was found", () => {
    realRun();
    expect(existsSync(presetFiles)).toBe(before);
  });
});

describe("47 (e) the preset's workspace exempts orthograph and @orthograph/* from the minimum release age", () => {
  // The preset is run as `create-nx-workspace` runs it: `Starter.write` into a tree that already holds what Nx wrote.
  const written = async (existing: string | undefined): Promise<string> => {
    const { createTreeWithEmptyWorkspace } = await import("nx/src/generators/testing-utils/create-tree-with-empty-workspace.js");
    const { Starter } = await import("../../packages/preset/src/index.ts");
    const tree = createTreeWithEmptyWorkspace();
    if (existing !== undefined) tree.write("pnpm-workspace.yaml", existing);
    Starter.write(tree, { name: "bakery" }, Starter.read(join(repo, "examples/starter"), "0.1.0-next.1"));
    return tree.read("pnpm-workspace.yaml", "utf8")!;
  };
  const exempt = (yaml: string): ReadonlyArray<string> => ((parse(yaml) as Json | null)?.["minimumReleaseAgeExclude"] as ReadonlyArray<string> | undefined) ?? [];
  const NX = "autoInstallPeers: true\nallowBuilds:\n  nx: true\nminimumReleaseAgeExclude:\n  - 'x@1'\n";

  it("controls: the workspace still builds esbuild, nx and workerd and holds kysely, and the Nx file parses", async () => {
    const yaml = await written(undefined);
    const doc = parse(yaml) as Json;
    expect(doc["allowBuilds"]).toEqual({ esbuild: true, nx: true, workerd: true });
    expect(doc["overrides"]).toEqual({ kysely: "0.29.7" });
    expect(parse(NX)).toBeTruthy();
  });
  it("a fresh workspace lists exactly `orthograph` and `@orthograph/*`", async () => {
    expect([...exempt(await written(undefined))].sort()).toEqual(["@orthograph/*", "orthograph"]);
  });
  it("one Nx already wrote is kept, and both are added to it, each once", async () => {
    expect([...exempt(await written(NX))].sort()).toEqual(["@orthograph/*", "orthograph", "x@1"]);
  });
  it("one that already lists them is not given them twice, and the minimum age is not turned off", async () => {
    const again = await written(await written(NX));
    expect([...exempt(again)].sort()).toEqual(["@orthograph/*", "orthograph", "x@1"]);
    const doc = parse(again) as Json;
    expect(doc["minimumReleaseAge"] === undefined || (typeof doc["minimumReleaseAge"] === "number" && doc["minimumReleaseAge"] > 0)).toBe(true);
    expect(exempt(again)).not.toContain("*");
  });
  it("nothing outside the package names is exempted: no wildcard, no other scope", async () => {
    for (const e of exempt(await written(undefined))) expect(e === "orthograph" || e === "@orthograph/*", e).toBe(true);
  });
});

describe("47 last: nothing but Node and pnpm ran", () => {
  it("no curl, wget, nc, ssh, python or gh was run by any command above", () => { expect(shimmed()).toBe(""); });
});
