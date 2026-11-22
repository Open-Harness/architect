// Goal 4, slice 10 (M6.09), the follower actor: "an `anvil_reorg` that replays a different digest emits a correction and then the new event; a restart doesn't double count"
// (`design/milestones.md` M6.09; K7 Q6; build-plan L3.08: "the follower's view equals the chain's view. Restarting from the checkpoint does no double counting").
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// THE SEAM THIS CHECK PICKS (M6-chain and K27 give the follower no public shape: "A Durable Object around chain-evm's reliable event stream (backfill, cursor, decoder), storing
// its checkpoint", and `design/frame/examples/allowance-on-chain.md`: "chain follower | one per contract | follows the budgets module's logs with a checkpoint, handles reorgs, emits
// corrections", both Durable Objects inside the environment's one Worker). The smallest shape that fits:
//   - `Follower`, a Durable Object class exported from the front door of `@orthograph/host-cloudflare` (`src/index.ts`, beside `Actor` and `World`), written as Effect over
//     `@orthograph/chain-evm/device` (`makeChainPort(...).follow(source, { depth })`, `makeEventSource`). One instance per program (K7 Q6: "One follower per program"), named
//     `eip155:<chainId>:<the contract's address, lower case>` (the chain as CAIP-2, M6-chain item 2).
//   - Its methods, over Durable Object RPC. Every value is JSON; a `uint` is a decimal string (M6-chain item 2).
//       configure({ rpcUrl, chainId, contract, address, event, fromBlock, depth, pollIntervalMs? }): void
//           `contract` is the contract's name, the first half of the event names it hands on ("Echo"); `address` is lower case; `event` is the ABI item of the event
//           (what `makeEventSource` takes, as JSON); `fromBlock` is the first block to read (a decimal string); `depth` is `{ depth }`, the confirmation level of chain-evm.
//           Idempotent: the same arguments again change nothing and never rewind the checkpoint.
//       poll(): { caughtUp }       one step of the reliable stream (it reads at most a window of blocks, so call it again until `caughtUp`). It hands each `Confirmed` and each
//                                  `Corrected` change to the sink, in the order chain-evm gives them, and keeps its checkpoint. `Observed` is not handed on.
//       checkpoint(): { through?, window }     what it has stored: `through` the last block read ({ number, hash }), and the window of block hashes, oldest first. Numbers are decimal strings.
//       (In production an alarm calls `poll`. Here it is a call, so the check needs no clock.)
//   - The sink is the port `FollowerSink`, which Ask #481 says becomes `Inbox.accept` when Goal 11's `Inbox` is on `goal/stage-1` (it is not yet). Its shape is `Inbox.accept`'s:
//       accept({ source: "chain", id, event, fields }): "accepted" | "seen"
//     The Worker binds it as the Durable Object namespace `FOLLOWER_SINK`; the follower calls `env.FOLLOWER_SINK.getByName(<its own name>).accept(entry)`. The check's Worker holds
//     the sink (`actor-fixture.ts`: it answers "seen" for an id it has had), so what the check reads is what reached the sink and what it said. Wiring the port to `Inbox.accept` later
//     changes the binding, not the follower.
//   - What reaches the sink (Ask #481, `design/decisions/M5-reach-out.md` Q2.4):
//       a confirmed event:  id `${chainId}:${blockHash}:${logIndex}`,            event `<Contract>.<Event>`,           fields: the event's arguments (uint as a decimal string)
//       a correction:       id `${chainId}:${blockHash}:${logIndex}:corrected`,  event `<Contract>.<Event>Corrected`,  fields: the same arguments, and `wasConfirmed`
//     where `blockHash` and `logIndex` are the log's, and a correction's are those of the event being taken back (the block that is no longer on the chain).
//
// WHAT IT REQUIRES, on a real Anvil, with the Durable Object in workerd under `wrangler dev`, against `Echo` (a small contract of the check's own, `actor-fixture.ts`):
//   1. An event is not handed on while it is `depth` blocks short; once confirmed it is handed on once, with that id, event name and fields, and the sink says "accepted".
//      The checkpoint is the chain's view: `through` is the head, the window ends at it, and every hash in it is the chain's block hash.
//   2. `anvil_reorg` (depth 2) replays `echo(1, digestB)` where `echo(1, digestA)` was confirmed. The sink then gets, in this order: the correction of the first (its old block
//      hash, `wasConfirmed: true`, digestA), then the new event (the new block hash, digestB). The checkpoint is the chain's again, now with the new hashes. A second reorg
//      (digestC) gives the correction of the second and then the third. The sink takes longer over a correction, so a follower that hands two changes on at once is seen to.
//   3. A follower started late reads a long history (more than two windows of blocks) and hands every confirmed event on once, in the chain's order, among them two in one block (log
//      indexes 0 and 1) from two senders, one with a uint beyond 2^53 (its decimal string).
//   4. A restart (wrangler stopped and started again over the same storage) does not double count: the checkpoint is what was stored; with the chain unmoved, whatever is handed
//      on again is `seen` (M6-chain item 12: a replay is harmless); after a new event, exactly that one is newly accepted, and across the whole run no id was "accepted" twice.
//      Twice over: a second restart does the same.
//   5. A sink that answers an error once (the check's sink has `failNext`): the follower keeps its checkpoint where it was, so the next poll hands the same change on again and the
//      sink takes it. The checkpoint moves only after the sink has taken the change (item 12). A poll that meets the error may reject or return; the check allows either.
//   6. An event taken back before it was confirmed (`anvil_reorg` of one block, inside the depth-2 window) is not handed on: no correction, because the sink never saw it (item 12:
//      "the follower drops it"). Anvil can make this one, so it is checked.
//      (`configure` again, with the same arguments, is allowed to follow a restart, and never rewinds the checkpoint.)
//
// THE CONTROLS (true today, with no follower): the checkpoint judge against planted wrong checkpoints (no `through`, `through` short of the head, a stale hash, a window that does not end
// at `through`, an empty window, numbers out of order, a window longer than the chain), and the entry normaliser against a different case of address and a different id.
import { afterAll, describe, expect, it } from "vitest";
import {
  ECHOED_ABI, accounts, blockAt, deployEcho, digestOf, echoCall, head, mine, rpc, send, startAnvil, startWorker, type Anvil, type Hex, type Worker,
} from "./actor-fixture.ts";

