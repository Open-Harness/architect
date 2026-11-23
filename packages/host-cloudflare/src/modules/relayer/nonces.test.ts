// The relayer's nonce ownership (review-loop reset on #677), against a scripted port in workerd: every nonce belongs to one stored row from
// the moment it is taken, and only that row's reservation is filled or replaced. The chain itself is checked on Anvil by
// e2e/on-chain/10-m6-07-relayer.test.ts and by chain-evm's tx/resume.test.ts.
import { env, runInDurableObject } from "cloudflare:test";
import { ChainFault, type ChainPort, type NonceReservation, type Signed } from "@orthograph/chain-evm/device";
import { Effect, Semaphore } from "effect";
import { describe, expect, it } from "vitest";
import { register } from "./internal/adopt.ts";
import { reconcile, status } from "./internal/check.ts";
import type { Held, Live, Parts } from "./internal/live.ts";
import { relay } from "./internal/relay.ts";
import { makeStore, type Store } from "./internal/store.ts";
import type { Relayer } from "./service.ts";

const FROM = "0x00000000000000000000000000000000000000aa" as const;
const hash = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;
const signedAt = (nonce: number, n: number): Signed => ({
  prepared: { from: FROM, transaction: { type: "eip1559", chainId: 1, nonce, gas: 21_000n, maxFeePerGas: 10n, maxPriorityFeePerGas: 1n, to: FROM, data: "0x" } },
  serialized: `0x02${n.toString(16).padStart(2, "0")}`, hash: hash(n),
});
const reservation = (nonce: number): NonceReservation => ({ address: FROM, nonce });

interface Script {
  probe: Array<{ _tag: string; [key: string]: unknown }>;
  submit: Array<ChainFault | "ok">;
  /** What each `simulate` answers, in order. */
  simulate: Array<ChainFault | "ok">;
  /** What `resume` answers, in order. */
  resume: Array<Signed | ChainFault>;
  /** What each `fill` answers, in order. */
  fill: Array<ChainFault | "ok">;
  /** Every call the port was given, by name: what the relayer asked for. */
  calls: Array<{ name: string; arg?: unknown }>;
  /** What the store held for each row when the port was asked to `simulate` and to `submit`. */
  atSimulate: Array<ReturnType<Store["open"]>>;
  atSubmit: Array<ReturnType<Store["open"]>>;
}

const harness = (store: Store, script: Script, held: Map<string, Held> = new Map()): Parts => {
  const next = <A>(list: A[]) => list.length > 1 ? list.shift()! : list[0]!;
  let made = 100;
  let nonce = 7;
  const port = {
    read: () => Effect.void,
    prepare: () => Effect.sync(() => { script.calls.push({ name: "prepare" }); const at = nonce++; return signedAt(at, 30 + at).prepared; }),
    reservationOf: (tx: Signed["prepared"]) => reservation(tx.transaction.nonce),
    simulate: () => Effect.suspend(() => { script.atSimulate.push(store.open()); const out = next(script.simulate); return out === "ok" ? Effect.void : Effect.fail(out); }),
    sign: (prepared: Signed["prepared"]) => Effect.succeed(signedAt(prepared.transaction.nonce, 30 + prepared.transaction.nonce)),
    probe: () => Effect.sync(() => { script.calls.push({ name: "probe" }); return next(script.probe); }),
    resume: () => Effect.suspend(() => { script.calls.push({ name: "resume" }); const out = next(script.resume); return out instanceof ChainFault ? Effect.fail(out) : Effect.succeed(out); }),
    hold: (_from: string, at: number) => Effect.sync(() => { script.calls.push({ name: "hold", arg: at }); return reservation(at); }),
    fill: (owned: NonceReservation) => Effect.suspend(() => {
      script.calls.push({ name: "fill", arg: owned.nonce });
      const out = next(script.fill);
      return out === "ok" ? Effect.succeed(signedAt(owned.nonce, 60 + owned.nonce)) : Effect.fail(out);
    }),
    replace: (signed: Signed, _signer: unknown, policy: { strategy: string }) => Effect.sync(() => {
      script.calls.push({ name: "replace", arg: { replaces: signed.hash, strategy: policy.strategy } });
      return signedAt(signed.prepared.transaction.nonce, made++);
    }),
    submit: () => Effect.suspend(() => {
      script.atSubmit.push(store.open());
      const out = next(script.submit);
      return out === "ok" ? Effect.succeed({ hash: hash(0), from: FROM, nonce: 7, fromBlock: 40n }) : Effect.fail(out);
    }),
  };
  const live = { key: { address: FROM, signer: {} }, port: port as unknown as ChainPort, held, inflight: new Set<string>() } as unknown as Live;
  return { live, store, lock: Semaphore.makeUnsafe(1), arm: Effect.void };
};
const script = (over: Partial<Script> = {}): Script => ({
  probe: [{ _tag: "Held" }], submit: ["ok"], simulate: ["ok"], resume: [], fill: ["ok"], calls: [], atSimulate: [], atSubmit: [], ...over,
});
const inDo = (name: string, body: (store: Store) => Promise<void>) =>
  runInDurableObject(env.RELAYER.getByName(name) as DurableObjectStub<Relayer>, (_relayer, state) => body(makeStore(state.storage.sql)));
