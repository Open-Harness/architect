// Check 11 (Goal 16 unit A1, #1164): `ortho new adapter <name> --from-abi <file>` as a user runs it.
//
// The contract judged (design/decisions/CX-from-abi.md; the files' shape is packages/generators/src/modules/abi/README.md):
//  - `ortho new adapter --help` lists `--from-abi` beside `--from-openapi`;
//  - `--from-abi`, given once per contract, writes `plugins/<name>/` (the generator's files for those ABIs, each contract named
//    by its file's base name), exits 0 and says what it made on its last line; run again, it puts the generated files back;
//  - neither flag, or both, is refused, exit 2, naming both; a refusal of the files (a name, a missing file, not an ABI) exits 2
//    with nothing written;
//  - the adapter it writes mounts in an app: `ortho check` passes with it mounted and one of its calls included, and the model
//    has the mount with that call and its stand-in.
// Expected files come from the generator (`@orthograph/generators/abi`, judged on its own in its package), the fixture's ABI and
// the README, never from what the command wrote.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { Effect } from "effect";
import { AbiAdapter } from "@orthograph/generators/abi";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, repo } from "../layer1/support.ts";
import { run } from "./support.ts";

const fixtures = join(repo, "packages/generators/src/modules/abi/fixtures");
const probeJson = readFileSync(join(fixtures, "Probe.json"), "utf8");
const quietJson = readFileSync(join(fixtures, "Quiet.json"), "utf8");

const cleanups: Array<() => void> = [];
afterEach(() => { for (const c of cleanups.splice(0)) c(); });
const folder = () => {
  const root = mkdtempSync(join(tmpdir(), "ortho-m2-11-"));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "out/Probe.sol"), { recursive: true });
  writeFileSync(join(root, "out/Probe.sol/Probe.json"), probeJson);
  writeFileSync(join(root, "Quiet.json"), quietJson);
  return { root, probe: join(root, "out/Probe.sol/Probe.json"), quiet: join(root, "Quiet.json") };
};
const walk = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)])) : [];
const treeOf = (dir: string) => new Map(walk(dir).map((f) => [relative(dir, f), readFileSync(f, "utf8")]));
const expectedFiles = async (name: string, contracts: ReadonlyArray<readonly [string, string]>) =>
  new Map((await Effect.runPromise(AbiAdapter.generate({ name, contracts: contracts.map(([contract, json]) => ({ contract, json: JSON.parse(json) as unknown })) }))).files.map((f) => [f.path, f.content]));

describe("11 ortho new adapter --from-abi: the command", () => {
  it("`ortho new adapter --help` lists --from-abi beside --from-openapi", () => {
    const { root } = folder();
    const said = run(root, "new", "adapter", "--help");
    expect(said.status, said.out).toBe(0);
    expect(said.out).toContain("--from-abi");
    expect(said.out).toContain("--from-openapi");
  });

  it("writes plugins/<name>/ from the ABIs, each contract named by its file, exits 0 and says what it made last", async () => {
    const f = folder();
    const said = run(f.root, "new", "adapter", "probe-kit", "--from-abi", f.probe, "--from-abi", f.quiet);
    expect(said.status, said.out).toBe(0);
    expect(said.stdout.trim().split("\n").at(-1)).toBe("generated adapter probe-kit: 2 contracts, 15 calls, 4 events, 2 errors");
    expect(treeOf(join(f.root, "plugins/probe-kit"))).toEqual(await expectedFiles("probe-kit", [["Probe", probeJson], ["Quiet", quietJson]]));
  });

  it("puts the generated files back when run again, and keeps the scaffolds", async () => {
    const f = folder();
    expect(run(f.root, "new", "adapter", "probe-kit", "--from-abi", f.probe).status).toBe(0);
    const dir = join(f.root, "plugins/probe-kit");
    writeFileSync(join(dir, "src/generated/Probe.ts"), "// broken\n");
    writeFileSync(join(dir, "src/index.ts"), "// mine\n");
    const again = run(f.root, "new", "adapter", "probe-kit", "--from-abi", f.probe);
    expect(again.status, again.out).toBe(0);
    const expected = await expectedFiles("probe-kit", [["Probe", probeJson]]);
    expect(readFileSync(join(dir, "src/generated/Probe.ts"), "utf8")).toBe(expected.get("src/generated/Probe.ts"));
    expect(readFileSync(join(dir, "src/index.ts"), "utf8")).toBe("// mine\n");
  });

  it("refuses neither flag and both flags, exit 2, naming both, with nothing written", () => {
    const f = folder();
    for (const args of [[], ["--from-abi", f.probe, "--from-openapi", f.quiet]]) {
      const said = run(f.root, "new", "adapter", "probe-kit", ...args);
      expect(said.status, `${args.join(" ")}: ${said.out}`).toBe(2);
      expect(said.out).toContain("--from-abi");
      expect(said.out).toContain("--from-openapi");
    }
    expect(existsSync(join(f.root, "plugins"))).toBe(false);
  });

  it("refuses what can't make an adapter, exit 2, with nothing written", () => {
    const f = folder();
    writeFileSync(join(f.root, "Thing.json"), "{\"openapi\": \"3.1.0\"}");
    const cases: ReadonlyArray<readonly [ReadonlyArray<string>, RegExp]> = [
      [["Probe Kit", "--from-abi", f.probe], /lower case words/],
      [["probe-kit", "--from-abi", join(f.root, "Missing.json")], /could not read .*Missing\.json/],
      [["probe-kit", "--from-abi", join(f.root, "Thing.json")], /Thing.*not an ABI/i],
    ];
    for (const [args, message] of cases) {
      const said = run(f.root, "new", "adapter", ...args);
      expect(said.status, `${args.join(" ")}: ${said.out}`).toBe(2);
      expect(said.out).toMatch(message);
    }
    expect(existsSync(join(f.root, "plugins"))).toBe(false);
  });
});

