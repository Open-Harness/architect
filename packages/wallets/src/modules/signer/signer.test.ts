import { Effect, Redacted } from "effect";
import { Keys, type Address, type Hex } from "@orthograph/chain-evm/device";
import { describe, expect, it } from "vitest";
import { KeyLocked, NoSuchKey } from "../../../blueprint/things/wallet/errors.js";
import { Signers } from "./service.ts";

const chain = { chainId: 31337, rpcUrl: undefined, depth: 1 };
const fresh = () => Signers.keyed("world", chain, Signers.memory(new Map<string, { secret: Redacted.Redacted<Hex>; address: Address }>()));
const secret = () => Effect.runPromise(Keys.generate);

describe("a signer over a keyring", () => {
  it("makes a key once per label, and lists what it holds", async () => {
    const signer = fresh();
    const first = await Effect.runPromise(signer.create("demo"));
    expect(await Effect.runPromise(signer.create("demo"))).toEqual(first);
    expect(await Effect.runPromise(signer.keys)).toEqual([first]);
  });

  it("imports a key under a label, answers the same key again, and never replaces a label with another key", async () => {
    const signer = fresh();
    const mine = await secret();
    const held = await Effect.runPromise(signer.import("funded", mine));
    expect(held.address).toBe((await Effect.runPromise(Keys.fromSecret(mine))).address);
    expect(await Effect.runPromise(signer.import("funded", mine))).toEqual(held);
    expect(await Effect.runPromise(Effect.flip(signer.import("funded", await secret())))).toBeInstanceOf(KeyLocked);
    expect(await Effect.runPromise(signer.keys)).toEqual([held]);
  });

  it("refuses a secret that is no key as KeyLocked, and says nothing of it", async () => {
    const refused = await Effect.runPromise(Effect.flip(fresh().import("x", Redacted.make("0xnot-a-key-secret-looking"))));
    expect(refused).toBeInstanceOf(KeyLocked);
    expect(JSON.stringify(refused)).not.toContain("secret-looking");
  });

  it("signs an EIP-191 message with the key of the label, and has no key it was not given", async () => {
    const signer = fresh();
    const mine = await secret();
    await Effect.runPromise(signer.import("funded", mine));
    const key = await Effect.runPromise(Keys.fromSecret(mine));
    expect(await Effect.runPromise(signer.sign("funded", "hello"))).toBe(await Effect.runPromise(key.signMessage("hello")));
    expect(await Effect.runPromise(Effect.flip(signer.sign("nobody", "hello")))).toBeInstanceOf(NoSuchKey);
  });
});

describe("a signer a host does not have", () => {
  it("refuses everything as KeyLocked", async () => {
    const signer = Signers.absent("node", chain, "no keystore here");
    const refusals: ReadonlyArray<Effect.Effect<unknown, unknown>> = [signer.create("a"), signer.import("a", Redacted.make("0x")), signer.keys, signer.sign("a", "m")];
    for (const refusal of refusals) {
      expect(await Effect.runPromise(Effect.flip(refusal))).toBeInstanceOf(KeyLocked);
    }
  });
});