const run = <A>(effect: Effect.Effect<A, unknown>) => Effect.runPromise(effect);
const row = (id: string, nonce: number, n: number) => ({ id, nonce, state: "submitted" as const, hash: hash(n), serialized: signedAt(nonce, n).serialized, replaces: [], fromBlock: 10n, cap: 1_000n, fill: false, note: "" });
const holding = (...rows: Array<[string, number, number]>) => new Map<string, Held>(rows.map(([id, nonce, n]) => [id, { reservation: reservation(nonce), signed: signedAt(nonce, n) }]));
const call = { to: FROM, data: "0x" } as const;

describe("a replacement that fails in transit", () => {
  it("is kept as the current transaction, so the next alarm replaces that one and the nonce does not wedge", () => inDo("eip155:11", async (store) => {
    store.add(row("a", 5, 1));
    const held = holding(["a", 5, 1]);
    const s = script({ probe: [{ _tag: "Dropped" }], submit: [new ChainFault({ kind: "transport", message: "reset" }), "ok"] });
    const parts = harness(store, s, held);
    expect((await run(reconcile(parts))).replaced).toEqual([{ id: "a", nonce: 5, oldHash: hash(1), newHash: hash(100) }]);
    expect(store.find("a")).toMatchObject({ hash: hash(100), replaces: [hash(1)], state: "submitted" });
    expect(held.get("a")?.signed?.hash).toBe(hash(100));
    await run(reconcile(parts));
    expect(s.calls.filter((c) => c.name === "replace").map((c) => c.arg)).toEqual([{ replaces: hash(1), strategy: "speedup" }, { replaces: hash(100), strategy: "speedup" }]);
    expect(store.find("a")).toMatchObject({ hash: hash(101), replaces: [hash(1), hash(100)] });
  }));

  it("that the node refuses for good leaves the old one current and says why on the row, and status shows it", () => inDo("eip155:12", async (store) => {
    store.add(row("b", 5, 1));
    const parts = harness(store, script({ probe: [{ _tag: "Dropped" }], submit: [new ChainFault({ kind: "funds", message: "the relayer cannot pay" })] }), holding(["b", 5, 1]));
    expect((await run(reconcile(parts))).replaced).toEqual([]);
    expect(store.find("b")).toMatchObject({ hash: hash(1), replaces: [], note: "the relayer cannot pay" });
    expect(await run(status(parts, "b"))).toMatchObject({ id: "b", hash: hash(1), state: "dropped", problem: "the relayer cannot pay" });
  }));
});

describe("after a restart every open row takes back its own reservation before a call is served", () => {
  it("resumes a row with bytes, holds a fill that is waiting, and turns bytes that cannot be read into a fill", () => inDo("eip155:13", async (store) => {
    store.add(row("c", 5, 1));
    store.add({ ...row("d", 6, 2), serialized: "0x", fill: true, state: "submitting" });
    store.add(row("e", 9, 3));
    const s = script({ resume: [signedAt(5, 1), new ChainFault({ kind: "signing", message: "not a transaction" })] });
    const parts = harness(store, s);
    await run(register(parts.live, store));
    expect([...parts.live.held.keys()].sort()).toEqual(["c", "d", "e"]);
    expect(s.calls).toEqual([{ name: "resume" }, { name: "hold", arg: 6 }, { name: "resume" }, { name: "hold", arg: 9 }]);
    expect(store.find("e")).toMatchObject({ fill: true, serialized: "0x", note: "its signed bytes can no longer be read" });
  }));

  it("and a nonce that something else already holds is a defect, not carried past", () => inDo("eip155:18", async (store) => {
    store.add(row("f", 5, 1));
    const parts = harness(store, script({ resume: [new ChainFault({ kind: "nonce", message: "already reserved" })] }));
    await expect(run(register(parts.live, store))).rejects.toThrow();
  }));
});