describe("11 ortho new adapter --from-abi: the adapter mounts in an app", () => {
  it("`ortho check` passes with it mounted and one call included, and the model has the mount, the call and the stand-in", () => {
    const copy = copyOf(acme);
    cleanups.push(copy.remove);
    const { root } = copy;
    writeFileSync(join(root, "Probe.json"), probeJson);
    const made = run(root, "new", "adapter", "probe-kit", "--from-abi", join(root, "Probe.json"));
    expect(made.status, made.out).toBe(0);
    // The copy's @orthograph is acme's, linked whole: make it a folder of links, so the plugin and chain-evm can join it.
    const scope = join(root, "node_modules/@orthograph");
    rmSync(scope);
    mkdirSync(scope);
    for (const entry of readdirSync(join(acme, "node_modules/@orthograph"))) symlinkSync(join(acme, "node_modules/@orthograph", entry), join(scope, entry));
    if (!existsSync(join(scope, "chain-evm"))) symlinkSync(join(repo, "packages/chain-evm"), join(scope, "chain-evm"));
    symlinkSync(join(root, "plugins/probe-kit"), join(scope, "probe-kit"));
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies: Record<string, string> };
    pkg.dependencies["@orthograph/probe-kit"] = "0.0.0";
    writeFileSync(join(root, "package.json"), JSON.stringify(pkg, null, 2));
    mkdirSync(join(root, "blueprint/adapters"), { recursive: true });
    writeFileSync(join(root, "blueprint/adapters/probe.ts"), `import { Blueprint } from "orthograph";
import adapter from "@orthograph/probe-kit";

export default Blueprint.use(adapter, (a) => [a.include(a.calls.Probe.peek)]);
`);
    const generated = run(root, "generate");
    expect(generated.status, generated.out).toBe(0);
    const checked = run(root, "check");
    expect(checked.status, checked.out).toBe(0);
    const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { mounts: Record<string, { kind: string; package: string; calls?: ReadonlyArray<unknown>; standIn?: unknown }> };
    const mount = model.mounts["probe"];
    expect(mount, `the model's mounts: ${Object.keys(model.mounts).join(", ")}`).toBeDefined();
    expect(mount?.kind).toBe("adapter");
    expect(mount?.package).toBe("@orthograph/probe-kit");
    expect(JSON.stringify(mount?.calls)).toContain("Probe.peek");
    expect(JSON.stringify(mount?.calls)).not.toContain("Probe.poke");
    expect(mount?.standIn).toMatchObject({ how: "process" });
  });
});
