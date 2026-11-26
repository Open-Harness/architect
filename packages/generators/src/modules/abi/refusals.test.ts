// What `AbiAdapter.generate` refuses (#1164, README.md "What it refuses"): `AbiRefused`, its message naming the contract and the
// item, never a guess. Each ABI here is the smallest that shows one refusal; the rest of it is valid, so nothing else is refused.
import { describe, expect, it } from "vitest";
import { made, probe, refusal } from "../../../test/from-abi.ts";
import type { ContractInput } from "./types.ts";

type Item = Record<string, unknown>;
const p = (type: string, name: string, extra: Item = {}): Item => ({ type, name, ...extra });
const fn = (name: string, inputs: ReadonlyArray<Item> = [], outputs: ReadonlyArray<Item> = [], stateMutability = "view"): Item =>
  ({ type: "function", name, inputs, outputs, stateMutability });
/** A valid function beside the item judged, so only that item can be what is refused. */
const ok = fn("fine", [p("uint256", "x")], [p("bool", "")]);
const contract = (items: ReadonlyArray<Item>, name = "Probe"): ContractInput => ({ contract: name, json: [ok, ...items] });

describe("the name and the contracts", () => {
  it("refuses an adapter name that isn't lower case words joined by dashes, naming it", async () => {
    for (const name of ["Probe", "probe_kit", "probe kit", "-probe", "probe-", "9probe", ""]) {
      expect(await refusal([probe], name), name).toContain(JSON.stringify(name));
    }
  });

  it("takes lower case words joined by dashes", async () => {
    for (const name of ["probe", "probe-kit", "erc20", "zodiac-roles"]) expect((await made([probe], name)).files.length, name).toBeGreaterThan(0);
  });

  it("refuses no contract at all", async () => {
    expect(await refusal([])).toMatch(/no contract/i);
  });

  it("refuses two contracts of one name, naming it", async () => {
    expect(await refusal([probe, { ...probe }])).toContain("Probe");
  });

  it("refuses a contract name that isn't an identifier starting with a capital letter, naming it", async () => {
    for (const name of ["probe", "9Lives", "Pro-be", "Pro be", "", "Probe.sol"]) {
      expect(await refusal([contract([], name)]), name).toContain(JSON.stringify(name));
    }
  });
});

describe("the file", () => {
  it("refuses JSON that is neither an ABI nor an artifact holding one, naming the contract", async () => {
    for (const json of [{}, "abi", null, 7, [1], [null], { abi: "x" }, { abi: {} }, { bytecode: "0x00" }]) {
      const message = await refusal([{ contract: "Probe", json }]);
      expect(message, JSON.stringify(json)).toContain("Probe");
      expect(message, JSON.stringify(json)).toMatch(/not an ABI/i);
    }
  });

  it("refuses an item with no known type, naming the type", async () => {
    expect(await refusal([contract([{ type: "gizmo", name: "g" }])])).toContain("gizmo");
    expect(await refusal([contract([{ name: "g", inputs: [] }])])).toContain("Probe");
  });

  it("refuses a function, an event or an error with no name", async () => {
    for (const type of ["function", "event", "error"]) {
      const item = type === "function" ? { type, inputs: [], outputs: [], stateMutability: "view" } : { type, inputs: [] };
      const message = await refusal([contract([item])]);
      expect(message, type).toContain("Probe");
      expect(message, type).toContain(type);
    }
  });

  it("refuses bytecode that isn't 0x and an even number of hex digits, naming the contract", async () => {
    for (const bytecode of ["0x123", "6080", "0xzz", "0x60 80", 42]) {
      const message = await refusal([{ contract: "Probe", json: { abi: [ok], bytecode } }]);
      expect(message, String(bytecode)).toContain("Probe");
      expect(message, String(bytecode)).toMatch(/bytecode/i);
    }
  });

  it("refuses a contract with no function and no event, and takes one with only an event", async () => {
    const onlyError = await refusal([{ contract: "Probe", json: [{ type: "error", name: "Oops", inputs: [] }, { type: "constructor", inputs: [], stateMutability: "nonpayable" }] }]);
    expect(onlyError).toContain("Probe");
    expect(onlyError).toMatch(/no function and no event/i);
    const events = await made([{ contract: "Probe", json: [{ type: "event", name: "Moved", anonymous: false, inputs: [p("uint256", "x")] }] }]);
    expect(events.contracts).toEqual([{ contract: "Probe", calls: 0, events: 1, errors: 0, deployable: false }]);
  });
});

describe("the items", () => {
  const cases: ReadonlyArray<readonly [string, Item, string]> = [
    ["an unnamed input of a function", fn("f", [p("uint256", "")]), "Probe: function f"],
    ["an unnamed input of an event", { type: "event", name: "E", anonymous: false, inputs: [p("uint256", "")] }, "Probe: event E"],
    ["an unnamed input of an error", { type: "error", name: "Oops", inputs: [p("uint256", "")] }, "Probe: error Oops"],
    ["an unnamed input of the constructor", { type: "constructor", stateMutability: "nonpayable", inputs: [p("uint256", "")] }, "Probe: constructor"],
    ["an unnamed tuple component", fn("g", [p("tuple", "t", { components: [p("uint256", "a"), p("bool", "")] })]), "Probe: function g"],
    ["an unnamed tuple component of an output", fn("g2", [], [p("tuple", "", { components: [p("uint256", "")] })]), "Probe: function g2"],
    ["an unnamed output of a function with several", fn("h", [], [p("uint256", "a"), p("bool", "")]), "Probe: function h"],
    ["two inputs of one name", fn("k", [p("uint256", "x"), p("bool", "x")]), "Probe: function k"],
    ["two outputs of one name", fn("k2", [], [p("uint256", "x"), p("bool", "x")]), "Probe: function k2"],
    ["two components of one name", fn("k3", [p("tuple", "t", { components: [p("uint256", "a"), p("bool", "a")] })]), "Probe: function k3"],
    ["a fixed-point type", fn("m", [p("fixed128x18", "x")]), "Probe: function m"],
    ["an unsigned fixed-point type", fn("m2", [p("ufixed", "x")]), "Probe: function m2"],
    ["a function type", fn("n", [p("function", "cb")]), "Probe: function n"],
    ["an unmapped type inside an array", fn("n2", [p("fixed[]", "xs")]), "Probe: function n2"],
    ["an anonymous event", { type: "event", name: "Quiet", anonymous: true, inputs: [] }, "Probe: event Quiet"],
  ];
  for (const [what, item, named] of cases) {
    it(`refuses ${what}, naming it (${named})`, async () => {
      expect(await refusal([contract([item])])).toContain(named);
    });
  }

  it("takes a lone unnamed output, of a plain type or a tuple", async () => {
    const lone = await made([contract([fn("one", [], [p("uint256", "")]), fn("two", [], [p("tuple", "", { components: [p("uint256", "a")] })])])]);
    expect(lone.contracts[0]?.calls).toBe(3);
  });

  it("refuses two generated names that collide, naming the name (function transferEvent and event Transfer both make TransferEventArgs)", async () => {
    const message = await refusal([contract([
      fn("transferEvent", [p("uint256", "x")]),
      { type: "event", name: "Transfer", anonymous: false, inputs: [p("uint256", "x")] },
    ])]);
    expect(message).toContain("TransferEventArgs");
  });

  it("refuses an overload whose suffixed name another item already has (send, send and send_1)", async () => {
    const message = await refusal([contract([fn("send", [p("address", "to")]), fn("send", [p("address", "to"), p("uint256", "v")]), fn("send_1", [])])]);
    expect(message).toContain("send_1");
  });
});
