import { Effect } from "effect";
import { describe, expect, inject, it } from "vitest";
import { runStep, type Store } from "./internal/outbox.ts";
import type { FollowerConfig, FollowerSink, SinkEntry } from "./types.ts";

// A real Anvil (test/anvil-setup.ts), read from workerd; the store is a Map and the sink a list that answers `seen` for an id it has had.
const url = inject("anvilUrl");

const rpc = <A>(method: string, params: ReadonlyArray<unknown> = []) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })
    .then((r) => r.json() as Promise<{ result: A; error?: { message: string } }>).then((b) => { if (b.error) throw new Error(b.error.message); return b.result; });
const receipt = async (hash: string) => {
  for (;;) {
    const r = await rpc<{ blockNumber: string; contractAddress: string | null } | null>("eth_getTransactionReceipt", [hash]);
    if (r) return r;
    await new Promise((d) => setTimeout(d, 50));
  }
};

// contract Echo { event Echoed(uint256 indexed id, address indexed by, bytes32 digest); function echo(uint256 id, bytes32 digest) external { emit Echoed(id, msg.sender, digest); } } (as in e2e/on-chain/actor-fixture.ts)
const BYTECODE = "0x6080604052348015600e575f5ffd5b5061014c8061001c5f395ff3fe608060405234801561000f575f5ffd5b5060043610610034575f3560e01c80635e2849751461003857806382a67c811461004d575b5f5ffd5b61004b6100463660046100df565b610060565b005b61004b61005b3660046100f6565b6100a4565b8042106100a15760405162461bcd60e51b8152600401610098906020808252600490820152636c61746560e01b604082015260600190565b60405180910390fd5b50565b604051818152339083907fa252d7b86ab65f41f612470c12c79b722f0d1fda777f6e3340bbd46db0a1dc389060200160405180910390a35050565b5f602082840312156100ef575f5ffd5b5035919050565b5f5f60408385031215610107575f5ffd5b5050803592602090910135915056fea26469706673582212207146c397e345e65488f062be5f6bf89f10a1927485e7cb4684dc8a8044a90d7564736f6c634300081e0033";
const ECHOED_ABI = { type: "event", name: "Echoed", inputs: [{ name: "id", type: "uint256", indexed: true }, { name: "by", type: "address", indexed: true }, { name: "digest", type: "bytes32", indexed: false }] };
const word = (n: bigint) => n.toString(16).padStart(64, "0");

const memory = (): Store & { readonly data: Map<string, unknown> } => {
  const data = new Map<string, unknown>();
  return { data, get: async <T>(k: string) => data.get(k) as T | undefined, put: async (k, v) => { data.set(k, v); }, delete: async (k) => data.delete(k) };
};

describe.skipIf(url === "")("the outbox: what the sink took is never lost to a refusal that follows it (M6-chain item 12)", () => {
  it("two events confirmed in one step, the sink takes the first and refuses the second, the chain takes both away: the sink is told of each take-back", async () => {
    const [from] = await rpc<string[]>("eth_accounts");
    const deployed = await receipt(await rpc<string>("eth_sendTransaction", [{ from, data: BYTECODE, gas: "0x200000" }]));
    const address = deployed.contractAddress!.toLowerCase();
    const selector = (await rpc<string>("web3_sha3", [`0x${Buffer.from("echo(uint256,bytes32)").toString("hex")}`])).slice(0, 10);
    for (const id of [1n, 2n]) await receipt(await rpc<string>("eth_sendTransaction", [{ from, to: address, data: `${selector}${word(id)}${"11".repeat(32)}`, gas: "0x100000" }]));
    await rpc("anvil_mine", ["0x3"]);
    const config: FollowerConfig = { rpcUrl: url, chainId: 31337, contract: "Echo", address, event: ECHOED_ABI, fromBlock: String(Number(deployed.blockNumber)), depth: 2 };

    const taken: SinkEntry[] = [];
    let refuse: string | undefined;
    const sink = (): FollowerSink => ({ accept: async (entry) => {
      if (entry.id === refuse) throw new Error("the sink is unavailable");
      const seen = taken.some((t) => t.id === entry.id);
      if (!seen) taken.push(entry);
      return seen ? "seen" : "accepted";
    } });
    const store = memory();
    const step = () => Effect.runPromise(runStep(store, config, sink));

    const second = await rpc<{ hash: string }>("eth_getBlockByNumber", [`0x${(Number(deployed.blockNumber) + 2).toString(16)}`, false]);
    refuse = `31337:${second.hash}:0`;
    await expect(step(), "the second event is refused").rejects.toThrow();
    expect(taken.map((t) => t.event), "the first was taken").toEqual(["Echo.Echoed"]);

    // The chain takes the two events' blocks away before the retry, and the sink recovers.
    await rpc("anvil_reorg", [5, []]);
    refuse = undefined;
    for (let i = 0; i < 20 && !(await step()).caughtUp; i++);
    await step();
    expect(taken.map((t) => `${t.event}:${t.id.endsWith(":corrected")}`), "the second is delivered from the outbox, then both are corrected: nothing the sink holds is left standing").toEqual([
      "Echo.Echoed:false", "Echo.Echoed:false", "Echo.EchoedCorrected:true", "Echo.EchoedCorrected:true",
    ]);
    expect(store.data.has("outbox"), "the outbox is empty").toBe(false);
  }, 60_000);
});
