// Ask #471, the checks (empty handlers until the build): the ABI codec. Every expected value is written out by hand from the ABI
// encoding rules (a word is 32 bytes; a selector is the first 4 bytes of the keccak-256 of the signature, taken with `cast sig`),
// never read back from the output that is judged.
import { Effect } from "effect";
import { encodeErrorResult, keccak256, stringToHex, type Address, type Hex } from "viem";
import { describe, expect, test } from "vitest";
import type { AbiError } from "../../device.ts";
import { decodeRevert, validateRefusalLock } from "../faults/service.ts";
import type { RefusalLockEntry } from "../faults/types.ts";
import { OWNER, PROGRAM } from "./internal/fixtures.ts";
import { Abi } from "./service.ts";

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
  const pairParts = [{ type: "uint256", name: "x" }, { type: "address", name: "who" }] as const;
  const tupleArray: AbiError = { type: "error", name: "E1", inputs: [{ type: "tuple[]", name: "ps", components: pairParts }] };
  const fixedTupleArray: AbiError = { type: "error", name: "E2", inputs: [{ type: "tuple[2]", name: "ps", components: pairParts }] };
  const nested: AbiError = {
    type: "error", name: "E3",
    inputs: [
      {
        type: "tuple", name: "n",
        components: [
          { type: "tuple", name: "inner", components: [{ type: "uint256", name: "a" }, { type: "bool", name: "b" }] },
          { type: "address[]", name: "list" },
        ],
      },
      { type: "uint8", name: "k" },
    ],
  };
  const nestedArray: AbiError = {
    type: "error", name: "E4",
    inputs: [{
      type: "tuple[]", name: "rows",
      components: [
        { type: "uint256", name: "id" },
        { type: "tuple[]", name: "legs", components: [{ type: "address", name: "who" }, { type: "bool", name: "ok" }] },
      ],
    }],
  };
  const selectorOf = (signature: string) => keccak256(stringToHex(signature)).slice(0, 10);

  test("the selector is the first 4 bytes of the keccak-256 of the signature, which has its tuples written out", () => {
    const cases: ReadonlyArray<readonly [AbiError, string, Hex]> = [
      [insufficient, "InsufficientBalance(uint256,uint256)", "0xcf479181"],
      [bad, "Bad((uint256,address),uint8[])", "0x07b02b85"],
      [empty, "Empty()", "0x3db2a12a"],
      [tupleArray, "E1((uint256,address)[])", "0x750b1dd2"],
      [fixedTupleArray, "E2((uint256,address)[2])", "0xeb55cfcc"],
      [nested, "E3(((uint256,bool),address[]),uint8)", "0x4e94e2cb"],
      [nestedArray, "E4((uint256,(address,bool)[])[])", "0x9c42490b"],
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
    for (const item of [insufficient, bad, empty, tupleArray, fixedTupleArray, nested, nestedArray]) {
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

  test("two programs that raise the same selector are told apart by the entry's program", () => {
    const first = "0x00000000000000000000000000000000000000a1";
    const second = "0x00000000000000000000000000000000000000b2";
    const lock = [Abi.refusal(insufficient, "A-001", first), Abi.refusal(insufficient, "B-001", second)];
    const data = encodeErrorResult({ abi: [insufficient], errorName: "InsufficientBalance", args: [1n, 2n] });
    const refused = (program: Address) => Effect.runSync(Effect.flip(decodeRevert(data, program, lock)));
    expect(refused(first)).toMatchObject({ _tag: "ChainRefusal", code: "A-001", program: first });
    expect(refused(second)).toMatchObject({ _tag: "ChainRefusal", code: "B-001", program: second });
    expect(refused("0x00000000000000000000000000000000000000c3")).toMatchObject({ _tag: "ChainFault", kind: "revert" });
  });
});
