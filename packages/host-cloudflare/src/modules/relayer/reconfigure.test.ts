// The relayer against a scripted JSON-RPC node, in workerd: `configure` with a new `rpcUrl` while a call is in flight builds one Live and sends
// nothing twice at a nonce (round 5), and a failure to read the head before the broadcast never loses the call (the cut to rebroadcast).
import { abortAllDurableObjects, env, runInDurableObject } from "cloudflare:test";
import { Keys } from "@orthograph/chain-evm/device";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "./internal/store.ts";
import type { Relayer } from "./service.ts";

const H = `0x${"ab".repeat(32)}`;
const ADDRESS = `0x${"11".repeat(20)}`;
const block = { number: "0x1", hash: H, parentHash: H, nonce: "0x0000000000000000", sha3Uncles: H, logsBloom: `0x${"00".repeat(256)}`, transactionsRoot: H, stateRoot: H, receiptsRoot: H, miner: ADDRESS, difficulty: "0x0", totalDifficulty: "0x0", extraData: "0x", size: "0x1", gasLimit: "0x1c9c380", gasUsed: "0x0", timestamp: "0x1", transactions: [], uncles: [], baseFeePerGas: "0x3b9aca00", mixHash: H };
const heldTransaction = (hash: string) => ({ blockHash: null, blockNumber: null, from: ADDRESS, gas: "0x5208", gasPrice: "0x3b9aca00", maxFeePerGas: "0x77359400", maxPriorityFeePerGas: "0x3b9aca00", hash, input: "0x", nonce: "0x0", to: ADDRESS, transactionIndex: null, value: "0x0", type: "0x2", chainId: "0x7a69", accessList: [], v: "0x0", r: "0x1", s: "0x1", yParity: "0x0" });
const receiptOf = (hash: string) => ({ blockHash: H, blockNumber: "0x2", contractAddress: null, cumulativeGasUsed: "0x5208", effectiveGasPrice: "0x3b9aca00", from: ADDRESS, gasUsed: "0x5208", logs: [], logsBloom: `0x${"00".repeat(256)}`, status: "0x1", to: ADDRESS, transactionHash: hash, transactionIndex: "0x0", type: "0x2" });
const bytesOf = (hex: string) => Uint8Array.from(hex.slice(2).match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
const hashOf = (raw: string) => `0x${[...Keys.keccak256(bytesOf(raw))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
const deferred = () => { let open!: () => void; const wait = new Promise<void>((done) => { open = done; }); return { open, wait }; };
const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

type Answer = (params: unknown[]) => Promise<unknown> | unknown;
/** A JSON-RPC error answer, as a node gives one (an HTTP 200 with an `error`), as opposed to a node that is down (an HTTP 500). */
class Refusal extends Error {}
/** A node that holds what it was sent, mines on request, and lets a test override any method (an override that throws is an HTTP 500). */
const stubNode = (overrides: Record<string, Answer> = {}) => {
  const sends: string[] = [];
  /** `refuse`: the node answers `eth_sendRawTransaction` with this error. `evicted`: it no longer holds what it was sent, until it is sent again. */
  const node = { sends, mined: false, refuse: undefined as string | undefined, evicted: false };
  const answers: Record<string, Answer> = {
    eth_chainId: () => "0x7a69",
    eth_call: () => "0x",
    eth_estimateGas: () => "0x5208",
    eth_getBlockByNumber: () => block,
    eth_maxPriorityFeePerGas: () => "0x3b9aca00",
    eth_getTransactionCount: (params) => (node.mined && params[1] === "latest" ? "0x1" : "0x0"),
    eth_blockNumber: () => "0x1",
    eth_sendRawTransaction: (params) => {
      if (node.refuse !== undefined) throw new Refusal(node.refuse);
      sends.push(String(params[0]));
      node.evicted = false;
      return hashOf(String(params[0]));
    },
    eth_getTransactionReceipt: (params) => (node.mined && sends.some((raw) => hashOf(raw) === params[0]) ? receiptOf(String(params[0])) : null),
    eth_getTransactionByHash: (params) => (!node.evicted && sends.some((raw) => hashOf(raw) === params[0]) ? heldTransaction(String(params[0])) : null),
    ...overrides,
  };
  vi.stubGlobal("fetch", async (_url: unknown, init: { body: string }) => {
    const { id, method, params } = JSON.parse(init.body) as { id: number; method: string; params: unknown[] };
    const answer = answers[method];
    if (answer === undefined) throw new Error(`the stub node has no ${method}`);
    try { return Response.json({ jsonrpc: "2.0", id, result: await answer(params) }); } catch (error) {
      return error instanceof Refusal ? Response.json({ jsonrpc: "2.0", id, error: { code: -32000, message: error.message } }) : new Response("the node failed", { status: 500 });
    }
  });
  return node;
};
const inRelayer = (name: string, body: (relayer: Relayer, store: ReturnType<typeof makeStore>, state: DurableObjectState) => Promise<void>) =>
  runInDurableObject(env.RELAYER.getByName(name) as DurableObjectStub<Relayer>, (instance, state) => body(instance as Relayer, makeStore(state.storage.sql), state));

describe("the relayer against a node", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("configure with a new rpcUrl while a relay is in flight waits for the call, builds the one new Live after it, and no second transaction is sent at that nonce", async () => {
    const entered = deferred();
    const gate = deferred();
    let calls = 0;
    // The first eth_call is the relayer reading the call; the second is its simulation, after the nonce is taken and its row written.
    const node = stubNode({ eth_call: async () => { if (++calls === 2) { entered.open(); await gate.wait; } return "0x"; } });
    await inRelayer("eip155:31337", async (relayer, store) => {
      await relayer.configure({ rpcUrl: "http://rpc-a.test", chainId: 31337 });
      const sending = relayer.relay({ to: ADDRESS as `0x${string}`, data: "0x" });
      await entered.wait;
      expect(store.open().map((r) => [r.nonce, r.serialized]), "its row holds the nonce while it simulates").toEqual([[0, "0x"]]);
      let swapped = false;
      const reconfiguring = relayer.configure({ rpcUrl: "http://rpc-b.test", chainId: 31337 }).then(() => { swapped = true; });
      const alarm = relayer.reconcile();
      await pause(100);
      expect(swapped, "the new Live waits for the call that is using the old one").toBe(false);
      expect(node.sends, "nothing was sent on that nonce meanwhile").toEqual([]);
      gate.open();
      const sent = await sending;
      await Promise.all([reconfiguring, alarm]);
      expect(sent.nonce).toBe(0);
      expect(node.sends, "one transaction at that nonce, the call's own").toHaveLength(1);
      expect(store.open().map((r) => [r.nonce, r.state, r.fill])).toEqual([[0, "submitted", false]]);
      await relayer.reconcile();
      expect(node.sends, "and the new Live, which took the row back, sends nothing more").toHaveLength(1);
    });
  }, 60_000);

  it("a failure to read the head before the broadcast never loses the call: the alarm sends the same bytes when the node is back, and it lands", async () => {
    let heads = 0;
    const node = stubNode({ eth_blockNumber: () => { if (++heads === 1) throw new Error("the node is down"); return "0x1"; } });
    await inRelayer("eip155:31338", async (relayer, store) => {
      await relayer.configure({ rpcUrl: "http://rpc-a.test", chainId: 31337 });
      const sent = await relayer.relay({ to: ADDRESS as `0x${string}`, data: "0x" });
      expect(node.sends, "the head could not be read, so nothing reached the node").toEqual([]);
      expect(store.find(sent.id), "the call is kept, with its bytes").toMatchObject({ state: "submitting", fill: false });
      expect(await relayer.status(sent.id)).toMatchObject({ state: "dropped" });
      const first = await relayer.reconcile();
      expect(node.sends, "the call itself, not a fill and not a bump, went to the node").toHaveLength(1);
      expect(hashOf(node.sends[0]!)).toBe(sent.hash);
      expect(first.rebroadcast).toEqual([{ id: sent.id, nonce: sent.nonce, hash: sent.hash }]);
      expect((await relayer.reconcile()).rebroadcast, "held by the node now").toEqual([]);
      expect(await relayer.status(sent.id)).toMatchObject({ hash: sent.hash, state: "submitted", replaces: [] });
      node.mined = true;
      expect(await relayer.status(sent.id)).toMatchObject({ hash: sent.hash, nonce: 0, state: "included" });
      expect(node.sends, "sent exactly once").toHaveLength(1);
    });
  }, 60_000);

  it("a rebroadcast the node refuses keeps the call: its bytes stay, it is no fill, health names it, and the next alarm sends the original and it lands under its own hash", async () => {
    const node = stubNode();
    await inRelayer("eip155:31339", async (relayer, store) => {
      await relayer.configure({ rpcUrl: "http://rpc-a.test", chainId: 31337, stuckAfterMs: 50 });
      const sent = await relayer.relay({ to: ADDRESS as `0x${string}`, data: "0x" });
      const bytes = store.find(sent.id)!.serialized;
      expect(node.sends).toHaveLength(1);
      // The node evicts it from its pool; the relayer's balance is short, so the node refuses the same bytes when they are sent again.
      node.evicted = true;
      node.refuse = "insufficient funds for gas * price + value";
      await relayer.reconcile();
      expect(store.find(sent.id), "still the call, with its bytes, and no fill").toMatchObject({ hash: sent.hash, serialized: bytes, fill: false });
      expect(store.find(sent.id)?.note, "and the reason is on the row").not.toBe("");
      await pause(80);
      expect((await relayer.health()).stuck.map((s) => [s.id, s.nonce]), "stuck past its deadline, so health names it").toEqual([[sent.id, 0]]);
      // The balance is back: the next alarm sends the original again.
      node.refuse = undefined;
      await relayer.reconcile();
      expect(node.sends, "the call itself, twice, and nothing else").toEqual([bytes, bytes]);
      expect(store.find(sent.id)).toMatchObject({ hash: sent.hash, fill: false, note: "" });
      node.mined = true;
      expect(await relayer.status(sent.id), "the original call is the one that lands").toMatchObject({ hash: sent.hash, nonce: 0, state: "included" });
    });
  }, 60_000);

  it("a call refused on its first relay is told so: relay fails with the refusal, never answers as sent, and its nonce is held for a fill", async () => {
    const node = stubNode();
    node.refuse = "insufficient funds for gas * price + value";
    await inRelayer("eip155:31340", async (relayer, store) => {
      await relayer.configure({ rpcUrl: "http://rpc-a.test", chainId: 31337 });
      await expect(relayer.relay({ to: ADDRESS as `0x${string}`, data: "0x" })).rejects.toThrow(/^funds:/);
      expect(node.sends, "nothing reached the pool").toEqual([]);
      expect(store.open().map((r) => [r.nonce, r.fill, r.serialized])).toEqual([[0, true, "0x"]]);
    });
  }, 60_000);

  it("an open row always has an alarm coming: set when its row is stored, before any more work, and set again at a restart that finds open rows and none", async () => {
    const entered = deferred();
    const gate = deferred();
    let calls = 0;
    stubNode({ eth_call: async () => { if (++calls === 2) { entered.open(); await gate.wait; } return "0x"; } });
    await inRelayer("eip155:31341", async (relayer, store, state) => {
      await relayer.configure({ rpcUrl: "http://rpc-a.test", chainId: 31337, pollIntervalMs: 60_000 });
      expect(await state.storage.getAlarm(), "nothing is open, so no alarm yet").toBeNull();
      const sending = relayer.relay({ to: ADDRESS as `0x${string}`, data: "0x" });
      await entered.wait;
      expect(store.open(), "the call has its row and has not finished").toHaveLength(1);
      expect(await state.storage.getAlarm(), "an alarm is set already, though the call is still working and may never finish").not.toBeNull();
      gate.open();
      await sending;
    });
    // A restart that finds an open row and no alarm (the last one is gone) arms one.
    await inRelayer("eip155:31342", async (_relayer, store, state) => {
      store.keep({ rpcUrl: "http://rpc-a.test", chainId: 31337, pollIntervalMs: 60_000 });
      store.add({ id: "left", nonce: 0, state: "submitting", hash: `0x${"0".repeat(64)}`, serialized: "0x", fromBlock: 0n, fill: false, note: "", createdAt: 0 });
      await state.storage.deleteAlarm();
    });
    await abortAllDurableObjects();
    await inRelayer("eip155:31342", async (_relayer, store, state) => {
      expect(store.open().map((r) => r.id)).toEqual(["left"]);
      expect(await state.storage.getAlarm(), "the new instance armed the alarm").not.toBeNull();
    });
  }, 60_000);

  it("a status call while a rebroadcast is being sent, whose transaction is mined meanwhile, leaves the row terminal", async () => {
    const entered = deferred();
    const gate = deferred();
    let gated = false;
    const node = stubNode({
      eth_sendRawTransaction: async (params) => {
        if (gated) { entered.open(); await gate.wait; }
        node.sends.push(String(params[0]));
        node.evicted = false;
        return hashOf(String(params[0]));
      },
    });
    await inRelayer("eip155:31343", async (relayer, store) => {
      await relayer.configure({ rpcUrl: "http://rpc-a.test", chainId: 31337 });
      const sent = await relayer.relay({ to: ADDRESS as `0x${string}`, data: "0x" });
      node.evicted = true;
      gated = true;
      const alarm = relayer.reconcile();
      await entered.wait;
      node.mined = true;
      const reading = relayer.status(sent.id);
      await pause(50);
      gate.open();
      await alarm;
      expect((await reading).state).toBe("included");
      expect(store.find(sent.id), "terminal, and not reopened by the rebroadcast that finished after it").toMatchObject({ state: "included", hash: sent.hash });
      expect(store.open(), "so nothing is left for the alarm").toEqual([]);
    });
  }, 60_000);

  it("configure with a new pollIntervalMs while the node is down still leaves an alarm for the open rows", async () => {
    let down = false;
    stubNode({ eth_chainId: () => { if (down) throw new Error("the node is down"); return "0x7a69"; } });
    await inRelayer("eip155:31344", async (relayer, store, state) => {
      await relayer.configure({ rpcUrl: "http://rpc-a.test", chainId: 31337, pollIntervalMs: 60_000 });
      store.add({ id: "open", nonce: 0, state: "submitting", hash: `0x${"0".repeat(64)}`, serialized: "0x", fromBlock: 0n, fill: true, note: "", createdAt: 0 });
      await state.storage.deleteAlarm();
      down = true;
      await expect(relayer.configure({ rpcUrl: "http://rpc-b.test", chainId: 31337, pollIntervalMs: 30_000 }), "configure still fails when the node is down").rejects.toThrow();
      expect(await state.storage.getAlarm(), "but the open row has an alarm coming").not.toBeNull();
    });
  }, 60_000);
});