interface Block { number: string; hash: Hex }
interface Checkpoint { through?: Block; window: Block[] }
interface Entry { source: string; id: string; event: string; fields: Record<string, unknown> }
interface Call { entry: Entry; result: string }

/** The calls a sink has had, whole (every key of every entry), with the address in each entry's fields in lower case, so what is compared is what was said, not how an address was spelled. */
const normalise = (calls: ReadonlyArray<Call>) => calls.map(({ entry, result }) => ({
  ...entry, result,
  fields: Object.fromEntries(Object.entries(entry.fields).map(([k, v]) => [k, typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v) ? v.toLowerCase() : v])),
}));

/** What is wrong with a stored checkpoint, judged against the chain: its head, and its hash at each number. Empty when it is the chain's own view. */
const checkpointProblems = (cp: Checkpoint, chain: { head: Block; hashes: Readonly<Record<string, Hex>> }): string[] => {
  const problems: string[] = [];
  if (cp.through === undefined) return ["the checkpoint has no `through`"];
  if (cp.through.number !== chain.head.number || cp.through.hash !== chain.head.hash) problems.push(`through is ${cp.through.number} ${cp.through.hash}, the chain's head is ${chain.head.number} ${chain.head.hash}`);
  if (cp.window.length === 0) problems.push("the window is empty");
  else if (cp.window.at(-1)!.number !== cp.through.number || cp.window.at(-1)!.hash !== cp.through.hash) problems.push("the window does not end at `through`");
  for (const b of [cp.through, ...cp.window]) if (typeof b.number !== "string" || !/^\d+$/.test(b.number)) problems.push(`block number ${String(b.number)} is not a decimal string`);
  cp.window.forEach((b, i) => {
    if (i > 0 && BigInt(b.number) <= BigInt(cp.window[i - 1]!.number)) problems.push(`window entry ${i} (${b.number}) is not after the one before it`);
    const real = chain.hashes[b.number];
    if (real === undefined) problems.push(`the window holds block ${b.number}, which the chain does not have`);
    else if (real !== b.hash) problems.push(`the window's hash for block ${b.number} is ${b.hash}, the chain's is ${real}`);
  });
  return problems;
};

