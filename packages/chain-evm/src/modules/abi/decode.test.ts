// Ask #471, the checks (empty handlers until the build): the ABI codec. Every expected value is written out by hand from the ABI
// encoding rules (a word is 32 bytes; a selector is the first 4 bytes of the keccak-256 of the signature, taken with `cast sig`),
// never read back from the output that is judged.
import { Effect } from "effect";
import type { Hex } from "viem";
import { describe, expect, test } from "vitest";
import { ChainFault } from "../faults/types.ts";
import { OWNER, addressWord, decode, decodeFault, hex, word } from "./internal/fixtures.ts";

describe("Abi.decodeResult", () => {
  test("the answer is always a list, one element per output: a single uint256 is [value], from zero to the largest", () => {
    expect(decode("totalSupply", hex(word(42n)))).toEqual([42n]);
    expect(decode("totalSupply", hex(word(0n)))).toEqual([0n]);
    expect(decode("totalSupply", hex("f".repeat(64)))).toEqual([2n ** 256n - 1n]);
  });

  test("an address comes back checksummed", () => {
    expect(decode("owner", hex(addressWord(OWNER)))).toEqual([OWNER]);
  });

  test("a tuple is an object by its component names", () => {
    expect(decode("position", hex(word(7n), addressWord(OWNER)))).toEqual([{ x: 7n, owner: OWNER }]);
  });

  test("a dynamic array is one element, an array, empty or not", () => {
    expect(decode("values", hex(word(0x20n), word(3n), word(1n), word(2n), word(3n)))).toEqual([[1n, 2n, 3n]]);
    expect(decode("values", hex(word(0x20n), word(0n)))).toEqual([[]]);
  });

  test("a string, and several outputs as one element each, in order", () => {
    expect(decode("name", hex(word(0x20n), word(5n), `68656c6c6f${"0".repeat(54)}`))).toEqual(["hello"]);
    expect(decode("pair", hex(word(5n), word(1n)))).toEqual([5n, true]);
  });

  test("a function with no outputs answers an empty list from empty data", () => {
    expect(decode("ping", "0x")).toEqual([]);
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
      // Canonical answers only: trailing bytes, an address word with set high bytes, and a uint8 that does not fit.
      ["totalSupply", hex(word(42n), "00".repeat(40))],
      ["owner", hex("00".repeat(11), "01", OWNER.slice(2).toLowerCase())],
      ["small", hex(word(300n))],
    ];
    for (const [functionName, data] of malformed) {
      const fault = decodeFault(functionName, data);
      expect(fault, `${functionName} ${data}`).toBeInstanceOf(ChainFault);
      expect(fault.message.length).toBeGreaterThan(0);
    }
    expect(decodeFault("ping", hex(word(1n)))).toBeInstanceOf(ChainFault);
  });
});
