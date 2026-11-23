// The relayer's nonce safety (🔍 on #677), against a scripted port in workerd: what happens to a nonce when a send fails in transit, when the
// relayer has no live copy of a submission, and when the call is refused for good. The chain itself is checked on Anvil by
// e2e/on-chain/10-m6-07-relayer.test.ts.
import { env, runInDurableObject } from "cloudflare:test";
import { ChainFault, type ChainPort, type Signed } from "@orthograph/chain-evm/device";
import { Effect, Semaphore } from "effect";
import { describe, expect, it } from "vitest";
import { reconcile, status } from "./internal/check.ts";
import type { Live, Parts } from "./internal/live.ts";
import { relay } from "./internal/relay.ts";
import { makeStore, type Store } from "./internal/store.ts";
import type { Relayer } from "./service.ts";

const FROM = "0x00000000000000000000000000000000000000aa" as const;
const hash = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;
const signedAt = (nonce: number, n: number): Signed => ({
  prepared: { from: FROM, transaction: { type: "eip1559", chainId: 1, nonce, gas: 21_000n, maxFeePerGas: 10n, maxPriorityFeePerGas: 1n, to: FROM, data: "0x" } },
  serialized: `0x02${n.toString(16).padStart(2, "0")}`, hash: hash(n),
});

interface Script {
  probe: Array<{ _tag: string; [key: string]: unknown }>;
  submit: Array<ChainFault | "ok">;
  resume: Array<Signed | ChainFault>;
  /** Every call the port was given, by name: what the relayer asked for. */
  calls: Array<{ name: string; arg?: unknown }>;
  /** What the store held at the moment of each `submit`. */
  atSubmit: Array<ReturnType<Store["find"]>>;
}

const harness = (store: Store, script: Script, sent: Map<string, Signed> = new Map()): Parts => {
  const next = <A>(list: A[]) => list.length > 1 ? list.shift()! : list[0]!;
  let made = 100;
  const port = {
    prepare: () => Effect.sync(() => { script.calls.push({ name: "prepare" }); return signedAt(7, 1).prepared; }),
    simulate: () => Effect.void,
    sign: () => Effect.succeed(signedAt(7, 1)),
    release: () => Effect.void,
    probe: () => Effect.sync(() => { script.calls.push({ name: "probe" }); return next(script.probe); }),
    resume: () => Effect.suspend(() => { script.calls.push({ name: "resume" }); const out = next(script.resume); return out instanceof ChainFault ? Effect.fail(out) : Effect.succeed(out); }),
    hold: (_from: string, nonce: number) => Effect.sync(() => { script.calls.push({ name: "hold", arg: nonce }); }),
    replace: (signed: Signed, _signer: unknown, policy: { strategy: string }) => Effect.sync(() => {
      script.calls.push({ name: "replace", arg: { replaces: signed.hash, strategy: policy.strategy } });
      return signedAt(signed.prepared.transaction.nonce, made++);
    }),
    submit: () => Effect.suspend(() => {
      script.atSubmit.push(store.find([...sent.keys()].at(-1) ?? ""));
      const out = next(script.submit);
      return out === "ok" ? Effect.succeed({ hash: hash(0), from: FROM, nonce: 7, fromBlock: 40n }) : Effect.fail(out);
    }),
  };
  const live = { key: { address: FROM, signer: {} }, port: port as unknown as ChainPort, sent } as unknown as Live;
  return { live, store, lock: Semaphore.makeUnsafe(1), arm: Effect.void };
};
const script = (over: Partial<Script> = {}): Script => ({ probe: [{ _tag: "Held" }], submit: ["ok"], resume: [], calls: [], atSubmit: [], ...over });
const inDo = (name: string, body: (store: Store) => Promise<void>) =>
  runInDurableObject(env.RELAYER.getByName(name) as DurableObjectStub<Relayer>, (_relayer, state) => body(makeStore(state.storage.sql)));
const run = <A>(effect: Effect.Effect<A, unknown>) => Effect.runPromise(effect);
const row = (id: string, nonce: number, n: number) => ({ id, nonce, state: "submitted" as const, hash: hash(n), serialized: signedAt(nonce, n).serialized, replaces: [], fromBlock: 10n, cap: 1_000n, fill: false, note: "" });

