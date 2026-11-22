// Ask #471, the checks (empty handlers until the build): the ABI codec. Every expected value is written out by hand from the ABI
// encoding rules (a word is 32 bytes; a selector is the first 4 bytes of the keccak-256 of the signature, taken with `cast sig`),
// never read back from the output that is judged.
import { Effect } from "effect";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAbi } from "viem";
import { describe, expect, test } from "vitest";
import * as device from "../../device.ts";
import type { AbiDocument, AbiError, AbiFunction } from "../../device.ts";
import { ChainFault } from "../faults/types.ts";
import { OWNER, addressWord, encode, abi, hex, word } from "./internal/fixtures.ts";
import { Abi } from "./service.ts";

describe("the surface", () => {
  test("Abi and the viem ABI types come out of the device entry, which a browser or a Worker can hold", () => {
    expect(device.Abi).toBe(Abi);
    const item: AbiFunction = { type: "function", name: "ping", inputs: [], outputs: [], stateMutability: "nonpayable" };
    const error: AbiError = { type: "error", name: "Empty", inputs: [] };
    const document: AbiDocument = [item, error];
    expect(document).toHaveLength(2);
    expect(device.Abi.refusal(error, "E-1").signature).toBe("Empty()");
  });
});

describe("Abi.encodeCall", () => {
  test("transfer(address,uint256) is its selector, the address word, the amount word", () => {
    expect(encode("transfer", [OWNER, 1000n])).toBe(hex("a9059cbb", addressWord(OWNER), word(1000n)));
  });

  test("balanceOf(address) is selector 0x70a08231 and the address, lower-case and padded to a word", () => {
    expect(encode("balanceOf", [OWNER])).toBe(hex("70a08231", addressWord(OWNER)));
  });

  test("a function with no arguments is its selector alone, with or without an empty args list", () => {
    expect(encode("totalSupply")).toBe("0x18160ddd");
    expect(encode("totalSupply", [])).toBe("0x18160ddd");
  });

  test("a dynamic argument is an offset, a length and the padded bytes", () => {
    expect(encode("setName", ["hi"])).toBe(hex("c47f0027", word(0x20n), word(2n), `6869${"0".repeat(60)}`));
    expect(encode("sum", [[1n, 2n]])).toBe(hex("0194db8e", word(0x20n), word(2n), word(1n), word(2n)));
  });

  test("overloads are told apart by their arguments: transfer(address) and transfer(address,uint256) each get their own selector", () => {
    const overloaded = parseAbi([
      "function transfer(address to) returns (bool)",
      "function transfer(address to, uint256 value) returns (bool)",
    ]);
    const call = (args: ReadonlyArray<unknown>) => Effect.runSync(Abi.encodeCall({ abi: overloaded, functionName: "transfer", args }));
    expect(call([OWNER])).toBe(hex("1a695230", addressWord(OWNER)));
    expect(call([OWNER, 1000n])).toBe(hex("a9059cbb", addressWord(OWNER), word(1000n)));
  });

  test("an unknown function, the wrong number of arguments and an argument of the wrong type are each a ChainFault", () => {
    const faults = [
      Effect.runSync(Effect.flip(Abi.encodeCall({ abi, functionName: "mint", args: [1n] }))),
      Effect.runSync(Effect.flip(Abi.encodeCall({ abi, functionName: "transfer", args: [OWNER] }))),
      Effect.runSync(Effect.flip(Abi.encodeCall({ abi, functionName: "transfer", args: [OWNER, 1n, 2n] }))),
      Effect.runSync(Effect.flip(Abi.encodeCall({ abi, functionName: "transfer", args: ["0x123", 1n] }))),
      Effect.runSync(Effect.flip(Abi.encodeCall({ abi, functionName: "balanceOf" }))),
    ];
    for (const fault of faults) {
      expect(fault).toBeInstanceOf(ChainFault);
      expect(fault.message.length).toBeGreaterThan(0);
    }
  });
});


describe("Abi.encodeDeploy", () => {
  const bytecode = "0x6080604052348015600e575f5ffd5b50" as const;
  const withConstructor = parseAbi(["constructor(uint256 supply, address owner)"]);
  const noConstructor = parseAbi(["function ping()"]);

  test("an ABI with no constructor deploys the bytecode as it is", () => {
    expect(Effect.runSync(Abi.encodeDeploy({ abi: noConstructor, bytecode }))).toBe(bytecode);
    expect(Effect.runSync(Abi.encodeDeploy({ abi: noConstructor, bytecode, args: [] }))).toBe(bytecode);
  });

  test("a constructor's arguments follow the bytecode, encoded as words", () => {
    expect(Effect.runSync(Abi.encodeDeploy({ abi: withConstructor, bytecode, args: [100n, OWNER] })))
      .toBe(hex(bytecode.slice(2), word(100n), addressWord(OWNER)));
  });

  test("a constructor with no arguments given, and arguments for an ABI with no constructor, are each a ChainFault", () => {
    for (const input of [
      { abi: withConstructor, bytecode },
      { abi: withConstructor, bytecode, args: [100n] },
      { abi: withConstructor, bytecode, args: [100n, OWNER, 1n] },
      { abi: noConstructor, bytecode, args: [100n] },
    ]) {
      expect(Effect.runSync(Effect.flip(Abi.encodeDeploy(input)))).toBeInstanceOf(ChainFault);
    }
  });
});


// `/device` is what a browser or a Worker holds: nothing it imports, directly or through the module graph, may be a `node:` module.
describe("the device entry", () => {
  const read = (file: string) => readFileSync(file, "utf8");
  const importsOf = (file: string) => {
    const source = read(file);
    return [
      /^(?:import|export)\s[^;=(]*?\bfrom\s*["']([^"']+)["']/gmu,
      /^import\s*["']([^"']+)["']/gmu,
      /\bimport\(\s*["']([^"']+)["']\s*\)/gu,
    ].flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1] as string));
  };

  test("imports no node: module and no node built-in, in any file it reaches", () => {
    const seen = new Set<string>();
    const pending = [resolve(dirname(fileURLToPath(import.meta.url)), "../../device.ts")];
    const bare = new Set<string>();
    for (const file of pending) {
      if (seen.has(file)) continue;
      seen.add(file);
      for (const specifier of importsOf(file)) {
        if (specifier.startsWith(".")) pending.push(resolve(dirname(file), specifier));
        else bare.add(specifier);
      }
    }
    expect(seen.size).toBeGreaterThan(10);
    expect([...bare].filter((name) => name.startsWith("node:") || ["fs", "path", "net", "child_process", "crypto", "os", "url"].includes(name))).toEqual([]);
    const allowed = (name: string) => name === "@orthograph/language-effect" || /^(?:effect|viem)(?:\/|$)/u.test(name);
    expect([...bare].filter((name) => !allowed(name))).toEqual([]);
  });
});