describe("a call's nonce belongs to its row from the moment it is taken", () => {
  it("the row is written before simulate and again with its bytes before the send, and a send that fails in transit is kept for the alarm", () => inDo("eip155:15", async (store) => {
    const s = script({ submit: [new ChainFault({ kind: "timeout", message: "slow" })] });
    const answer = await run(relay(harness(store, s), call));
    expect(s.atSimulate[0]).toMatchObject([{ nonce: 7, state: "submitting", serialized: "0x" }]);
    expect(s.atSubmit[0]).toMatchObject([{ nonce: 7, state: "submitting", hash: hash(37), serialized: signedAt(7, 37).serialized }]);
    expect(store.find(answer.id)).toMatchObject({ state: "submitting", fill: false });
  }));

  it("a refused fill keeps its reservation, funding lets the next alarm land it, and a new call is given the next nonce", () => inDo("eip155:16", async (store) => {
    const s = script({ submit: [new ChainFault({ kind: "funds", message: "no funds" })], probe: [{ _tag: "Dropped" }], fill: [new ChainFault({ kind: "funds", message: "no funds" }), "ok"] });
    const parts = harness(store, s);
    await expect(run(relay(parts, call))).rejects.toMatchObject({ message: expect.stringContaining("no funds") });
    const [kept] = store.open();
    expect(kept).toMatchObject({ nonce: 7, fill: true, serialized: "0x", note: "no funds" });
    expect(parts.live.held.get(kept!.id)?.reservation).toEqual(reservation(7));
    await run(reconcile(parts));
    expect(store.find(kept!.id)).toMatchObject({ serialized: "0x", note: "no funds" });
    expect(parts.live.held.has(kept!.id)).toBe(true);
    s.submit.splice(0, s.submit.length, "ok");
    const second = await run(relay(parts, call));
    expect(second.nonce, "the new call does not take the filled nonce").toBe(8);
    s.probe.splice(0, s.probe.length, { _tag: "Dropped" }, { _tag: "Held" });
    expect((await run(reconcile(parts))).replaced).toEqual([]);
    expect(s.calls.filter((c) => c.name === "fill")).toEqual([{ name: "fill", arg: 7 }, { name: "fill", arg: 7 }]);
    expect(store.find(kept!.id)).toMatchObject({ state: "submitted", hash: hash(67), fill: true, note: "" });
  }));

  it("and the alarm leaves a row alone while its own call is still working on it", () => inDo("eip155:19", async (store) => {
    store.add({ ...row("g", 7, 0), serialized: "0x", state: "submitting" });
    const s = script({ probe: [{ _tag: "Dropped" }] });
    const parts = harness(store, s, new Map([["g", { reservation: reservation(7) }]]));
    parts.live.inflight.add("g");
    await run(reconcile(parts));
    expect(s.calls).toEqual([]);
    parts.live.inflight.delete("g");
    await run(reconcile(parts));
    expect(s.calls.map((c) => c.name)).toEqual(["probe", "fill"]);
  }));

  it("of three concurrent calls whose middle one fails simulation, the middle nonce is filled and the third is not left behind it", () => inDo("eip155:17", async (store) => {
    const s = script({ simulate: ["ok", new ChainFault({ kind: "revert", message: "reverted" }), "ok"] });
    const parts = harness(store, s);
    const [a, b, c] = await Effect.runPromise(Effect.all([relay(parts, call), relay(parts, call), relay(parts, call)].map(Effect.result), { concurrency: "unbounded" }));
    expect([a?._tag, b?._tag, c?._tag]).toEqual(["Success", "Failure", "Success"]);
    expect(store.open().map((r) => [r.nonce, r.fill, r.serialized === "0x"])).toEqual([[7, false, false], [8, true, true], [9, false, false]]);
    s.probe.splice(0, s.probe.length, { _tag: "Held" });
    s.probe.unshift({ _tag: "Held" }, { _tag: "Dropped" });
    await run(reconcile(parts));
    expect(s.calls.filter((c) => c.name === "fill")).toEqual([{ name: "fill", arg: 8 }]);
    expect(store.open().map((r) => [r.nonce, r.state])).toEqual([[7, "submitted"], [8, "submitted"], [9, "submitted"]]);
  }));
});
