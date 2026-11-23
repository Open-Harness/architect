import { env, runInDurableObject } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeStore, type Row } from "./internal/store.ts";
import type { Relayer } from "./service.ts";

const hash = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;
const row = (id: string, nonce: number): Row => ({
  id, nonce, state: "submitted", hash: hash(nonce), serialized: "0x02ab", fromBlock: 12n, fill: false, note: "", createdAt: 0,
});

describe("the relayer, in workerd (the chain side is checked on Anvil by e2e/on-chain/10-m6-07-relayer.test.ts)", () => {
  it("refuses every call before it is configured, and says what is missing", async () => {
    await runInDurableObject(env.RELAYER.getByName("eip155:1") as DurableObjectStub<Relayer>, async (instance) => {
      const relayer = instance as Relayer;
      await expect(relayer.status("nothing")).rejects.toThrow(/not configured/);
      await expect(relayer.relay({ to: "0x0000000000000000000000000000000000000001", data: "0x" })).rejects.toThrow(/not configured/);
    });
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it("will not configure for a bad chain id or poll interval, or for a node that does not answer, and its refusals hold nothing it was given", async () => {
    vi.stubGlobal("fetch", async () => new Response("the node is down", { status: 500 }));
    await runInDurableObject(env.RELAYER.getByName("eip155:2") as DurableObjectStub<Relayer>, async (instance) => {
      const relayer = instance as Relayer;
      await expect(relayer.configure({ rpcUrl: "http://127.0.0.1:1", chainId: 2 })).rejects.toThrow(/^transport: EVM RPC request failed$/);
      await expect(relayer.configure({ rpcUrl: "http://127.0.0.1:1", chainId: 0 })).rejects.toThrow(/chainId/);
      await expect(relayer.configure({ rpcUrl: "http://127.0.0.1:1", chainId: 2, pollIntervalMs: -5 })).rejects.toThrow(/pollIntervalMs/);
      await expect(relayer.configure({ rpcUrl: "http://127.0.0.1:1", chainId: 2, stuckAfterMs: 0 })).rejects.toThrow(/stuckAfterMs/);
      await expect(relayer.configure({ rpcUrl: "http://127.0.0.1:1", chainId: 2, stuckAfterMs: 1.5 })).rejects.toThrow(/stuckAfterMs/);
    });
  });

  it("keeps its configuration and its open submissions in its own storage, lowest nonce first, and settles one for good", async () => {
    await runInDurableObject(env.RELAYER.getByName("eip155:3"), async (_relayer, state) => {
      const store = makeStore(state.storage.sql);
      expect(store.config()).toBeUndefined();
      store.keep({ rpcUrl: "http://127.0.0.1:1", chainId: 3, pollIntervalMs: 250 });
      expect(store.config()).toEqual({ rpcUrl: "http://127.0.0.1:1", chainId: 3, pollIntervalMs: 250 });
      for (const nonce of [7, 5, 6]) store.add(row(`id-${nonce}`, nonce));
      expect(store.open().map((r) => r.nonce)).toEqual([5, 6, 7]);
      store.sent("id-6", 20n);
      expect(store.find("id-6")).toMatchObject({ hash: hash(6), serialized: "0x02ab", fromBlock: 20n, state: "submitted" });
      store.setState("id-5", "included");
      store.setState("id-7", "lost");
      expect(store.open().map((r) => r.id)).toEqual(["id-6"]);
      // A second store over the same storage (a restart) reads the same rows.
      expect(makeStore(state.storage.sql).find("id-5")?.state).toBe("included");
    });
  });

  it("names a nonce pending past its deadline, by row and nonce, with how long it has been pending (what having no fee bump costs)", async () => {
    await runInDurableObject(env.RELAYER.getByName("eip155:4") as DurableObjectStub<Relayer>, async (instance, state) => {
      const relayer = instance as Relayer;
      const store = makeStore(state.storage.sql);
      expect(await relayer.health(), "ten minutes unless configured").toEqual({ stuckAfterMs: 600_000, stuck: [] });
      store.keep({ rpcUrl: "http://127.0.0.1:1", chainId: 4, stuckAfterMs: 1_000 });
      const now = Date.now();
      store.add({ ...row("old", 3), createdAt: now - 5_000 });
      store.add({ ...row("new", 4), createdAt: now });
      store.add({ ...row("done", 2), state: "included", createdAt: now - 9_000 });
      const health = await relayer.health();
      expect(health.stuckAfterMs).toBe(1_000);
      expect(health.stuck.map((s) => [s.id, s.nonce])).toEqual([["old", 3]]);
      expect(health.stuck[0]!.pendingMs).toBeGreaterThanOrEqual(5_000);
    });
  });
});
