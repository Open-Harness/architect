import { describe, expect, it } from "vitest";
import { canonical, sha256 } from "./digest.ts";

describe("sha256", () => {
  it("matches the standard vectors", () => {
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("hashes a payload the same whatever its key order", () => {
    expect(sha256(canonical({ a: 1, b: 2 }))).toBe(sha256(canonical({ b: 2, a: 1 })));
  });
});
