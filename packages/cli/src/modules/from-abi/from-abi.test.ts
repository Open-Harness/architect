// `FromAbi.adapter` (#1164): reads each ABI file, writes only when the whole adapter can be made, names each contract by its file,
// puts generated files back and leaves scaffolds. The files expected are the generator's for the same ABIs (judged on their own in
// packages/generators/src/modules/abi/); this judges what the command reads and writes.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { Effect } from "effect";
import { AbiAdapter } from "@orthograph/generators/abi";
import { afterEach, describe, expect, it } from "vitest";
import { FromAbi } from "./service.ts";

const repo = join(import.meta.dirname, "../../../../..");
const fixtures = join(repo, "packages/generators/src/modules/abi/fixtures");
const probeJson = readFileSync(join(fixtures, "Probe.json"), "utf8");
const quietJson = readFileSync(join(fixtures, "Quiet.json"), "utf8");

const dirs: Array<string> = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
/** A project folder of its own, with the ABI files under `out/`, as forge leaves them. */
const project = () => {
  const root = mkdtempSync(join(tmpdir(), "ortho-from-abi-"));
  dirs.push(root);
  mkdirSync(join(root, "out/Probe.sol"), { recursive: true });
  writeFileSync(join(root, "out/Probe.sol/Probe.json"), probeJson);
  writeFileSync(join(root, "Quiet.json"), quietJson);
  return { root, probe: join(root, "out/Probe.sol/Probe.json"), quiet: join(root, "Quiet.json") };
};
const run = (root: string, name: string, from: ReadonlyArray<string>) => Effect.runPromise(Effect.result(FromAbi.adapter({ root, name, from })));
const says = (r: Awaited<ReturnType<typeof run>>) => (r._tag === "Failure" ? r.failure.message : `made: ${r.success.join(" | ")}`);
const walk = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)])) : [];
const treeOf = (dir: string) => new Map(walk(dir).map((f) => [relative(dir, f), readFileSync(f, "utf8")]));
const generated = (name: string) => Effect.runPromise(AbiAdapter.generate({ name, contracts: [
  { contract: "Probe", json: JSON.parse(probeJson) as unknown }, { contract: "Quiet", json: JSON.parse(quietJson) as unknown },
] }));

