import { Effect, Redacted } from "effect";
import { recoverMessageAddress } from "viem";
import { describe, expect, it } from "vitest";
import { Keys } from "./service.ts";

describe("Keys", () => {
  it("makes a redacted secret that makes a key whose message signature recovers to its address", async () => {
    const secret = await Effect.runPromise(Keys.generate);
    expect(String(secret)).toBe("<redacted>");
    const key = await Effect.runPromise(Keys.fromSecret(secret));
    const signature = await Effect.runPromise(key.signMessage("orthograph wallet journey"));
    expect(signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
    expect(await recoverMessageAddress({ message: "orthograph wallet journey", signature })).toBe(key.address);
    expect(key.signer.address).toBe(key.address);
  });

  it("refuses a malformed secret without saying it", async () => {
    const bad = Redacted.make("0xnot-a-key-at-all-but-secret-looking");
    const fault = await Effect.runPromise(Keys.fromSecret(bad).pipe(Effect.flip));
    expect(fault).toMatchObject({ _tag: "ChainFault", kind: "signing" });
    expect(JSON.stringify(fault)).not.toContain("secret-looking");
  });

  it("hashes with keccak-256 and reads addresses", () => {
    expect(Buffer.from(Keys.keccak256(new Uint8Array())).toString("hex")).toBe("c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
    expect(Keys.isAddress("0x0000000000000000000000000000000000000001")).toBe(true);
    expect(Keys.isAddress("0x01")).toBe(false);
  });
});
