import { Effect, type Redacted } from "effect";
import { describe, expect, it } from "vitest";
import { KeyLocked, SimulationReverted } from "../../../blueprint/things/wallet/errors.js";
import type { Held, Signer } from "../signer/types.ts";
import { Operations } from "./service.ts";

const address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;
const other = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const;

/** A signer that records what it was asked, on chain 31337. */
const recording = () => {
  const asked: Array<string> = [];
  const held: Array<Held> = [];
  const signer: Signer = {
    name: "world",
    chain: { chainId: 31337, rpcUrl: undefined, depth: 1 },
    create: (label) => Effect.sync(() => { asked.push(`create ${label}`); held.push({ label, address }); return { label, address }; }),
    import: (label, source: Redacted.Redacted<string>) => Effect.sync(() => { asked.push(`import ${label} ${String(source)}`); held.push({ label, address: other }); return { label, address: other }; }),
    keys: Effect.sync(() => held),
    sign: (label, message) => Effect.sync(() => { asked.push(`sign ${label} ${message}`); return `0x${"ab".repeat(65)}` as const; }),
    send: (label, to, value) => Effect.sync(() => { asked.push(`send ${label} ${to} ${value}`); return { transaction: `0x${"cd".repeat(32)}` as const, level: "confirmed" as const, nonce: 0n }; }),
  };
  return { asked, ops: Operations.on(() => Effect.succeed(signer)) };
};

describe("Operations", () => {
  it("answers CAIP-10 accounts and the wallet's id, and lists them with a count", async () => {
    const { ops } = recording();
    const made = await Effect.runPromise(ops.create({ signer: "world", label: "fresh" }));
    expect(made).toEqual({ wallet: "wal_70997970c51812dc", account: `eip155:31337:${address}` });
    await Effect.runPromise(ops.import({ signer: "world", label: "funded", source: "a-secret" }));
    expect(await Effect.runPromise(ops.keys({ signer: "world" }))).toEqual({ count: 2n, accounts: `eip155:31337:${address},eip155:31337:${other}` });
  });

  it("gives a secret to the signer redacted, never as text", async () => {
    const { ops, asked } = recording();
    await Effect.runPromise(ops.import({ signer: "world", label: "funded", source: "a-secret" }));
    expect(asked).toEqual(["import funded <redacted>"]);
  });

  it("sends to an account on the signer's chain, with the bare address and the value", async () => {
    const { ops, asked } = recording();
    const sent = await Effect.runPromise(ops.send({ signer: "world", label: "funded", to: `eip155:31337:${other}`, value: 1_000n }));
    expect(sent).toMatchObject({ level: "confirmed", nonce: 0n });
    expect(asked).toEqual([`send funded ${other} 1000`]);
  });

  it("refuses a send to another chain, to no account, and a signer that is none, before anything is asked of a signer", async () => {
    const { ops, asked } = recording();
    expect(await Effect.runPromise(Effect.flip(ops.send({ signer: "world", label: "x", to: `eip155:1:${other}`, value: 1n })))).toBeInstanceOf(SimulationReverted);
    expect(await Effect.runPromise(Effect.flip(ops.send({ signer: "world", label: "x", to: "nobody", value: 1n })))).toBeInstanceOf(SimulationReverted);
    expect(await Effect.runPromise(Effect.flip(ops.keys({ signer: "everyone" })))).toBeInstanceOf(KeyLocked);
    expect(asked).toEqual([]);
  });
});