describe("FromAbi.adapter", () => {
  it("writes the generator's files for the contracts to plugins/<name>/, each contract named by its file, and nothing else", async () => {
    const p = project();
    const r = await run(p.root, "probe-kit", [p.probe, p.quiet]);
    expect(r._tag, says(r)).toBe("Success");
    const expected = new Map((await generated("probe-kit")).files.map((f) => [f.path, f.content]));
    expect(treeOf(join(p.root, "plugins/probe-kit"))).toEqual(expected);
    // Nothing outside the plugin's folder: the inputs are as they were.
    expect([...treeOf(p.root).keys()].filter((f) => !f.startsWith("plugins/probe-kit/")).sort()).toEqual(["Quiet.json", "out/Probe.sol/Probe.json"]);
    expect(readFileSync(p.probe, "utf8")).toBe(probeJson);
  });

  it("says what it made on its last line: the contracts, calls, events and errors", async () => {
    const p = project();
    const r = await run(p.root, "probe-kit", [p.probe, p.quiet]);
    expect(r._tag === "Success" ? r.success.at(-1) : says(r)).toBe("generated adapter probe-kit: 2 contracts, 26 calls, 7 events, 5 errors");
    const one = await run(p.root, "solo", [p.probe]);
    expect(one._tag === "Success" ? one.success.at(-1) : says(one)).toBe("generated adapter solo: 1 contracts, 24 calls, 6 events, 5 errors");
  });

  it("puts every generated file back when run again, and leaves the scaffolds as the user changed them", async () => {
    const p = project();
    expect((await run(p.root, "probe-kit", [p.probe, p.quiet]))._tag).toBe("Success");
    const dir = join(p.root, "plugins/probe-kit");
    const before = treeOf(dir);
    writeFileSync(join(dir, "src/index.ts"), "// mine now\n");
    writeFileSync(join(dir, "package.json"), "{\"name\": \"mine\"}\n");
    writeFileSync(join(dir, "src/generated/Probe.ts"), "// broken\n");
    writeFileSync(join(dir, "abi/Quiet.json"), "[]\n");
    rmSync(join(dir, "src/generated/index.ts"));
    writeFileSync(join(dir, "src/written.ts"), "// a file of the user's own\n");
    writeFileSync(join(dir, "blueprint/README.md"), "# mine too\n");
    expect((await run(p.root, "probe-kit", [p.probe, p.quiet]))._tag).toBe("Success");
    const after = treeOf(dir);
    for (const path of ["src/generated/Probe.ts", "src/generated/Quiet.ts", "src/generated/index.ts", "abi/Probe.json", "abi/Quiet.json"]) expect(after.get(path), path).toBe(before.get(path));
    expect(after.get("src/index.ts")).toBe("// mine now\n");
    expect(after.get("package.json")).toBe("{\"name\": \"mine\"}\n");
    expect(after.get("src/written.ts")).toBe("// a file of the user's own\n");
    expect(after.get("blueprint/README.md")).toBe("# mine too\n");
  });

  it("regenerates an adapter from its own abi/", async () => {
    const p = project();
    expect((await run(p.root, "probe-kit", [p.probe, p.quiet]))._tag).toBe("Success");
    const dir = join(p.root, "plugins/probe-kit");
    const before = treeOf(dir);
    const again = await run(p.root, "probe-kit", [join(dir, "abi/Probe.json"), join(dir, "abi/Quiet.json")]);
    expect(again._tag, says(again)).toBe("Success");
    expect(treeOf(dir)).toEqual(before);
  });

  describe("refuses, with nothing written", () => {
    const refused = async (name: string, from: (p: ReturnType<typeof project>) => ReadonlyArray<string>, message: RegExp) => {
      const p = project();
      const r = await run(p.root, name, from(p));
      expect(r._tag, says(r)).toBe("Failure");
      expect(says(r)).toMatch(message);
      expect(existsSync(join(p.root, "plugins"))).toBe(false);
    };
    it("a name that isn't lower case words", () => refused("Probe Kit", (p) => [p.probe], /"Probe Kit".*lower case words/));
    it("a file it can't read, named", () => refused("probe-kit", (p) => [p.probe, join(p.root, "Missing.json")], /could not read .*Missing\.json/));
    it("a file that isn't JSON, named", () => refused("probe-kit", (p) => { writeFileSync(join(p.root, "Junk.json"), "{ not: json"); return [p.probe, join(p.root, "Junk.json")]; }, /could not parse .*Junk\.json/));
    it("no file at all", () => refused("probe-kit", () => [], /no contract/i));
    it("what the generator refuses, in its words: a file that isn't an ABI", () => refused("probe-kit", (p) => { writeFileSync(join(p.root, "Thing.json"), "{\"openapi\": \"3.1.0\"}"); return [join(p.root, "Thing.json")]; }, /Thing.*not an ABI/i));
    it("what the generator refuses: two files of one contract", () => refused("probe-kit", (p) => [p.probe, p.probe], /Probe/));
    it("what the generator refuses: a file whose name isn't a contract's", () => refused("probe-kit", (p) => { writeFileSync(join(p.root, "my-token.json"), quietJson); return [join(p.root, "my-token.json")]; }, /"my-token"/));
  });

  it("leaves an earlier adapter as it was when a second run is refused", async () => {
    const p = project();
    expect((await run(p.root, "probe-kit", [p.probe]))._tag).toBe("Success");
    const before = treeOf(join(p.root, "plugins/probe-kit"));
    const r = await run(p.root, "probe-kit", [p.probe, join(p.root, "Missing.json")]);
    expect(r._tag).toBe("Failure");
    expect(treeOf(join(p.root, "plugins/probe-kit"))).toEqual(before);
  });
});
