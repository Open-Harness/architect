// The done check of unit A1 (#1164): a generated adapter's typed calls, events and reverts, against its stand-in on Anvil. The
// adapter is generated from fixtures/Probe.json, written as a plugin and imported; its `deploy` puts the stand-in on a fresh Anvil,
// and every call goes through the generated `at`. Expected values are the fixture's (Probe.sol), never the adapter's.
// Gated as the other Anvil proofs: ORTHO_CHAIN_EVM_ANVIL=1 (CI's check-static sets it).
import { Clock, Duration, Effect, Option, Stream } from "effect";
import { Timers } from "@orthograph/language-effect";
import { Anvil } from "@orthograph/chain-evm";
import { Keys, makeChainPort, type Address, type ChainPort, type DecodedEvent, type EventSource, type Signer, type Submission } from "@orthograph/chain-evm/device";
import { afterAll, describe, expect, test } from "vitest";
import { probe, written, type Written } from "../../../test/from-abi.ts";

const anvil = test.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1");

const timers = Timers.of({
  at: () => Effect.die("Only Timers.sleep is used in the --from-abi Anvil proof"),
  // Anvil is its own OS process, so real time drives the Timers service.
  sleep: (_owner, span) => Effect.flatMap(Clock.Clock, (clock) => clock.sleep(Duration.fromInputUnsafe(span))),
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});

type Fx<A> = Effect.Effect<A, { readonly _tag: string }>;
/** The generated module as the checks use it: typed loosely here, since `types.test.ts` holds its types. */
interface ProbeModule {
  readonly at: (chain: { readonly port: ChainPort; readonly address: Address; readonly from?: Address }) => Record<string, (...args: ReadonlyArray<unknown>) => Fx<unknown>>;
  readonly events: Record<string, (address: Address, fromBlock: bigint) => EventSource<DecodedEvent>>;
  readonly deploy: (port: ChainPort, signer: Signer, args: { readonly start: bigint }) => Fx<Address>;
  readonly TooBig: new (fields: { x: bigint; limit: bigint }) => { readonly _tag: "TooBig" };
  readonly Empty: new () => { readonly _tag: "Empty" };
}

// Generated and loaded once, by the first test that runs, so each test fails on its own when the generator can't make it.
let w: Written | undefined;
let Probe: ProbeModule;
const loaded = Effect.promise(async () => {
  if (w === undefined) {
    w = await written([probe]);
    Probe = await w.load<ProbeModule>("src/generated/Probe.ts");
  }
});
afterAll(() => w?.remove());

interface World { readonly port: ChainPort; readonly signer: Signer; readonly other: Signer }
/** A fresh Anvil, a port on it, and two funded keys the world made. */
const onAnvil = <A>(body: (world: World) => Effect.Effect<A, unknown>) =>
  Effect.runPromise(Effect.gen(function* () {
    yield* loaded;
    const chain = yield* Anvil.start({ chainId: 31_164, accounts: 2 });
    const [one, two] = chain.accounts;
    if (one === undefined || two === undefined) return yield* Effect.die("Anvil made no accounts");
    const port = yield* makeChainPort({ chainId: chain.chainId, rpcUrl: chain.rpcUrl, pollIntervalMs: 25, receiptTimeoutMs: 5_000 });
    const signer = (yield* Keys.fromSecret(one.privateKey)).signer;
    const other = (yield* Keys.fromSecret(two.privateKey)).signer;
    return yield* body({ port, signer, other });
  }).pipe(Effect.scoped, Effect.provideService(Timers, timers)));

/** Waits until a submission is in a block, and answers the receipt's status. */
const included = (port: ChainPort, submission: Submission) =>
  port.track(submission, { depth: 1 }).pipe(Stream.runHead, Effect.flatMap((state) =>
    Option.isSome(state) && state.value._tag === "Included" ? Effect.succeed(state.value.receipt) : Effect.die(`not included: ${JSON.stringify(Option.getOrUndefined(state)?._tag)}`)));