describe("a replacement that fails in transit", () => {
  it("is kept as the current transaction, so the next alarm replaces that one and the nonce does not wedge", () => inDo("eip155:11", async (store) => {
    store.add(row("a", 5, 1));
    const sent = new Map([["a", signedAt(5, 1)]]);
    const s = script({ probe: [{ _tag: "Dropped" }], submit: [new ChainFault({ kind: "transport", message: "reset" }), "ok"] });
    const parts = harness(store, s, sent);
    const first = await run(reconcile(parts));
    expect(first.replaced).toEqual([{ id: "a", nonce: 5, oldHash: hash(1), newHash: hash(100) }]);
    expect(store.find("a")).toMatchObject({ hash: hash(100), replaces: [hash(1)], state: "submitted" });
    expect(sent.get("a")?.hash).toBe(hash(100));
    await run(reconcile(parts));
    expect(s.calls.filter((c) => c.name === "replace").map((c) => c.arg)).toEqual([{ replaces: hash(1), strategy: "speedup" }, { replaces: hash(100), strategy: "speedup" }]);
    expect(store.find("a")).toMatchObject({ hash: hash(101), replaces: [hash(1), hash(100)] });
  }));

  it("that the node refuses for good leaves the old one current and says why on the row, and status shows it", () => inDo("eip155:12", async (store) => {
    store.add(row("b", 5, 1));
    const parts = harness(store, script({ probe: [{ _tag: "Dropped" }], submit: [new ChainFault({ kind: "funds", message: "the relayer cannot pay" })] }), new Map([["b", signedAt(5, 1)]]));
    expect((await run(reconcile(parts))).replaced).toEqual([]);
    expect(store.find("b")).toMatchObject({ hash: hash(1), replaces: [], note: "the relayer cannot pay" });
    expect(await run(status(parts, "b"))).toMatchObject({ id: "b", hash: hash(1), state: "dropped", problem: "the relayer cannot pay" });
  }));
});

describe("a submission the relayer has no live copy of", () => {
  it("is taken back from its stored bytes by status and by the alarm, and ends when it is mined", () => inDo("eip155:13", async (store) => {
    store.add(row("c", 5, 1));
    store.add(row("d", 6, 2));
    const s = script({ probe: [{ _tag: "Held" }, { _tag: "Held" }, { _tag: "Included", receipt: { transactionHash: hash(2) } }], resume: [signedAt(5, 1), signedAt(6, 2)] });
    const parts = harness(store, s);
    expect((await run(status(parts, "c"))).state).toBe("submitted");
    await run(reconcile(parts));
    expect(s.calls.filter((c) => c.name === "resume")).toHaveLength(2);
    expect(store.find("d")?.state).toBe("included");
    expect(parts.live.sent.size).toBe(2);
  }));

  it("whose bytes cannot be read is ended as dropped, and its nonce is held so no call is given it", () => inDo("eip155:14", async (store) => {
    store.add(row("e", 9, 3));
    const s = script({ resume: [new ChainFault({ kind: "signing", message: "not a transaction" })] });
    const parts = harness(store, s);
    expect(await run(status(parts, "e"))).toMatchObject({ state: "dropped", problem: "its signed bytes can no longer be read" });
    expect(s.calls).toContainEqual({ name: "hold", arg: 9 });
    expect(store.open()).toEqual([]);
  }));
});

describe("a call is written down before it is sent", () => {
  const call = { to: FROM, data: "0x" } as const;

  it("with its signed bytes, and a send that fails in transit is kept for the alarm and answered as sent", () => inDo("eip155:15", async (store) => {
    const s = script({ submit: [new ChainFault({ kind: "timeout", message: "slow" })] });
    const parts = harness(store, s);
    const answer = await run(relay(parts, call));
    expect(s.atSubmit[0]).toMatchObject({ state: "submitting", nonce: 7, hash: hash(1), serialized: signedAt(7, 1).serialized });
    expect(store.find(answer.id)).toMatchObject({ state: "submitting", fill: false });
    expect(store.open().map((r) => r.id)).toEqual([answer.id]);
  }));

  it("and a call refused for good answers its error, keeps its nonce, and the alarm fills it with a zero-value transfer to the relayer", () => inDo("eip155:16", async (store) => {
    const refused = new ChainFault({ kind: "funds", message: "no funds" });
    const s = script({ submit: [refused, "ok"], probe: [{ _tag: "Dropped" }], resume: [signedAt(7, 1)] });
    const parts = harness(store, s);
    await expect(run(relay(parts, call))).rejects.toMatchObject({ message: expect.stringContaining("no funds") });
    const [kept] = store.open();
    expect(kept).toMatchObject({ nonce: 7, fill: true });
    expect(s.calls).toContainEqual({ name: "resume" });
    const done = await run(reconcile(parts));
    expect(s.calls.filter((c) => c.name === "replace").map((c) => c.arg)).toEqual([{ replaces: hash(1), strategy: "cancel" }]);
    expect(done.replaced).toEqual([]);
    expect(store.find(kept!.id)).toMatchObject({ state: "submitted", hash: hash(100), fill: true });
  }));
});
