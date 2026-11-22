// Ask #471, the checks (empty handlers until the build): the ABI codec. Every expected value is written out by hand from the ABI
// encoding rules (a word is 32 bytes; a selector is the first 4 bytes of the keccak-256 of the signature, taken with `cast sig`),
// never read back from the output that is judged.
import { getAddress, type Address } from "viem";
import { describe, expect, test } from "vitest";
import { addressWord, decode, encode, hex, word } from "./internal/fixtures.ts";

// A seeded property run: no table of answers can hold these, only a codec.
describe("Abi against generated values", () => {
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const make = (seed: number) => {
    const next = seeded(seed);
    const bits = (width: number) => {
      let value = 0n;
      for (let done = 0; done < width; done += 32) value = (value << 32n) | BigInt(Math.floor(next() * 4294967296));
      return value & ((1n << BigInt(width)) - 1n);
    };
    const uint = () => bits(1 + Math.floor(next() * 256));
    const address = () => `0x${bits(160).toString(16).padStart(40, "0")}` as Address;
    const list = () => Array.from({ length: Math.floor(next() * 9) }, uint);
    return { uint, address, list, bool: () => next() < 0.5, byte: () => Number(bits(8)) };
  };

  test("encodeCall of 150 generated calls matches the words written by hand", () => {
    const gen = make(4710);
    for (let i = 0; i < 150; i++) {
      const [to, value, values] = [gen.address(), gen.uint(), gen.list()];
      expect(encode("transfer", [to, value])).toBe(hex("a9059cbb", addressWord(to), word(value)));
      expect(encode("sum", [values])).toBe(hex("0194db8e", word(0x20n), word(BigInt(values.length)), ...values.map(word)));
    }
  });

  test("decodeResult of 150 generated answers returns the generated values", () => {
    const gen = make(4711);
    for (let i = 0; i < 150; i++) {
      const [value, who, values, flag, small] = [gen.uint(), gen.address(), gen.list(), gen.bool(), gen.byte()];
      expect(decode("totalSupply", hex(word(value)))).toBe(value);
      expect(decode("owner", hex(addressWord(who)))).toBe(getAddress(who));
      expect(decode("position", hex(word(value), addressWord(who)))).toEqual({ x: value, owner: getAddress(who) });
      expect(decode("values", hex(word(0x20n), word(BigInt(values.length)), ...values.map(word)))).toEqual(values);
      expect(decode("pair", hex(word(value), word(flag ? 1n : 0n)))).toEqual([value, flag]);
      expect(decode("small", hex(word(BigInt(small))))).toBe(small);
    }
  });
});
