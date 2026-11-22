// Ask #471, the checks (empty handlers until the build): the ABI codec. Every expected value is written out by hand from the ABI
// encoding rules (a word is 32 bytes; a selector is the first 4 bytes of the keccak-256 of the signature, taken with `cast sig`),
// never read back from the output that is judged.
import { Effect } from "effect";
import { encodeErrorResult, keccak256, parseAbi, stringToHex, type Hex } from "viem";
import { describe, expect, test } from "vitest";
import * as device from "../../device.ts";
import type { AbiDocument, AbiError, AbiFunction } from "../../device.ts";
import { decodeRevert, validateRefusalLock } from "../faults/service.ts";
import { ChainFault, type RefusalLockEntry } from "../faults/types.ts";
import { Abi } from "./service.ts";

const OWNER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const PROGRAM = "0x0000000000000000000000000000000000000001";
const word = (n: bigint) => n.toString(16).padStart(64, "0");
const addressWord = (address: string) => `${"0".repeat(24)}${address.slice(2).toLowerCase()}`;
const hex = (...parts: ReadonlyArray<string>) => `0x${parts.join("")}` as Hex;

const abi = parseAbi([
  "function transfer(address to, uint256 value) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function setName(string name)",
  "function sum(uint256[] values) pure returns (uint256)",
  "function owner() view returns (address)",
  "function position() view returns ((uint256 x, address owner) pos)",
  "function values() view returns (uint256[])",
  "function name() view returns (string)",
  "function pair() view returns (uint256 a, bool b)",
  "function ping()",
]);

const encode = (functionName: string, args?: ReadonlyArray<unknown>) =>
  Effect.runSync(Abi.encodeCall({ abi, functionName, ...(args === undefined ? {} : { args }) }));
const decode = (functionName: string, data: Hex) => Effect.runSync(Abi.decodeResult({ abi, functionName, data }));
const decodeFault = (functionName: string, data: Hex) => Effect.runSync(Effect.flip(Abi.decodeResult({ abi, functionName, data })));

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

describe("Abi.decodeResult", () => {
  test("a uint256, from zero to the largest", () => {
    expect(decode("totalSupply", hex(word(42n)))).toBe(42n);
    expect(decode("totalSupply", hex(word(0n)))).toBe(0n);
    expect(decode("totalSupply", hex("f".repeat(64)))).toBe(2n ** 256n - 1n);
  });

  test("an address comes back checksummed", () => {
    expect(decode("owner", hex(addressWord(OWNER)))).toBe(OWNER);
  });

  test("a tuple is an object by its component names", () => {
    expect(decode("position", hex(word(7n), addressWord(OWNER)))).toEqual({ x: 7n, owner: OWNER });
  });

  test("a dynamic array is an array, empty or not", () => {
    expect(decode("values", hex(word(0x20n), word(3n), word(1n), word(2n), word(3n)))).toEqual([1n, 2n, 3n]);
    expect(decode("values", hex(word(0x20n), word(0n)))).toEqual([]);
  });

  test("a string, and several outputs as an array in order", () => {
    expect(decode("name", hex(word(0x20n), word(5n), `68656c6c6f${"0".repeat(54)}`))).toBe("hello");
    expect(decode("pair", hex(word(5n), word(1n)))).toEqual([5n, true]);
  });

  test("a function with no outputs answers undefined from empty data", () => {
    expect(decode("ping", "0x")).toBeUndefined();
  });

  test("data that does not decode is a ChainFault, never a throw and never a value", () => {
    const malformed: ReadonlyArray<readonly [string, Hex]> = [
      ["totalSupply", "0x"],
      ["totalSupply", hex("00".repeat(31))],
      ["owner", hex(word(1n).slice(0, 62))],
      ["pair", hex(word(5n))],
      ["pair", hex(word(5n), word(2n))],
      ["values", hex(word(0x20n), word(3n), word(1n), word(2n))],
      ["values", hex(word(0x1000n), word(0n))],
      ["name", hex(word(0x20n), word(5n))],
      ["position", hex(word(7n))],
    ];
    for (const [functionName, data] of malformed) {
      const fault = decodeFault(functionName, data);
      expect(fault, `${functionName} ${data}`).toBeInstanceOf(ChainFault);
      expect(fault.message.length).toBeGreaterThan(0);
    }
    expect(decodeFault("mint", hex(word(1n)))).toBeInstanceOf(ChainFault);
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
      { abi: noConstructor, bytecode, args: [100n] },
    ]) {
      expect(Effect.runSync(Effect.flip(Abi.encodeDeploy(input)))).toBeInstanceOf(ChainFault);
    }
  });
});