/** What is wrong with the calls a sink has had: an id accepted twice, or "seen" for an id it never accepted. A replay after a restart may be "seen" again and again (M6-chain item 12); it may never be "accepted" twice. */
const sinkProblems = (calls: ReadonlyArray<{ id: string; result: string }>): string[] => {
  const accepted = new Set<string>();
  const problems: string[] = [];
  for (const c of calls) {
    if (c.result === "accepted") { if (accepted.has(c.id)) problems.push(`${c.id} was accepted twice`); accepted.add(c.id); }
    else if (c.result === "seen") { if (!accepted.has(c.id)) problems.push(`${c.id} was "seen" before it was accepted`); }
    else problems.push(`${c.id} got the answer ${JSON.stringify(c.result)}`);
  }
  return problems;
};
const acceptedOf = <C extends { result: string }>(calls: ReadonlyArray<C>) => calls.filter((c) => c.result === "accepted");

const dev = async (url: string) => (await accounts(url))[0]!;
let started: Promise<{ anvil: Anvil; worker: Worker; sender: Hex }> | undefined;
const world = () => started ??= (async () => {
  const anvil = await startAnvil();
  const worker = await startWorker({ classes: ["Follower"] });
  return { anvil, worker, sender: await dev(anvil.rpcUrl) };
})();
afterAll(async () => { if (started) { const w = await started.catch(() => undefined); await w?.worker.stop(); await w?.anvil.stop(); } });

type W = { anvil: Anvil; worker: Worker; sender: Hex };
const hashes = async (url: string, upto: bigint) => {
  const out: Record<string, Hex> = {};
  for (let n = 0n; n <= upto; n++) out[String(n)] = (await blockAt(url, n)).hash;
  return out;
};
/** A new Echo and a follower for it, configured to read from the block it was made in. */
const fresh = async (w: W, depth = 2) => {
  const echo = await deployEcho(w.anvil.rpcUrl);
  const name = `eip155:${w.anvil.chainId}:${echo.address}`;
  const config = { rpcUrl: w.anvil.rpcUrl, chainId: w.anvil.chainId, contract: "Echo", address: echo.address, event: ECHOED_ABI, fromBlock: String(echo.block), depth };
  await w.worker.call("FOLLOWER", name, "configure", config);
  return { echo, name, config };
};
const pollUp = async (w: W, name: string) => {
  for (let i = 0; i < 100; i++) if (((await w.worker.call("FOLLOWER", name, "poll")) as { caughtUp: boolean }).caughtUp) return;
  throw new Error("the follower did not catch up to the head in 100 polls");
};
const received = async (w: W, name: string) => normalise((await w.worker.call("FOLLOWER_SINK", name, "received")) as Call[]);
const checkpointOf = (w: W, name: string) => w.worker.call("FOLLOWER", name, "checkpoint") as Promise<Checkpoint>;
const chainView = async (w: W) => {
  const h = await head(w.anvil.rpcUrl);
  return { head: { number: String(h), hash: (await blockAt(w.anvil.rpcUrl, h)).hash }, hashes: await hashes(w.anvil.rpcUrl, h) };
};
const confirmed = (chainId: number, blockHash: Hex, logIndex: number, id: bigint, by: Hex, digest: Hex) => ({
  result: "accepted", source: "chain", id: `${chainId}:${blockHash}:${logIndex}`, event: "Echo.Echoed", fields: { id: String(id), by: by.toLowerCase(), digest },
});

