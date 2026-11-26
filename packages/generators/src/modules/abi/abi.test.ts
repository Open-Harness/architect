// `AbiAdapter.generate` (#1164): the files it makes, their headers, the input kept in `abi/`, and what the generated modules export,
// read by importing them as a plugin is. The expected names and files are README.md's; the ABI values are the fixtures'.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { callNames, fileOf, here, made, probe, probeArtifact, quiet, quietAbi, repo, written, type Written } from "../../../test/from-abi.ts";

const opened: Array<Written> = [];
afterEach(() => { for (const w of opened.splice(0)) w.remove(); });
const open = async (...args: Parameters<typeof written>) => { const w = await written(...args); opened.push(w); return w; };

const ADDRESS = "0x00000000000000000000000000000000000000aa";
/** A port that is never called: `at` and `events` only build what they answer. */
const idle = new Proxy({}, { get: (_t, key) => () => { throw new Error(`the port's ${String(key)} was called while only building calls`); } });

const PROBE_CALLS = ["LIMIT", "boxed", "drain", "fund", "funded", "label", "owner", "pair", "peek", "poke", "refuse", "send_1", "send_2"];
const PROBE_EVENTS = ["Funded", "Poked", "Sent"];
const PROBE_ERRORS = ["Empty", "TooBig"];

describe("the files", () => {
  it("makes abi/, src/generated/ per contract and its index, the descriptor, blueprint/ and package.json, sorted by path", async () => {
    expect((await made([probe, quiet])).files.map((f) => f.path)).toEqual([
      "abi/Probe.json", "abi/Quiet.json", "blueprint/README.md", "package.json", "src/generated/Probe.ts", "src/generated/Quiet.ts", "src/generated/index.ts", "src/index.ts",
    ]);
  });

  it("marks abi/ and src/generated/ generated, and the descriptor, blueprint/README.md and package.json scaffolds", async () => {
    const how = Object.fromEntries((await made([probe, quiet])).files.map((f) => [f.path, f.how]));
    expect(how).toEqual({
      "abi/Probe.json": "generated", "abi/Quiet.json": "generated", "src/generated/Probe.ts": "generated", "src/generated/Quiet.ts": "generated",
      "src/generated/index.ts": "generated", "blueprint/README.md": "scaffold", "package.json": "scaffold", "src/index.ts": "scaffold",
    });
  });

  it("opens each TypeScript file with its header, naming its ABI file or abi/, and nothing else", async () => {
    const adapter = await made([probe, quiet]);
    const first = (path: string) => fileOf(adapter, path).split("\n")[0];
    expect(first("src/generated/Probe.ts")).toBe("// Generated from abi/Probe.json. Do not edit.");
    expect(first("src/generated/Quiet.ts")).toBe("// Generated from abi/Quiet.json. Do not edit.");
    expect(first("src/generated/index.ts")).toBe("// Generated from abi/. Do not edit.");
    expect(first("src/index.ts")).toBe("// Scaffolded from abi/. Yours from now on.");
  });

  it("keeps each input in abi/ as { abi, bytecode }, two-space JSON and a newline, from forge's artifact, a flat artifact or a bare array", async () => {
    const expected = `${JSON.stringify({ abi: probeArtifact.abi, bytecode: probeArtifact.bytecode.object }, null, 2)}\n`;
    expect(fileOf(await made([probe]), "abi/Probe.json")).toBe(expected);
    expect(fileOf(await made([{ contract: "Probe", json: { abi: probeArtifact.abi, bytecode: probeArtifact.bytecode.object } }]), "abi/Probe.json")).toBe(expected);
    expect(fileOf(await made([quiet]), "abi/Quiet.json")).toBe(`${JSON.stringify({ abi: quietAbi }, null, 2)}\n`);
    // Bytecode of `0x` is none: no stand-in, as for a bare array.
    expect(fileOf(await made([{ contract: "Quiet", json: { abi: quietAbi, bytecode: "0x" } }]), "abi/Quiet.json")).toBe(`${JSON.stringify({ abi: quietAbi }, null, 2)}\n`);
  });

  it("gives the same bytes for the same input, whichever form the artifact came in, and different bytes for a different ABI", async () => {
    const once = await made([probe, quiet]);
    expect(await made([probe, quiet])).toEqual(once);
    expect((await made([{ contract: "Probe", json: { abi: probeArtifact.abi, bytecode: probeArtifact.bytecode.object } }, quiet])).files).toEqual(once.files);
    // The contracts' order given is not the files' order.
    expect((await made([quiet, probe])).files).toEqual(once.files);
    const fewer = await made([{ contract: "Probe", json: { ...probeArtifact, abi: probeArtifact.abi.filter((i) => i["name"] !== "peek") } }, quiet]);
    expect(fileOf(fewer, "src/generated/Probe.ts")).not.toBe(fileOf(once, "src/generated/Probe.ts"));
    expect(fileOf(fewer, "src/generated/Quiet.ts")).toBe(fileOf(once, "src/generated/Quiet.ts"));
  });

  it("counts each contract's calls, events and errors, in the order given, and says which has a stand-in", async () => {
    const functions = probeArtifact.abi.filter((i) => i["type"] === "function").length;
    expect(functions).toBe(PROBE_CALLS.length);
    expect((await made([probe, quiet])).contracts).toEqual([
      { contract: "Probe", calls: PROBE_CALLS.length, events: PROBE_EVENTS.length, errors: PROBE_ERRORS.length, deployable: true },
      { contract: "Quiet", calls: 2, events: 1, errors: 0, deployable: false },
    ]);
  });

  it("writes package.json as an adapter's: @orthograph/<name>, a module, its front door, effect and chain-evm at their versions, orthograph a peer", async () => {
    const chainEvm = (JSON.parse(readFileSync(join(repo, "packages/chain-evm/package.json"), "utf8")) as { readonly version: string }).version;
    const effect = (JSON.parse(readFileSync(join(repo, "packages/chain-evm/package.json"), "utf8")) as { readonly dependencies: Record<string, string> }).dependencies["effect"];
    const json = JSON.parse(fileOf(await made([probe], "probe-kit"), "package.json")) as Record<string, unknown>;
    expect(json).toMatchObject({
      name: "@orthograph/probe-kit", type: "module", orthograph: { kind: "adapter", blueprint: "blueprint" }, exports: { ".": "./src/index.ts" },
      dependencies: { effect, "@orthograph/chain-evm": chainEvm }, peerDependencies: { orthograph: "*" },
    });
    expect(Object.keys(json["dependencies"] as object).sort()).toEqual(["@orthograph/chain-evm", "effect"]);
  });
});