describe("Abi.refusal", () => {
  const insufficient: AbiError = {
    type: "error", name: "InsufficientBalance",
    inputs: [{ type: "uint256", name: "available" }, { type: "uint256", name: "requested" }],
  };
  const bad: AbiError = {
    type: "error", name: "Bad",
    inputs: [
      { type: "tuple", name: "p", components: [{ type: "uint256", name: "x" }, { type: "address", name: "who" }] },
      { type: "uint8[]", name: "xs" },
    ],
  };
  const empty: AbiError = { type: "error", name: "Empty", inputs: [] };
  const selectorOf = (signature: string) => keccak256(stringToHex(signature)).slice(0, 10);

  test("the selector is the first 4 bytes of the keccak-256 of the signature, which has its tuples written out", () => {
    const cases: ReadonlyArray<readonly [AbiError, string, Hex]> = [
      [insufficient, "InsufficientBalance(uint256,uint256)", "0xcf479181"],
      [bad, "Bad((uint256,address),uint8[])", "0x07b02b85"],
      [empty, "Empty()", "0x3db2a12a"],
    ];
    for (const [item, signature, selector] of cases) {
      const entry = Abi.refusal(item, "TOKEN-001");
      expect(entry.signature).toBe(signature);
      expect(entry.selector).toBe(selector);
      expect(entry.selector).toBe(selectorOf(signature));
    }
  });

  test("the entry holds the code, the item's name and the item, and a program only when one is given", () => {
    const entry = Abi.refusal(insufficient, "TOKEN-001");
    expect(entry).toMatchObject({ code: "TOKEN-001", name: "InsufficientBalance", abi: insufficient });
    expect("program" in entry).toBe(false);
    expect(Abi.refusal(insufficient, "TOKEN-001", PROGRAM).program).toBe(PROGRAM);
  });

  test("the entry passes the refusal lock's own check, for every kind of item", () => {
    for (const item of [insufficient, bad, empty]) {
      Effect.runSync(validateRefusalLock([Abi.refusal(item, "TOKEN-001")]));
    }
  });

  test("decodeRevert decodes a real revert of the contract's own error by the entry", () => {
    const entry = Abi.refusal(insufficient, "TOKEN-001", PROGRAM);
    const data = encodeErrorResult({ abi: [insufficient], errorName: "InsufficientBalance", args: [93n, 94n] });
    expect(Effect.runSync(Effect.flip(decodeRevert(data, PROGRAM, [entry])))).toMatchObject({
      _tag: "ChainRefusal", code: "TOKEN-001", name: "InsufficientBalance", selector: "0xcf479181", program: PROGRAM,
      args: { available: 93n, requested: 94n },
    });
  });

  test("a tuple error and a no-argument error decode by their entries, and a revert of another error stays a ChainFault", () => {
    const lock: ReadonlyArray<RefusalLockEntry> = [Abi.refusal(bad, "TOKEN-002"), Abi.refusal(empty, "TOKEN-003")];
    const tupleData = encodeErrorResult({ abi: [bad], errorName: "Bad", args: [{ x: 5n, who: OWNER }, [1, 2]] });
    expect(Effect.runSync(Effect.flip(decodeRevert(tupleData, undefined, lock)))).toMatchObject({
      _tag: "ChainRefusal", code: "TOKEN-002", name: "Bad", args: { p: { x: 5n, who: OWNER }, xs: [1, 2] },
    });
    const emptyData = encodeErrorResult({ abi: [empty], errorName: "Empty" });
    expect(Effect.runSync(Effect.flip(decodeRevert(emptyData, undefined, lock)))).toMatchObject({
      _tag: "ChainRefusal", code: "TOKEN-003", name: "Empty", args: {},
    });
    const other = encodeErrorResult({ abi: [insufficient], errorName: "InsufficientBalance", args: [1n, 2n] });
    expect(Effect.runSync(Effect.flip(decodeRevert(other, undefined, lock)))).toMatchObject({ _tag: "ChainFault", kind: "revert" });
  });

  test("an entry made for one program does not decode a revert of another", () => {
    const entry = Abi.refusal(insufficient, "TOKEN-001", PROGRAM);
    const data = encodeErrorResult({ abi: [insufficient], errorName: "InsufficientBalance", args: [1n, 2n] });
    expect(Effect.runSync(Effect.flip(decodeRevert(data, PROGRAM, [entry])))).toMatchObject({ _tag: "ChainRefusal", code: "TOKEN-001" });
    expect(Effect.runSync(Effect.flip(decodeRevert(data, "0x0000000000000000000000000000000000000002", [entry]))))
      .toMatchObject({ _tag: "ChainFault", kind: "revert" });
  });
});
