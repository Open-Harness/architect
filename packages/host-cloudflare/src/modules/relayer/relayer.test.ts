import { env, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { makeStore, type Row } from "./internal/store.ts";
import type { Relayer } from "./service.ts";

const hash = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as const;
const row = (id: string, nonce: number): Row => ({
  id, nonce, state: "submitted", hash: hash(nonce), serialized: "0x02ab", replaces: [], fromBlock: 12n, cap: 10_000_000_000n, fill: false, note: "",
});

describe("the relayer, in workerd (the chain side is checked on Anvil by e2e/on-chain/10-m6-07-relayer.test.ts)", () => {
  it("refuses every call before it is configured, and says what is missing", async () => {
    await runInDurableObject(env.RELAYER.getByName("eip155:1") as DurableObjectStub<Relayer>, async (instance) => {
      const relayer = instance as Relayer;
      await expect(relayer.status("nothing")).rejects.toThrow(/not configured/);
      await expect(relayer.relay({ to: "0x0000000000000000000000000000000000000001", data: "0x" })).rejects.toThrow(/not configured/);
    });
  });

  it("will not configure without its key, or for a bad chain id, and its refusals hold nothing it was given", async () => {
    await runInDurableObject(env.RELAYER.getByName("eip155:2") as DurableObjectStub<Relayer>, async (instance) => {
      const relayer = instance as Relayer;
      await expect(relayer.configure({ rpcUrl: "http://127.0.0.1:1", chainId: 2 })).rejects.toThrow(/bind RELAYER_KEY/);
      await expect(relayer.configure({ rpcUrl: "http://127.0.0.1:1", chainId: 0 })).rejects.toThrow(/chainId/);
      await expect(relayer.configure({ rpcUrl: "http://127.0.0.1:1", chainId: 2, pollIntervalMs: -5 })).rejects.toThrow(/pollIntervalMs/);
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
      store.replace(store.find("id-6")!, hash(600), "0x02cd", 20n);
      expect(store.find("id-6")).toMatchObject({ hash: hash(600), serialized: "0x02cd", replaces: [hash(6)], fromBlock: 20n, state: "submitted", cap: 10_000_000_000n });
      store.setState("id-5", "included");
      store.setState("id-7", "lost");
      expect(store.open().map((r) => r.id)).toEqual(["id-6"]);
      // A second store over the same storage (a restart) reads the same rows.
      expect(makeStore(state.storage.sql).find("id-5")?.state).toBe("included");
    });
  });
});
