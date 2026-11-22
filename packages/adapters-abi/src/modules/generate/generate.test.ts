// What `plan` writes (ST2-abi-adapters section 2 and 5; the shape is in README.md). Each ABI type is planted once against the
// decision's table; the expected text is written here from the decision, never from what `plan` answered.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { AbiAdapters } from "./service.ts";
import {
  fileOf, interfaceOf, kitchenSink, moved, noAnswer, noArgs, oops, param, planOf, pureOne, readOnly, statementOf,
} from "./internal/abis.ts";
import type { AbiItem } from "./types.ts";

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const all: ReadonlyArray<AbiItem> = [kitchenSink, moved, oops, readOnly, pureOne, noArgs, noAnswer];

describe("plan: the files", () => {
  it("writes the adapter, the four generated files and (with bytecode) the stand-in's, sorted by path", async () => {
    expect((await run(planOf(all))).map((f) => f.path)).toEqual([
      "adapter.ts", "generated/calls.ts", "generated/errors.ts", "generated/events.ts", "generated/types.ts",
    ]);
    expect((await run(planOf(all, "0x6080"))).map((f) => f.path)).toEqual([
      "adapter.ts", "generated/calls.ts", "generated/errors.ts", "generated/events.ts", "generated/stand-in.ts", "generated/types.ts",
    ]);
  });

  it("opens each file with its header: generated files `Generated from`, the adapter `Scaffolded from`", async () => {
    for (const file of await run(planOf(all, "0x6080"))) {
      const first = file.content.split("\n")[0];
      expect(first).toBe(file.path === "adapter.ts"
        ? "// Scaffolded from abi.json. Yours from now on."
        : "// Generated from abi.json. Do not edit.");
    }
  });

  it("gives the same files, byte for byte, for the same input, and a different ABI gives different ones", async () => {
    const one = await run(planOf(all));
    expect(await run(planOf(all))).toEqual(one);
    const other = await run(planOf([kitchenSink]));
    expect(other.find((f) => f.path === "generated/types.ts")?.content).not.toBe(one.find((f) => f.path === "generated/types.ts")?.content);
  });

  it("puts the bytecode in generated/stand-in.ts exactly", async () => {
    expect(fileOf(await run(planOf(all, "0x6080604052")), "generated/stand-in.ts")).toContain(`"0x6080604052"`);
  });

  it("reads past a constructor, a fallback and a receive function", async () => {
    const files = await run(planOf([...all, { type: "constructor", inputs: [] }, { type: "fallback" }, { type: "receive", stateMutability: "payable" }]));
    expect(files.map((f) => f.path)).toHaveLength(5);
  });

  it("imports only the types it uses: an ABI with no address and no bytes imports neither", async () => {
    const types = fileOf(await run(planOf([noAnswer])), "generated/types.ts");
    expect(types).not.toContain("Address");
    expect(types).not.toContain("Hex");
    expect(fileOf(await run(planOf([readOnly])), "generated/types.ts")).toContain(`import type { Address } from "@orthograph/chain-evm/device";`);
  });
});

describe("plan: each ABI type maps as the decision's table says", () => {
  it("maps a function's arguments, one member per parameter in ABI order, every uint and int a bigint", async () => {
    const types = fileOf(await run(planOf(all)), "generated/types.ts");
    expect(interfaceOf(types, "KitchenSinkArgs")).toBe([
      "export interface KitchenSinkArgs {",
      "  readonly a: bigint;",
      "  readonly b: bigint;",
      "  readonly c: bigint;",
      "  readonly d: Address;",
      "  readonly e: boolean;",
      "  readonly f: string;",
      "  readonly g: Hex;",
      "  readonly h: Hex;",
      "  readonly i: ReadonlyArray<bigint>;",
      "  readonly j: ReadonlyArray<Address>;",
      "  readonly k: ReadonlyArray<ReadonlyArray<bigint>>;",
      "  readonly pair: KitchenSinkPair;",
      "  readonly pairs: ReadonlyArray<KitchenSinkPairs>;",
      "}",
      "",
    ].join("\n"));
  });

  it("maps a tuple to an interface of its named components, a nested tuple to another, a tuple array to an array of it", async () => {
    const types = fileOf(await run(planOf(all)), "generated/types.ts");
    expect(interfaceOf(types, "KitchenSinkPair")).toBe(
      "export interface KitchenSinkPair {\n  readonly a: bigint;\n  readonly b: Address;\n  readonly inner: KitchenSinkPairInner;\n}\n");
    expect(interfaceOf(types, "KitchenSinkPairInner")).toBe("export interface KitchenSinkPairInner {\n  readonly x: boolean;\n}\n");
    expect(interfaceOf(types, "KitchenSinkPairs")).toBe("export interface KitchenSinkPairs {\n  readonly a: bigint;\n}\n");
  });

  it("maps several named outputs to an interface, one output to its type, and none to void", async () => {
    const types = fileOf(await run(planOf(all)), "generated/types.ts");
    expect(interfaceOf(types, "KitchenSinkAnswer")).toBe(
      "export interface KitchenSinkAnswer {\n  readonly ok: boolean;\n  readonly count: bigint;\n}\n");
    expect(types).toContain("export type PeekAnswer = bigint;\n");
    expect(types).toContain("export type PingAnswer = string;\n");
    expect(types).toContain("export type PokeAnswer = void;\n");
  });

  it("makes no arguments interface for a function with no inputs", async () => {
    const types = fileOf(await run(planOf(all)), "generated/types.ts");
    expect(types).not.toContain("PingArgs");
    expect(interfaceOf(types, "PokeArgs")).toBe("export interface PokeArgs {\n  readonly x: bigint;\n}\n");
  });

  it("maps an event's arguments, and an indexed string, bytes, array or tuple to the Hex of its topic", async () => {
    const types = fileOf(await run(planOf(all)), "generated/types.ts");
    expect(interfaceOf(types, "MovedEventArgs")).toBe([
      "export interface MovedEventArgs {",
      "  readonly who: Address;",
      "  readonly label: Hex;",
      "  readonly blob: Hex;",
      "  readonly list: Hex;",
      "  readonly box: Hex;",
      "  readonly plain: string;",
      "  readonly amount: bigint;",
      "}",
      "",
    ].join("\n"));
  });

  it("maps an error's fields", async () => {
    const types = fileOf(await run(planOf(all)), "generated/types.ts");
    expect(interfaceOf(types, "OopsFields")).toBe("export interface OopsFields {\n  readonly who: Address;\n  readonly needed: bigint;\n}\n");
  });
});

