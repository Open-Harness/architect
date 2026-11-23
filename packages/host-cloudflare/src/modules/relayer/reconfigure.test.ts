// One Live at a time (round 5): `configure` with a new `rpcUrl` while a `relay` is in flight must not build a second Live that takes the same
// nonce back as an unsent row and fills it under the call that is still sending. The node here is a scripted JSON-RPC stub in workerd.
import { env, runInDurableObject } from "cloudflare:test";
import { Keys } from "@orthograph/chain-evm/device";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "./internal/store.ts";
import type { Relayer } from "./service.ts";

const H = `0x${"ab".repeat(32)}`;
const ADDRESS = `0x${"11".repeat(20)}`;
const block = { number: "0x1", hash: H, parentHash: H, nonce: "0x0000000000000000", sha3Uncles: H, logsBloom: `0x${"00".repeat(256)}`, transactionsRoot: H, stateRoot: H, receiptsRoot: H, miner: ADDRESS, difficulty: "0x0", totalDifficulty: "0x0", extraData: "0x", size: "0x1", gasLimit: "0x1c9c380", gasUsed: "0x0", timestamp: "0x1", transactions: [], uncles: [], baseFeePerGas: "0x3b9aca00", mixHash: H };
const heldTransaction = (hash: string) => ({ blockHash: null, blockNumber: null, from: ADDRESS, gas: "0x5208", gasPrice: "0x3b9aca00", maxFeePerGas: "0x77359400", maxPriorityFeePerGas: "0x3b9aca00", hash, input: "0x", nonce: "0x0", to: ADDRESS, transactionIndex: null, value: "0x0", type: "0x2", chainId: "0x7a69", accessList: [], v: "0x0", r: "0x1", s: "0x1", yParity: "0x0" });
const bytesOf = (hex: string) => Uint8Array.from(hex.slice(2).match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
const hashOf = (raw: string) => `0x${[...Keys.keccak256(bytesOf(raw))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
const deferred = () => { let open!: () => void; const wait = new Promise<void>((done) => { open = done; }); return { open, wait }; };
const pause = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

describe("configure with a new rpcUrl while a relay is in flight", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("waits for the call, builds the one new Live after it, and no second transaction is sent at that nonce", async () => {
    const entered = deferred();
    const gate = deferred();
    const sends: string[] = [];
    let calls = 0;
    const node = async (method: string, params: unknown[]): Promise<unknown> => {
      switch (method) {
        case "eth_chainId": return "0x7a69";
        // The first eth_call is the relayer reading the call; the second is its simulation, after the nonce is taken and its row written.
        case "eth_call": if (++calls === 2) { entered.open(); await gate.wait; } return "0x";
        case "eth_estimateGas": return "0x5208";
        case "eth_getBlockByNumber": return block;
        case "eth_maxPriorityFeePerGas": return "0x3b9aca00";
        case "eth_getTransactionCount": return "0x0";
        case "eth_blockNumber": return "0x1";
        case "eth_sendRawTransaction": sends.push(String(params[0])); return hashOf(String(params[0]));
        case "eth_getTransactionReceipt": return null;
        case "eth_getTransactionByHash": return heldTransaction(String(params[0]));
        default: throw new Error(`the stub node has no ${method}`);
      }
    };
    vi.stubGlobal("fetch", async (_url: unknown, init: { body: string }) => {
      const { id, method, params } = JSON.parse(init.body) as { id: number; method: string; params: unknown[] };
      return Response.json({ jsonrpc: "2.0", id, result: await node(method, params) });
    });

    await runInDurableObject(env.RELAYER.getByName("eip155:31337") as DurableObjectStub<Relayer>, async (instance, state) => {
      const relayer = instance as Relayer;
      const store = makeStore(state.storage.sql);
      await relayer.configure({ rpcUrl: "http://rpc-a.test", chainId: 31337 });
      const sending = relayer.relay({ to: ADDRESS as `0x${string}`, data: "0x" });
      await entered.wait;
      expect(store.open().map((r) => [r.nonce, r.serialized]), "its row holds the nonce while it simulates").toEqual([[0, "0x"]]);
      let swapped = false;
      const reconfiguring = relayer.configure({ rpcUrl: "http://rpc-b.test", chainId: 31337 }).then(() => { swapped = true; });
      const alarm = relayer.reconcile();
      await pause(100);
      expect(swapped, "the new Live waits for the call that is using the old one").toBe(false);
      expect(sends, "nothing was sent on that nonce meanwhile").toEqual([]);
      gate.open();
      const sent = await sending;
      await Promise.all([reconfiguring, alarm]);
      expect(sent.nonce).toBe(0);
      expect(sends, "one transaction at that nonce, the call's own").toHaveLength(1);
      expect(store.open().map((r) => [r.nonce, r.state, r.fill])).toEqual([[0, "submitted", false]]);
      await relayer.reconcile();
      expect(sends, "and the new Live, which took the row back, sends nothing more").toHaveLength(1);
    });
  }, 60_000);
});