/** The events of a source confirmed so far (at depth 1, each is seen once as Observed and once as Confirmed), decoded: their names and arguments. */
const seen = (port: ChainPort, source: EventSource<DecodedEvent>) =>
  port.follow(source, { depth: 1 }).poll().pipe(Effect.map((poll) => poll.changes.filter((c) => c._tag === "Confirmed")
    .map((c) => ({ eventName: c.event.eventName, args: c.event.args, address: c.event.address.toLowerCase() }))));

const lower = (a: string) => a.toLowerCase();
/** An error's own fields: what it holds beside its tag and what every Error has. */
const fieldsOf = (e: object) => Object.keys(e).filter((k) => !["_tag", "stack", "message", "name", "cause"].includes(k)).sort();

describe("a generated adapter against its stand-in on Anvil", () => {
  anvil("deploy puts the stand-in on the chain with its constructor's arguments, and a read answers typed", { timeout: 60_000 }, () =>
    onAnvil(({ port, signer, other }) => Effect.gen(function* () {
      const address = yield* Probe.deploy(port, signer, { start: 7n });
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      const c = Probe.at({ port, address });
      expect(yield* c["peek"]!()).toBe(7n);
      expect(yield* c["LIMIT"]!()).toBe(100n);
      expect(lower(String(yield* c["owner"]!()))).toBe(lower(signer.address));
      // Several outputs are an object of their names; a negative int8 is a negative bigint.
      expect(yield* c["pair"]!({ a: 3n, b: -4n })).toEqual({ sum: 7n, odd: true });
      expect(yield* c["pair"]!({ a: 4n, b: 2n })).toEqual({ sum: 6n, odd: false });
      // A tuple in and out, nested, with an array beside it.
      const box = { width: 2n, holder: other.address, inner: { sealed_: true, tag: `0x${"ab".repeat(32)}` } };
      const boxed = (yield* c["boxed"]!({ b: box, extra: [3n, 4n] })) as { out: typeof box; total: bigint };
      expect(boxed.total).toBe(9n);
      expect({ ...boxed.out, holder: lower(boxed.out.holder) }).toEqual({ ...box, holder: lower(other.address) });
      expect(yield* c["label"]!({ data: "0x0102", name: "x" })).toMatch(/^0x[0-9a-f]{64}$/);
      // Two different deployments are two contracts: the second's read is its own.
      const second = yield* Probe.deploy(port, other, { start: 9n });
      expect(lower(second)).not.toBe(lower(address));
      expect(yield* Probe.at({ port, address: second })["peek"]!()).toBe(9n);
      expect(yield* c["peek"]!()).toBe(7n);
    })));

  anvil("a write prepares, simulates, signs and submits, answering the Submission; its event decodes typed", { timeout: 60_000 }, () =>
    onAnvil(({ port, signer }) => Effect.gen(function* () {
      const address = yield* Probe.deploy(port, signer, { start: 7n });
      const c = Probe.at({ port, address });
      const sent = (yield* c["poke"]!({ x: 5n }, signer)) as Submission;
      expect(lower(sent.from)).toBe(lower(signer.address));
      expect(lower(String(sent.to))).toBe(lower(address));
      expect((yield* included(port, sent)).status).toBe("success");
      expect(yield* c["peek"]!()).toBe(5n);
      const poked = yield* seen(port, Probe.events["Poked"]!(address, sent.fromBlock));
      expect(poked).toEqual([{ eventName: "Poked", args: { who: signer.address, x: 5n, note: "poked" }, address: lower(address) }]);
      // The source is of that event only: Funded's source sees nothing of a poke.
      expect(yield* seen(port, Probe.events["Funded"]!(address, sent.fromBlock))).toEqual([]);
    })));

  anvil("a revert with one of the contract's errors fails as its class with its fields, and nothing is sent", { timeout: 60_000 }, () =>
    onAnvil(({ port, signer }) => Effect.gen(function* () {
      const address = yield* Probe.deploy(port, signer, { start: 7n });
      const c = Probe.at({ port, address });
      const first = (yield* c["poke"]!({ x: 1n }, signer)) as Submission;
      yield* included(port, first);
      const refused = yield* Effect.flip(c["poke"]!({ x: 101n }, signer));
      expect(refused).toBeInstanceOf(Probe.TooBig);
      const big = refused as unknown as { readonly _tag: string; readonly x: bigint; readonly limit: bigint };
      expect({ _tag: big._tag, x: big.x, limit: big.limit }).toEqual({ _tag: "TooBig", x: 101n, limit: 100n });
      expect(fieldsOf(refused)).toEqual(["limit", "x"]);
      // Nothing was sent and no nonce kept: the next write takes the very next nonce, and the state is the first poke's.
      const next = (yield* c["poke"]!({ x: 2n }, signer)) as Submission;
      expect(next.nonce).toBe(first.nonce + 1);
      yield* included(port, next);
      expect(yield* c["peek"]!()).toBe(2n);
      const xs = (yield* seen(port, Probe.events["Poked"]!(address, first.fromBlock))).map((e) => (e.args as { x: bigint }).x);
      expect(xs).toEqual([1n, 2n]);
      // An error with no inputs is its class, holding nothing else.
      const zero = Probe.at({ port, address: yield* Probe.deploy(port, signer, { start: 0n }) });
      const empty = yield* Effect.flip(zero["drain"]!(signer));
      expect(empty).toBeInstanceOf(Probe.Empty);
      expect(empty._tag).toBe("Empty");
      expect(fieldsOf(empty)).toEqual([]);
    })));

  anvil("a revert that is not one of the contract's errors stays the chain's own error", { timeout: 60_000 }, () =>
    onAnvil(({ port, signer }) => Effect.gen(function* () {
      const c = Probe.at({ port, address: yield* Probe.deploy(port, signer, { start: 7n }) });
      const refused = yield* Effect.flip(c["refuse"]!());
      expect(["ChainFault", "ChainRefusal"]).toContain(refused._tag);
      expect(refused).not.toBeInstanceOf(Probe.TooBig);
      expect(refused).not.toBeInstanceOf(Probe.Empty);
    })));

  anvil("a payable write sends its value, an overload each its own function, and a write is its signer's", { timeout: 60_000 }, () =>
    onAnvil(({ port, signer, other }) => Effect.gen(function* () {
      const address = yield* Probe.deploy(port, signer, { start: 7n });
      const c = Probe.at({ port, address });
      const funded = (yield* c["fund"]!(signer, { value: 1_000n })) as Submission;
      yield* included(port, funded);
      expect(yield* c["funded"]!()).toBe(1_000n);
      expect(yield* seen(port, Probe.events["Funded"]!(address, funded.fromBlock))).toEqual([
        { eventName: "Funded", args: { from: signer.address, amount: 1_000n }, address: lower(address) },
      ]);
      const unpaid = (yield* c["fund"]!(signer)) as Submission;
      yield* included(port, unpaid);
      expect(yield* c["funded"]!()).toBe(1_000n);
      const one = (yield* c["send_1"]!({ to: other.address }, signer)) as Submission;
      const two = (yield* c["send_2"]!({ to: other.address, value: 9n }, signer)) as Submission;
      yield* included(port, one);
      yield* included(port, two);
      const sentEvents = yield* seen(port, Probe.events["Sent"]!(address, one.fromBlock));
      expect(sentEvents.map((e) => e.args)).toEqual([{ to: other.address, value: 0n }, { to: other.address, value: 9n }]);
      // A write sent by another key is that key's.
      const theirs = (yield* c["poke"]!({ x: 3n }, other)) as Submission;
      expect(lower(theirs.from)).toBe(lower(other.address));
      yield* included(port, theirs);
      const who = (yield* seen(port, Probe.events["Poked"]!(address, theirs.fromBlock))).map((e) => lower((e.args as { who: string }).who));
      expect(who).toEqual([lower(other.address)]);
    })));
});