describe("the follower actor: a Durable Object that follows one contract's events and hands each change to its sink", () => {
  it("hands an event on once it is confirmed and not before, with its id, event name and fields; its checkpoint is the chain's own view", async () => {
    const w = await world();
    const { echo, name, config } = await fresh(w);
    const digest = digestOf("A");
    const tx = await send(w.anvil.rpcUrl, w.sender, echo.address, echoCall(1n, digest));
    await pollUp(w, name);
    expect(await received(w, name), "depth 2 and the event's block is the head: it is observed, not confirmed, so nothing is handed on").toEqual([]);
    await mine(w.anvil.rpcUrl, 1);
    await pollUp(w, name);
    expect(await received(w, name), "once a block lies on it, the event is handed on, once").toEqual([confirmed(w.anvil.chainId, tx.blockHash, tx.logs[0]!.logIndex, 1n, w.sender, digest)]);
    expect(checkpointProblems(await checkpointOf(w, name), await chainView(w)), "the stored checkpoint against the chain").toEqual([]);
    const stored = await checkpointOf(w, name);
    await w.worker.call("FOLLOWER", name, "configure", config);
    expect(await checkpointOf(w, name), "configure again does not rewind the checkpoint").toEqual(stored);
    await pollUp(w, name);
    const again = await received(w, name);
    expect([sinkProblems(again), acceptedOf(again).length], "and nothing new is accepted").toEqual([[], 1]);
  });

  it("a take-back is handed on as a correction, then the replaying event; the checkpoint follows the chain onto its new blocks", async () => {
    const w = await world();
    const url = w.anvil.rpcUrl;
    const { echo, name } = await fresh(w);
    const [digestA, digestB] = [digestOf("A"), digestOf("B")];
    const first = await send(url, w.sender, echo.address, echoCall(1n, digestA));
    await mine(url, 1);
    await pollUp(w, name);
    expect((await received(w, name)).map((c) => c.id), "the first event is confirmed and handed on").toEqual([`${w.anvil.chainId}:${first.blockHash}:0`]);

    // A reorg of the two blocks that hold it (its own and the one on it), replaying the same id with another digest into the first new block.
    const replay = { from: w.sender, to: echo.address, gas: "0x100000", data: echoCall(1n, digestB) };
    await rpc(url, "anvil_reorg", [2, [[replay, 0]]]);
    const now = await blockAt(url, first.block);
    expect(now.hash, "the reorg gave the block's number a new hash").not.toBe(first.blockHash);
    await pollUp(w, name);

    expect(await received(w, name), "the correction of the first event, then the new event").toEqual([
      confirmed(w.anvil.chainId, first.blockHash, 0, 1n, w.sender, digestA),
      { result: "accepted", source: "chain", id: `${w.anvil.chainId}:${first.blockHash}:0:corrected`, event: "Echo.EchoedCorrected", fields: { id: "1", by: w.sender.toLowerCase(), digest: digestA, wasConfirmed: true } },
      confirmed(w.anvil.chainId, now.hash, 0, 1n, w.sender, digestB),
    ]);
    expect(checkpointProblems(await checkpointOf(w, name), await chainView(w)), "the stored checkpoint against the chain after the reorg").toEqual([]);

    // And again: the second take-back is handed on too, after the first, and the checkpoint follows the chain once more.
    const digestC = digestOf("C");
    await rpc(url, "anvil_reorg", [2, [[{ ...replay, data: echoCall(1n, digestC) }, 0]]]);
    const latest = await blockAt(url, first.block);
    expect(latest.hash, "the second reorg gave the block's number a third hash").not.toBe(now.hash);
    await pollUp(w, name);
    expect((await received(w, name)).slice(3), "the second correction, then the third event").toEqual([
      { result: "accepted", source: "chain", id: `${w.anvil.chainId}:${now.hash}:0:corrected`, event: "Echo.EchoedCorrected", fields: { id: "1", by: w.sender.toLowerCase(), digest: digestB, wasConfirmed: true } },
      confirmed(w.anvil.chainId, latest.hash, 0, 1n, w.sender, digestC),
    ]);
    expect(checkpointProblems(await checkpointOf(w, name), await chainView(w)), "the stored checkpoint against the chain after the second reorg").toEqual([]);
  });

  it("reads a long history from a late start, and hands every confirmed event on once, in the chain's order", async () => {
    const w = await world();
    const url = w.anvil.rpcUrl;
    const { echo, name } = await fresh(w);
    const sent = [];
    for (const [id, gap] of [[10n, 150], [11n, 150], [12n, 5]] as const) {
      sent.push({ id, digest: digestOf(`history ${id}`), tx: await send(url, w.sender, echo.address, echoCall(id, digestOf(`history ${id}`))) });
      await mine(url, gap);
    }
    // Two events in one block, from two senders, the second with a uint beyond what a JSON number holds: log indexes 0 and 1, `by` and `id` told apart.
    const [, other] = await accounts(url);
    await rpc(url, "evm_setAutomine", [false]);
    const big = (1n << 130n) + 5n;
    const pair = [{ id: 13n, from: w.sender }, { id: big, from: other! }];
    const hashes = [];
    for (const p of pair) hashes.push(await rpc<Hex>(url, "eth_sendTransaction", [{ from: p.from, to: echo.address, data: echoCall(p.id, digestOf(`history ${p.id}`)), gas: "0x200000" }]));
    await mine(url, 1);
    await rpc(url, "evm_setAutomine", [true]);
    const receipts = await Promise.all(hashes.map((h) => rpc<{ blockHash: Hex; logs: Array<{ logIndex: Hex }> }>(url, "eth_getTransactionReceipt", [h])));
    expect(receipts.map((r) => [r.blockHash === receipts[0]!.blockHash, Number(BigInt(r.logs[0]!.logIndex))]), "the two events share a block, at log indexes 0 and 1").toEqual([[true, 0], [true, 1]]);
    await mine(url, 3);
    expect((await head(url)) - echo.block, "more than two windows of blocks to read").toBeGreaterThan(300n);
    await pollUp(w, name);
    expect(await received(w, name), "every event, once, in the order of the chain").toEqual([
      ...sent.map((s) => confirmed(w.anvil.chainId, s.tx.blockHash, s.tx.logs[0]!.logIndex, s.id, w.sender, s.digest)),
      ...pair.map((p, i) => confirmed(w.anvil.chainId, receipts[i]!.blockHash, i, p.id, p.from, digestOf(`history ${p.id}`))),
    ]);
    expect(checkpointProblems(await checkpointOf(w, name), await chainView(w)), "the stored checkpoint against the chain after the long read").toEqual([]);
  });

  it("a restart does not double count: the checkpoint is what was stored, a replay is at most `seen`, nothing is accepted twice, and a new event is handed on once", async () => {
    const w = await world();
    const url = w.anvil.rpcUrl;
    const { echo, name, config } = await fresh(w);
    const [digestA, digestB, digestC] = [digestOf("A"), digestOf("B"), digestOf("C")];
    const first = await send(url, w.sender, echo.address, echoCall(1n, digestA));
    await mine(url, 1);
    await pollUp(w, name);
    await rpc(url, "anvil_reorg", [2, [[{ from: w.sender, to: echo.address, gas: "0x100000", data: echoCall(1n, digestB) }, 0]]]);
    const second = await blockAt(url, first.block);
    await pollUp(w, name);
    const before = await received(w, name);
    expect(before.map((c) => [c.id, c.result]), "before the restart: the event, its correction, the new event, each accepted").toEqual([
      [`${w.anvil.chainId}:${first.blockHash}:0`, "accepted"], [`${w.anvil.chainId}:${first.blockHash}:0:corrected`, "accepted"], [`${w.anvil.chainId}:${second.hash}:0`, "accepted"],
    ]);
    const stored = await checkpointOf(w, name);

    await w.worker.restart();
    await w.worker.call("FOLLOWER", name, "configure", config);
    expect(await checkpointOf(w, name), "the checkpoint after a restart is the one that was stored").toEqual(stored);
    await pollUp(w, name);
    const replayed = await received(w, name);
    expect(sinkProblems(replayed), "the chain has not moved: whatever is handed on again is `seen`").toEqual([]);
    expect(acceptedOf(replayed), "and nothing new is accepted").toEqual(before);

    const third = await send(url, w.sender, echo.address, echoCall(2n, digestC));
    await mine(url, 1);
    await pollUp(w, name);
    const after = await received(w, name);
    expect(sinkProblems(after), "after the restart and a new event, nothing is accepted twice").toEqual([]);
    expect(acceptedOf(after), "exactly the new event is newly accepted").toEqual([...before, confirmed(w.anvil.chainId, third.blockHash, 0, 2n, w.sender, digestC)]);
    expect(checkpointProblems(await checkpointOf(w, name), await chainView(w)), "the stored checkpoint against the chain after one restart").toEqual([]);

    // A second restart, with another event after it: the same again.
    const stored2 = await checkpointOf(w, name);
    await w.worker.restart();
    await w.worker.call("FOLLOWER", name, "configure", config);
    expect(await checkpointOf(w, name), "the checkpoint after a second restart is the one that was stored").toEqual(stored2);
    await pollUp(w, name);
    const replayed2 = await received(w, name);
    expect([sinkProblems(replayed2), acceptedOf(replayed2)], "after a second restart: a replay is `seen`, nothing new is accepted").toEqual([[], acceptedOf(after)]);
    const fourth = await send(url, w.sender, echo.address, echoCall(3n, digestOf("D")));
    await mine(url, 1);
    await pollUp(w, name);
    const last = await received(w, name);
    expect(sinkProblems(last), "across both restarts no id was accepted twice").toEqual([]);
    expect(acceptedOf(last), "exactly the new event is newly accepted").toEqual([...acceptedOf(after), confirmed(w.anvil.chainId, fourth.blockHash, 0, 3n, w.sender, digestOf("D"))]);
    expect(checkpointProblems(await checkpointOf(w, name), await chainView(w)), "the stored checkpoint against the chain at the end").toEqual([]);
  });

  it("a sink that answers an error once: the change is handed on again at the next poll, and the checkpoint does not pass it before the sink has taken it", async () => {
    const w = await world();
    const { echo, name } = await fresh(w);
    const digest = digestOf("A");
    const tx = await send(w.anvil.rpcUrl, w.sender, echo.address, echoCall(1n, digest));
    await pollUp(w, name);
    const stored = await checkpointOf(w, name);
    expect(await received(w, name), "observed, not confirmed: nothing is handed on").toEqual([]);
    await mine(w.anvil.rpcUrl, 1);
    await w.worker.call("FOLLOWER_SINK", name, "failNext", 1);
    await w.worker.call("FOLLOWER", name, "poll").catch(() => undefined);
    expect(await received(w, name), "the sink took nothing: it answered an error").toEqual([]);
    expect(await checkpointOf(w, name), "the checkpoint stays where it was: it has not passed a change the sink refused").toEqual(stored);
    await pollUp(w, name);
    expect(await received(w, name), "at the next poll the same change is handed on, and taken").toEqual([confirmed(w.anvil.chainId, tx.blockHash, 0, 1n, w.sender, digest)]);
    expect(checkpointProblems(await checkpointOf(w, name), await chainView(w)), "now the checkpoint is the chain's").toEqual([]);
  });

  it("an event taken back before it was confirmed is not handed on at all: the sink never saw it, so there is nothing to correct", async () => {
    const w = await world();
    const url = w.anvil.rpcUrl;
    const { echo, name } = await fresh(w);
    const [digestA, digestB] = [digestOf("A"), digestOf("B")];
    const first = await send(url, w.sender, echo.address, echoCall(1n, digestA));
    await pollUp(w, name);
    expect(await received(w, name), "observed only: depth 2 and its block is the head").toEqual([]);
    // A reorg of one block, inside the confirmation window: the first event is gone before anything confirmed it.
    await rpc(url, "anvil_reorg", [1, [[{ from: w.sender, to: echo.address, gas: "0x100000", data: echoCall(1n, digestB) }, 0]]]);
    const now = await blockAt(url, first.block);
    expect(now.hash, "the reorg gave the block's number a new hash").not.toBe(first.blockHash);
    await pollUp(w, name);
    expect(await received(w, name), "it was taken back unconfirmed: no correction, and the new event is still only observed").toEqual([]);
    await mine(url, 1);
    await pollUp(w, name);
    expect(await received(w, name), "once the new event is confirmed it is handed on, and nothing else was").toEqual([confirmed(w.anvil.chainId, now.hash, 0, 1n, w.sender, digestB)]);
  });
});