describe("plan: calls, events and errors", () => {
  it("makes a view or pure function a read and any other a write, each taking its arguments object (none for no inputs)", async () => {
    const calls = fileOf(await run(planOf(all)), "generated/calls.ts");
    for (const name of ["peek", "twice", "ping"]) {
      expect(statementOf(calls, name)).toContain("Contract.read");
      expect(statementOf(calls, name)).not.toContain("Contract.write");
    }
    for (const name of ["kitchenSink", "poke"]) {
      expect(statementOf(calls, name)).toContain("Contract.write");
      expect(statementOf(calls, name)).not.toContain("Contract.read");
    }
    expect(statementOf(calls, "peek")).toContain("(args: PeekArgs)");
    expect(statementOf(calls, "ping")).toContain("export const ping = ()");
  });

  it("types a write as answering the Submission and a read as its answer", async () => {
    const calls = fileOf(await run(planOf(all)), "generated/calls.ts");
    expect(statementOf(calls, "poke")).toContain("Effect.Effect<Submission,");
    expect(statementOf(calls, "peek")).toContain("Effect.Effect<PeekAnswer,");
    expect(statementOf(calls, "peek")).toContain("ContractChain>");
  });

  it("makes an event source per event and an error class per error, code `<adapter>.<Error>`, each exit code its own", async () => {
    const files = await run(planOf([...all, { type: "error", name: "Second", inputs: [] }]));
    expect(fileOf(files, "generated/events.ts")).toContain("export const Moved = (address: Address, fromBlock: bigint)");
    const errors = fileOf(files, "generated/errors.ts");
    expect(errors).toContain("export class Oops extends Blueprint.error({");
    expect(errors).toContain("export class Second extends Blueprint.error({");
    expect(errors).toContain(`"app.Oops"`);
    expect(errors).toContain(`"app.Second"`);
    const exits = [...errors.matchAll(/exit: (\d+)/g)].map((m) => m[1]);
    expect(exits).toHaveLength(2);
    expect(new Set(exits).size).toBe(2);
  });

  it("makes the adapter a Blueprint.adapter with a call per function, the events, and a Stand.process stand-in", async () => {
    const adapter = fileOf(await run(planOf(all)), "adapter.ts");
    expect(adapter).toContain("Blueprint.adapter(");
    expect(adapter).toContain("Stand.process(");
    for (const name of ["kitchenSink", "peek", "twice", "ping", "poke"]) expect(adapter).toContain(`${name}: Blueprint.call({ mode: "effect"`);
  });
});

describe("plan: overloads", () => {
  it("names each overload `<name>_<n>` by its order in the ABI, from 1, and leaves a name with one member as it is", async () => {
    const abi: ReadonlyArray<AbiItem> = [
      { type: "function", name: "send", stateMutability: "nonpayable", inputs: [param("address", "to")], outputs: [] },
      { type: "function", name: "send", stateMutability: "nonpayable", inputs: [param("address", "to"), param("uint256", "value")], outputs: [] },
      { type: "function", name: "lone", stateMutability: "view", inputs: [], outputs: [param("bool", "")] },
    ];
    const files = await run(planOf(abi));
    const types = fileOf(files, "generated/types.ts");
    expect(interfaceOf(types, "Send_1Args")).toBe("export interface Send_1Args {\n  readonly to: Address;\n}\n");
    expect(interfaceOf(types, "Send_2Args")).toBe("export interface Send_2Args {\n  readonly to: Address;\n  readonly value: bigint;\n}\n");
    expect(types).toContain("export type LoneAnswer = boolean;");
    expect(types).not.toContain("SendArgs");
    const calls = fileOf(files, "generated/calls.ts");
    expect(calls).toContain("export const send_1 =");
    expect(calls).toContain("export const send_2 =");
    expect(calls).not.toContain("export const send =");
  });
});

describe("parse", () => {
  it("answers the items of an ABI's JSON, and refuses what is not one", async () => {
    expect(await run(AbiAdapters.parse(JSON.parse(JSON.stringify(all))))).toEqual(all);
    for (const bad of [{}, "abi", null, [1], [{ name: "x" }], [{ type: "gizmo" }], [{ type: "function", inputs: [] }], [{ type: "function", name: "f" }]]) {
      expect(await run(Effect.flip(AbiAdapters.parse(bad)))).toMatchObject({ _tag: "AbiRefused" });
    }
  });
});