describe("one contract's module", () => {
  it("exports abi, bytecode, at, events, deploy and one class per error, and nothing else at run time", async () => {
    const w = await open([probe, quiet]);
    const Probe = await w.load("src/generated/Probe.ts");
    expect(Object.keys(Probe).sort()).toEqual(["abi", "at", "bytecode", "deploy", "events", ...PROBE_ERRORS].sort());
    expect(Probe["abi"]).toEqual(probeArtifact.abi);
    expect(Probe["bytecode"]).toBe(probeArtifact.bytecode.object);
  });

  it("has no bytecode, no deploy and no error classes for a contract with none", async () => {
    const Quiet = await (await open([quiet])).load("src/generated/Quiet.ts");
    expect(Object.keys(Quiet).sort()).toEqual(["abi", "at", "events"]);
    expect(Quiet["abi"]).toEqual(quietAbi);
  });

  it("makes at(chain) one call per function, an overload as <name>_<n>, and calls nothing while it builds them", async () => {
    const w = await open([probe, quiet]);
    const at = (m: Record<string, unknown>) => (m["at"] as (c: unknown) => Record<string, unknown>)({ port: idle, address: ADDRESS });
    const probeCalls = at(await w.load("src/generated/Probe.ts"));
    expect(Object.keys(probeCalls).sort()).toEqual([...PROBE_CALLS].sort());
    expect(callNames(probeArtifact.abi).slice().sort()).toEqual([...PROBE_CALLS].sort());
    for (const name of PROBE_CALLS) expect(typeof probeCalls[name], name).toBe("function");
    expect(Object.keys(at(await w.load("src/generated/Quiet.ts"))).sort()).toEqual(["pair", "ping"]);
  });

  it("makes events.<Event>(address, fromBlock) a source of that event at that address, from that block", async () => {
    const Probe = await (await open([probe])).load("src/generated/Probe.ts");
    const events = Probe["events"] as Record<string, (a: string, b: bigint) => { readonly address: string; readonly fromBlock: bigint; readonly event: unknown; readonly decode: unknown }>;
    expect(Object.keys(events).sort()).toEqual(PROBE_EVENTS);
    for (const name of PROBE_EVENTS) {
      const source = events[name]!(ADDRESS, 12n);
      expect(source.address.toLowerCase(), name).toBe(ADDRESS);
      expect(source.fromBlock, name).toBe(12n);
      expect(source.event, name).toEqual(probeArtifact.abi.find((i) => i["type"] === "event" && i["name"] === name));
      expect(typeof source.decode, name).toBe("function");
    }
  });

  it("makes each error a tagged error class of its name holding its fields, and one with no inputs holding none", async () => {
    const Probe = await (await open([probe])).load("src/generated/Probe.ts");
    const TooBig = Probe["TooBig"] as new (f: { x: bigint; limit: bigint }) => Error & { _tag: string; x: bigint; limit: bigint };
    const Empty = Probe["Empty"] as new (f?: object) => Error & { _tag: string };
    const big = new TooBig({ x: 101n, limit: 100n });
    expect(big).toBeInstanceOf(Error);
    expect({ _tag: big._tag, x: big.x, limit: big.limit }).toEqual({ _tag: "TooBig", x: 101n, limit: 100n });
    const empty = new Empty();
    expect(empty._tag).toBe("Empty");
    expect(Object.keys(empty).filter((k) => !["_tag", "stack", "message", "name", "cause"].includes(k))).toEqual([]);
    expect(Object.keys(big).filter((k) => !["_tag", "stack", "message", "name", "cause"].includes(k)).sort()).toEqual(["limit", "x"]);
  });
});