describe("the judges of this file, on wrong inputs (true today)", () => {
  const A = `0x${"a".repeat(64)}` as Hex;
  const B = `0x${"b".repeat(64)}` as Hex;
  const C = `0x${"c".repeat(64)}` as Hex;
  const chain = { head: { number: "2", hash: C }, hashes: { "0": A, "1": B, "2": C } };
  const right: Checkpoint = { through: { number: "2", hash: C }, window: [{ number: "0", hash: A }, { number: "1", hash: B }, { number: "2", hash: C }] };

  it("the checkpoint judge takes the chain's own view, and refuses each way a stored one can be wrong", () => {
    expect(checkpointProblems(right, chain)).toEqual([]);
    expect(checkpointProblems({ window: right.window }, chain)).toEqual(["the checkpoint has no `through`"]);
    expect(checkpointProblems({ ...right, through: { number: "1", hash: B } }, chain).join("; ")).toMatch(/through is 1.*head is 2.*does not end at `through`/);
    expect(checkpointProblems({ ...right, window: [right.window[0]!, { number: "1", hash: C }, right.window[2]!] }, chain).join("; ")).toMatch(/hash for block 1 is 0xcccc.*chain's is 0xbbbb/);
    expect(checkpointProblems({ ...right, through: { number: "2", hash: A } }, chain).join("; ")).toMatch(/through is 2 0xaaaa/);
    expect(checkpointProblems({ ...right, window: [] }, chain)).toContain("the window is empty");
    expect(checkpointProblems({ ...right, window: [right.window[1]!, right.window[0]!, right.window[2]!] }, chain).join("; ")).toMatch(/entry 1 \(0\) is not after/);
    expect(checkpointProblems({ ...right, window: [{ number: "3", hash: A }, ...right.window] }, chain).join("; ")).toMatch(/block 3, which the chain does not have/);
    expect(checkpointProblems({ ...right, window: [right.window[0]!, right.window[0]!, right.window[2]!] }, chain).join("; ")).toMatch(/entry 1 \(0\) is not after/);
    expect(checkpointProblems({ ...right, window: [right.window[2]!] }, chain)).toEqual([]);
    expect(checkpointProblems({ ...right, window: [{ number: 0 as unknown as string, hash: A }, right.window[1]!, right.window[2]!] }, chain).join("; ")).toMatch(/block number 0 is not a decimal string/);
    expect(checkpointProblems({ ...right, through: { number: 2n as unknown as string, hash: C } }, chain).join("; ")).toMatch(/through is 2 0xcccc|block number 2 is not a decimal string/);
  });

  it("the sink judge takes `seen` replays, and refuses an id accepted twice, a `seen` that was never accepted, and another answer", () => {
    const c = (id: string, result: string) => ({ id, result });
    expect(sinkProblems([c("a", "accepted"), c("b", "accepted"), c("a", "seen"), c("a", "seen")])).toEqual([]);
    expect(sinkProblems([c("a", "accepted"), c("a", "accepted")])).toEqual(["a was accepted twice"]);
    expect(sinkProblems([c("a", "seen")])).toEqual([`a was "seen" before it was accepted`]);
    expect(sinkProblems([c("a", "maybe")])).toEqual([`a got the answer "maybe"`]);
    expect(acceptedOf([c("a", "accepted"), c("a", "seen")])).toEqual([c("a", "accepted")]);
  });

  it("the entry normaliser sees an address in either case as one, and an id or a field that differs as different", () => {
    const call = (id: string, by: string, result = "accepted"): Call => ({ result, entry: { source: "chain", id, event: "Echo.Echoed", fields: { id: "1", by, digest: A } } });
    const lower = `0x${"ab".repeat(20)}`;
    expect(normalise([call("1:0x1:0", lower.toUpperCase().replace("0X", "0x"))])).toEqual(normalise([call("1:0x1:0", lower)]));
    expect(normalise([call("1:0x1:0", lower)])).not.toEqual(normalise([call("1:0x1:1", lower)]));
    expect(normalise([call("1:0x1:0", lower)])).not.toEqual(normalise([call("1:0x1:0", lower, "seen")]));
    expect(normalise([call("1:0x1:0", lower)])[0]!.fields).toEqual({ id: "1", by: lower, digest: A });
    const extra = call("1:0x1:0", lower);
    expect(normalise([{ ...extra, entry: { ...extra.entry, extra: 1 } as Entry }])).not.toEqual(normalise([extra]));
    expect(normalise([{ ...extra, entry: { ...extra.entry, fields: { ...extra.entry.fields, more: 1 } } }])).not.toEqual(normalise([extra]));
  });
});