describe("the index and the descriptor", () => {
  it("exports each contract as a namespace, calls and standIn, and nothing else", async () => {
    const w = await open([probe, quiet]);
    const index = await w.load("src/generated/index.ts");
    expect(Object.keys(index).sort()).toEqual(["Probe", "Quiet", "calls", "standIn"]);
    expect(Object.keys(index["Probe"] as object).sort()).toEqual(Object.keys(await w.load("src/generated/Probe.ts")).sort());
  });

  it("declares one effect-mode call per function, by contract, overloads as <name>_<n>", async () => {
    const index = await (await open([probe, quiet])).load("src/generated/index.ts");
    const calls = index["calls"] as Record<string, Record<string, unknown>>;
    expect(Object.keys(calls).sort()).toEqual(["Probe", "Quiet"]);
    expect(Object.keys(calls["Probe"]!).sort()).toEqual([...PROBE_CALLS].sort());
    expect(Object.keys(calls["Quiet"]!).sort()).toEqual(["pair", "ping"]);
    for (const call of [...Object.values(calls["Probe"]!), ...Object.values(calls["Quiet"]!)]) expect(call).toMatchObject({ kind: "call", mode: "effect" });
  });

  it("says the stand-in is a process naming the contracts with bytecode, or none when none has any", async () => {
    const both = (await (await open([probe, quiet])).load("src/generated/index.ts"))["standIn"] as { kind: string; how: string; what?: string };
    expect({ kind: both.kind, how: both.how }).toEqual({ kind: "stand-in", how: "process" });
    expect(both.what).toContain("Probe");
    expect(both.what).not.toContain("Quiet");
    expect((await (await open([quiet], "quiet")).load("src/generated/index.ts"))["standIn"]).toEqual({ kind: "stand-in", how: "none" });
  });

  it("makes src/index.ts an adapter of those calls and that stand-in, re-exporting the contracts", async () => {
    const w = await open([probe, quiet]);
    const index = await w.load("src/generated/index.ts");
    const front = await w.load<{ default: { kind: string; calls: unknown; standIn: unknown; description: string }; Probe: unknown; Quiet: unknown }>("src/index.ts");
    expect(front.default.kind).toBe("adapter");
    expect(front.default.calls).toBe(index["calls"]);
    expect(front.default.standIn).toBe(index["standIn"]);
    expect(front.default.description.length).toBeGreaterThan(0);
    expect(front.Probe).toBe(index["Probe"]);
    expect(front.Quiet).toBe(index["Quiet"]);
  });
});

describe("the fixture", () => {
  it("is Probe.sol's artifact: every function, event and error the source declares is in its ABI", () => {
    const source = readFileSync(join(here, "fixtures/Probe.sol"), "utf8");
    const declared = [...source.matchAll(/^\s*(?:function|event|error)\s+(\w+)/gm)].map((m) => m[1]).filter((n) => n !== undefined);
    const inAbi = new Set(probeArtifact.abi.map((i) => String(i["name"])));
    for (const name of declared) expect(inAbi.has(name), name).toBe(true);
  });
});
