// Goal 4, slice 9 (M6.07), the relayer actor: "100 concurrent submissions, nonces 0 to 99, a dropped one replaced" (`design/milestones.md` M6.07; build-plan L3.06:
// "A dropped transaction is replaced with a higher fee"). Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// THE SEAM THIS CHECK PICKS (M6-chain and K27 give the relayer no public shape: "a Durable Object that holds the relayer key and wraps chain-evm's nonce allocator,
// transaction manager, replacement and tracker", and `design/frame/examples/allowance-on-chain.md`: "relayer | one per relayer key | hands out nonces in order,
// replaces stuck transactions, writes receipts through | Both are Durable Objects inside the environment's one Worker"). The smallest shape that fits:
//   - `Relayer`, a Durable Object class exported from the front door of `@orthograph/host-cloudflare` (`src/index.ts`, beside `Actor` and `World`), written as
//     Effect over `@orthograph/chain-evm/device` (`makeChainPort`: prepare, simulate, sign, submit, track, replace, release). One instance per relayer key, which is one
//     per chain, named by the chain's CAIP-2 id: `env.RELAYER.getByName("eip155:<chainId>")` (M6-chain item 2: values are CAIP-10 and CAIP-2).
//   - The key is the secret binding `env.RELAYER_KEY` (design/frame/secrets.md: the relayer's key is a runtime secret), `0x` and 64 hex digits, as `Keys.fromSecret` takes it. It is never an argument, an answer, a log line
//     or a byte of the Durable Object's storage. (M6.18 checks hygiene in full; this check holds the part a relayer can break by itself.)
//   - Its methods, over Durable Object RPC. Every value is JSON: a `uint` would be a decimal string (M6-chain item 2), and there are none here.
//       configure({ rpcUrl, chainId, pollIntervalMs? }): { address }       idempotent; the address is the key's. A second call with the same arguments changes nothing.
//       relay({ to, data }): { id, hash, nonce, from }                      prepare, simulate (always), sign, submit. Answers once the node has accepted it, mined or not.
//                                                                           The nonce comes from the nonce allocator, so concurrent calls can never share one.
//       status(id): { id, nonce, hash, state, replaces }                    read from the chain now, and kept in the Durable Object's storage so it survives a restart. state is "submitted" (the node holds it), "included" (mined, success),
//                                                                           "reverted" (mined, failed) or "dropped" (no receipt, the node no longer holds it, nonce unused).
//                                                                           `hash` is the current transaction; `replaces` the hashes it replaced, oldest first.
//       reconcile(): { replaced: [{ id, nonce, oldHash, newHash }] }        every dropped submission is sent again, the same call at the same nonce, with a higher fee.
//     A submission the node still holds, or has mined, is left alone. A relayer that only replaces when `reconcile` is called is wrong (M6-chain item 12): its alarm, which fires every
//     `pollIntervalMs`, does the same work by itself. Answers carry at least the keys named here; the checks match those keys and no others.
//
// WHAT IT REQUIRES, on a real Anvil, with the Durable Object running in workerd under `wrangler dev` (`actor-fixture.ts`):
//   1. `configure` answers the address of the key in `RELAYER_KEY` (derived here with node's secp256k1), twice the same.
//   2. 100 `relay` calls made at once, for 100 different `Echo.echo(i, digest_i)` calls, get nonces 0 to 99, each once; every one is from the relayer's address and a
//      different hash; every one ends "included"; on the chain the relayer's nonce is 100, each transaction sits at the nonce it was told, with the call it was
//      given, and the contract's logs hold exactly 100 `Echoed`, ids 0 to 99, each once, `by` the relayer, with its own digest.
//   3a. With mining paused, a call is dropped by the node and nobody calls anything: within 30 s the relayer has replaced it by itself (same call, same nonce, higher fee), and it lands.
//   3b. With mining paused, three calls take the next three nonces. The node drops the middle one (`anvil_dropTransaction`; Anvil takes the one behind it out with it, and the check asks the
//      node which it let go). `reconcile` replaces what it is asked to replace and nothing the node still holds (an alarm that got there first leaves it less to do, and that is fine); in the
//      end each dropped one is replaced exactly once: a new hash the node holds, from the relayer, at that nonce, with the same call and a higher fee, the old hash in `replaces`, never mined.
//      After mining, all three are "included", the relayer's nonce moved by exactly three, and each of the three calls' events is on the chain once.
//   4. A call that is mined and fails (`Echo.guarded`, mined past its deadline) is "reverted", and its nonce is used. After a restart (wrangler stopped and started over the same storage) what
//      it sent is still known, as it was, and the next nonce is the chain's next.
//   5. After all that, the key is in no answer the Worker gave, not in wrangler's log, and in no file of the Durable Objects' storage.
//
// THE CONTROLS (true today, with no relayer): the nonce judge against planted wrong lists (a nonce twice, a gap, one short, one extra, one out of range, a list of the right size
// with a duplicate and a hole), the secret finders against text and raw bytes, the address derivation against the known address of secret key 1, and the test contract's selector and topic
// against the bytecode.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  ECHO_BYTECODE, ECHO_SELECTOR, ECHOED_TOPIC, GUARDED_SELECTOR, deployEcho, digestOf, echoCall, echoed, guardedCall, filesHolding, holdsSecret, makeKey, mine, nonceProblems, rpc, startAnvil, startWorker, until,
  type Anvil, type Hex, type Worker,
} from "./actor-fixture.ts";

interface Relayed { id: string; hash: Hex; nonce: number; from: Hex }
interface Status { id: string; nonce: number; hash: Hex; state: "submitted" | "included" | "reverted" | "dropped"; replaces: Hex[] }
interface Replaced { id: string; nonce: number; oldHash: Hex; newHash: Hex }

const key = makeKey();
/** `pollIntervalMs` is the period of the relayer's alarm. configure is idempotent only for the same arguments, so every call here gives the same. */
const config = (anvil: Anvil) => ({ rpcUrl: anvil.rpcUrl, chainId: anvil.chainId, pollIntervalMs: 250 });
let earlier: Relayed | undefined;
let started: Promise<{ anvil: Anvil; worker: Worker; echo: Hex; name: string; relayer: Hex }> | undefined;
// Set up once, and rethrown by every test that needs it, so each fails by name when the seam is missing.
const world = () => started ??= (async () => {
  const anvil = await startAnvil();
  const echo = (await deployEcho(anvil.rpcUrl)).address;
  const worker = await startWorker({ classes: ["Relayer"], secrets: { RELAYER_KEY: `0x${key.secret}` } });
  const name = `eip155:${anvil.chainId}`;
  const configured = (await worker.call("RELAYER", name, "configure", config(anvil))) as { address: Hex };
  await rpc(anvil.rpcUrl, "anvil_setBalance", [configured.address, "0x3635c9adc5dea00000"]);
  return { anvil, worker, echo, name, relayer: configured.address.toLowerCase() as Hex };
})();
afterAll(async () => { if (started) { const w = await started.catch(() => undefined); await w?.worker.stop(); await w?.anvil.stop(); } });

const relay = (w: { worker: Worker; name: string }, to: Hex, data: Hex) => w.worker.call("RELAYER", w.name, "relay", { to, data }) as Promise<Relayed>;
const status = (w: { worker: Worker; name: string }, id: string) => w.worker.call("RELAYER", w.name, "status", id) as Promise<Status>;
const count = async (url: string, address: Hex, tag: "latest" | "pending") => Number(BigInt(await rpc<Hex>(url, "eth_getTransactionCount", [address, tag])));
const txOf = (url: string, hash: Hex) => rpc<{ from: Hex; to: Hex; nonce: Hex; input: Hex; maxFeePerGas?: Hex; gasPrice?: Hex } | null>(url, "eth_getTransactionByHash", [hash]);
/** What the checks read of an answer: the keys the seam names. An answer may carry more (M6-chain item 12). */
const named = <A extends object>(answer: A, keys: ReadonlyArray<keyof A>) => Object.fromEntries(keys.map((k) => [k, answer[k]]));
const fee = (tx: { maxFeePerGas?: Hex; gasPrice?: Hex }) => BigInt(tx.maxFeePerGas ?? tx.gasPrice ?? "0x0");

describe("the relayer actor: a Durable Object that holds one key and sends every call from it, in order", () => {
  it("configure answers the address of the key in its environment, and answers it again the same", async () => {
    const w = await world();
    const again = (await w.worker.call("RELAYER", w.name, "configure", config(w.anvil))) as { address: Hex };
    expect(w.relayer, "the address configure gave is not the address of the secret key bound as RELAYER_KEY").toBe(key.address);
    expect(again.address.toLowerCase(), "a second configure with the same arguments gave another address").toBe(key.address);
  });

  it("100 concurrent submissions take nonces 0 to 99, each once; every one lands with its own call, and the contract saw each once", async () => {
    const w = await world();
    const calls = Array.from({ length: 100 }, (_, i) => ({ id: BigInt(i), digest: digestOf(`call ${i}`) }));
    const sent = await Promise.all(calls.map((c) => relay(w, w.echo, echoCall(c.id, c.digest))));
    earlier = sent[0];
    expect(nonceProblems(sent.map((s) => s.nonce), 0, 100), "the nonces the relayer handed out").toEqual([]);
    expect(sent.map((s) => [typeof s.id, typeof s.hash, typeof s.nonce, typeof s.from]), "relay answers { id, hash, nonce, from }").toEqual(sent.map(() => ["string", "string", "number", "string"]));
    expect(sent.map((s) => s.from.toLowerCase()), "every submission is from the relayer's own address").toEqual(sent.map(() => w.relayer));
    expect(new Set(sent.map((s) => s.hash)).size, "100 different transactions").toBe(100);
    expect(new Set(sent.map((s) => s.id)).size, "100 different ids").toBe(100);

    const settled = await until(() => Promise.all(sent.map((s) => status(w, s.id))), (all) => all.every((s) => s.state === "included"), 60_000);
    expect(settled.map((s) => s.state).filter((s) => s !== "included"), "every submission ends included").toEqual([]);
    expect(settled.map((s) => [s.nonce, s.hash]), "status agrees with what relay answered").toEqual(sent.map((s) => [s.nonce, s.hash]));
    expect(settled.map((s) => s.replaces), "nothing was replaced").toEqual(sent.map(() => []));
    expect(await count(w.anvil.rpcUrl, w.relayer, "latest"), "the relayer's nonce on the chain").toBe(100);

    const onChain = await Promise.all(sent.map((s) => txOf(w.anvil.rpcUrl, s.hash)));
    onChain.forEach((tx, i) => {
      expect(tx, `the chain holds transaction ${sent[i]!.hash}`).not.toBeNull();
      expect({ from: tx!.from.toLowerCase(), to: tx!.to.toLowerCase(), nonce: Number(BigInt(tx!.nonce)), input: tx!.input }, `the transaction of call ${i} on the chain`)
        .toEqual({ from: w.relayer, to: w.echo, nonce: sent[i]!.nonce, input: echoCall(calls[i]!.id, calls[i]!.digest) });
    });
    const logs = await echoed(w.anvil.rpcUrl, w.echo);
    expect(logs.map((l) => [l.id, l.by, l.digest]).sort((a, b) => Number((a[0] as bigint) - (b[0] as bigint))), "the contract's Echoed logs, one per call")
      .toEqual(calls.map((c) => [c.id, w.relayer, c.digest]));
  });

  it("replaces a dropped transaction on its own, through its alarm, with no reconcile call", async () => {
    const w = await world();
    const url = w.anvil.rpcUrl;
    const first = await count(url, w.relayer, "pending");
    const again = (await w.worker.call("RELAYER", w.name, "configure", config(w.anvil))) as { address: Hex };
    expect(again.address.toLowerCase(), "configure after it has sent 100 calls answers the same address").toBe(w.relayer);
    if (earlier) expect(await status(w, earlier.id), "configure again forgets nothing it sent").toMatchObject({ id: earlier.id, nonce: earlier.nonce, hash: earlier.hash, state: "included" });
    await rpc(url, "evm_setAutomine", [false]);
    const sent = await relay(w, w.echo, echoCall(3000n, digestOf("alarm")));
    expect(sent.nonce, "the next nonce").toBe(first);
    const before = await txOf(url, sent.hash);
    expect(await rpc(url, "anvil_dropTransaction", [sent.hash]), "the node dropped it").not.toBeNull();
    // No reconcile, no call at all: the relayer's own alarm notices and resends, within a bound.
    const seen = await until(() => status(w, sent.id), (s) => s.replaces.length > 0, 30_000);
    expect(seen, "the relayer replaced it by itself within 30 s").toMatchObject({ id: sent.id, nonce: first, state: "submitted", replaces: [sent.hash] });
    expect(seen.hash, "under a new hash").not.toBe(sent.hash);
    const replacement = await txOf(url, seen.hash);
    expect(replacement, "the node holds the replacement").not.toBeNull();
    expect({ from: replacement!.from.toLowerCase(), to: replacement!.to.toLowerCase(), nonce: Number(BigInt(replacement!.nonce)), input: replacement!.input }, "the same call at the same nonce")
      .toEqual({ from: w.relayer, to: w.echo, nonce: first, input: before!.input });
    expect(fee(replacement!) > fee(before!), "paying more").toBe(true);
    await rpc(url, "evm_setAutomine", [true]);
    await mine(url, 1);
    expect((await until(() => status(w, sent.id), (s) => s.state === "included", 30_000)).state).toBe("included");
    expect((await echoed(url, w.echo)).filter((l) => l.id === 3000n), "the call happened once").toHaveLength(1);
  });

  it("reconcile, called, replaces what the node dropped, at its nonce with a higher fee, and what was behind it lands (an alarm that gets there first does the same work)", async () => {
    const w = await world();
    const url = w.anvil.rpcUrl;
    const first = await count(url, w.relayer, "pending");
    await rpc(url, "evm_setAutomine", [false]);
    const subs = [await relay(w, w.echo, echoCall(1000n, digestOf("a"))), await relay(w, w.echo, echoCall(1001n, digestOf("b"))), await relay(w, w.echo, echoCall(1002n, digestOf("c")))];
    const [, b] = subs as [Relayed, Relayed, Relayed];
    expect(subs.map((s) => s.nonce), "the next three nonces, in order, continuing from the chain's own count").toEqual([first, first + 1, first + 2]);
    expect((await Promise.all(subs.map((s) => status(w, s.id)))).map((s) => s.state), "with mining paused all three are held by the node").toEqual(["submitted", "submitted", "submitted"]);
    const before = await Promise.all(subs.map((s) => txOf(url, s.hash)));
    expect(await rpc(url, "anvil_dropTransaction", [b.hash]), "the node dropped the middle transaction").not.toBeNull();

    // Anvil takes a transaction's dependents out of its pool with it: the node says what it let go.
    const held = await Promise.all(subs.map(async (s) => (await txOf(url, s.hash)) !== null));
    const gone = subs.filter((_, i) => !held[i]);
    const done = (await w.worker.call("RELAYER", w.name, "reconcile")) as { replaced: Replaced[] };
    // The alarm may have replaced some before this call, and then reconcile has less to do: what it reports is a subset of what the node dropped, lowest nonce first.
    const reported = done.replaced.map((r) => named(r, ["id", "nonce", "oldHash"]));
    expect(reported.every((r) => gone.some((g) => g.id === r.id && g.nonce === r.nonce && g.hash === r.oldHash)), "reconcile replaces only what the node dropped, at the same nonce").toBe(true);
    expect(reported.map((r) => r.nonce), "lowest nonce first").toEqual(reported.map((r) => r.nonce as number).sort((x, y) => x - y));
    expect(held.slice(0, 2), "the node let go of the middle one at least, and kept the first").toEqual([true, false]);

    // Whoever did it, every dropped one is now replaced: a new hash the node holds, the same call at the same nonce, a higher fee, the old hash listed.
    const now = await until(() => Promise.all(subs.map((s) => status(w, s.id))), (all) => gone.every((g) => all.find((x) => x.id === g.id)!.replaces.length === 1), 30_000);
    for (const g of gone) {
      const index = subs.findIndex((s) => s.id === g.id);
      const st = now[index]!;
      expect(st, `${g.id} is replaced, once`).toMatchObject({ id: g.id, nonce: g.nonce, replaces: [g.hash] });
      expect(st.hash, `the replacement of ${g.id} is a different transaction`).not.toBe(g.hash);
      const replacement = await txOf(url, st.hash);
      expect(replacement, `the node holds the replacement of ${g.id}`).not.toBeNull();
      expect({ from: replacement!.from.toLowerCase(), to: replacement!.to.toLowerCase(), nonce: Number(BigInt(replacement!.nonce)), input: replacement!.input }, `the replacement of ${g.id} is the same call at the same nonce`)
        .toEqual({ from: w.relayer, to: w.echo, nonce: g.nonce, input: before[index]!.input });
      expect(fee(replacement!) > fee(before[index]!), `the replacement of ${g.id} pays more`).toBe(true);
    }
    for (const r of done.replaced) expect(now.find((x) => x.id === r.id)!.hash, "what reconcile says it sent is what status says is current").toBe(r.newHash);
    expect((await w.worker.call("RELAYER", w.name, "reconcile") as { replaced: Replaced[] }).replaced, "nothing is dropped now, so a second reconcile replaces nothing").toEqual([]);

    await rpc(url, "evm_setAutomine", [true]);
    await mine(url, 1);
    const settled = await until(() => Promise.all(subs.map((s) => status(w, s.id))), (all) => all.every((s) => s.state === "included"), 30_000);
    expect(settled.map((s) => named(s, ["id", "nonce", "state"])), "all three end included").toEqual(subs.map((s) => ({ id: s.id, nonce: s.nonce, state: "included" })));
    expect(settled.map((s) => s.replaces.length), "each dropped one was replaced once, the rest never").toEqual(subs.map((s) => (gone.some((g) => g.id === s.id) ? 1 : 0)));
    for (const g of gone) expect(await rpc(url, "eth_getTransactionReceipt", [g.hash]), `the dropped transaction ${g.hash} was never mined`).toBeNull();
    expect(await count(url, w.relayer, "latest"), "the relayer's nonce moved by exactly three").toBe(first + 3);
    const logs = (await echoed(url, w.echo)).filter((l) => l.id >= 1000n && l.id < 1003n);
    expect(logs.map((l) => [l.id, l.by, l.digest]).sort((x, y) => Number((x[0] as bigint) - (y[0] as bigint))), "each of the three calls happened once")
      .toEqual([[1000n, w.relayer, digestOf("a")], [1001n, w.relayer, digestOf("b")], [1002n, w.relayer, digestOf("c")]]);
  });

  it("a call that is mined and fails is seen as reverted, and it still takes its nonce", async () => {
    const w = await world();
    const url = w.anvil.rpcUrl;
    const first = await count(url, w.relayer, "pending");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 100_000);
    await rpc(url, "evm_setAutomine", [false]);
    const sent = await w.worker.call("RELAYER", w.name, "relay", { to: w.echo, data: guardedCall(deadline) }) as Relayed;
    expect(sent.nonce, "it takes the next nonce").toBe(first);
    expect((await status(w, sent.id)).state, "simulated before its deadline, it is held by the node").toBe("submitted");
    await rpc(url, "evm_setNextBlockTimestamp", [Number(deadline) + 10]);
    await mine(url, 1);
    await rpc(url, "evm_setAutomine", [true]);
    const done = await until(() => status(w, sent.id), (s) => s.state !== "submitted", 30_000);
    expect(done, "mined after its deadline, the call fails on the chain").toMatchObject({ id: sent.id, nonce: first, hash: sent.hash, state: "reverted", replaces: [] });
    expect((await rpc<{ status: Hex }>(url, "eth_getTransactionReceipt", [sent.hash])).status, "the chain agrees").toBe("0x0");
    expect(await count(url, w.relayer, "latest"), "a failed call used its nonce").toBe(first + 1);
  });

  it("keeps what it sent across a restart: statuses still answer, and the next nonce is the chain's next", async () => {
    const w = await world();
    const url = w.anvil.rpcUrl;
    const sent = await relay(w, w.echo, echoCall(2000n, digestOf("before the restart")));
    const before = await until(() => status(w, sent.id), (s) => s.state === "included", 30_000);
    expect(before.state).toBe("included");
    await w.worker.restart();
    const configured = (await w.worker.call("RELAYER", w.name, "configure", config(w.anvil))) as { address: Hex };
    expect(configured.address.toLowerCase(), "the same key after a restart").toBe(w.relayer);
    expect(await status(w, sent.id), "what it sent before the restart is still known, as it was").toEqual(before);
    const next = await relay(w, w.echo, echoCall(2001n, digestOf("after the restart")));
    expect(next.nonce, "the next nonce continues from the chain's count").toBe(sent.nonce + 1);
    expect((await until(() => status(w, next.id), (s) => s.state === "included", 30_000)).state).toBe("included");
    const logs = (await echoed(url, w.echo)).filter((l) => l.id >= 2000n && l.id < 3000n);
    expect(logs.map((l) => l.id).sort(), "each call happened once").toEqual([2000n, 2001n]);
  });

  it("holds its key without showing it: not in an answer, not in wrangler's log, not in a file of the Durable Objects' storage", async () => {
    const w = await world();
    await w.worker.call("RELAYER", w.name, "status", "not-a-submission").catch(() => undefined);
    expect(holdsSecret(w.worker.transcript(), key.secret), "an answer the Worker gave held the key").toBe(false);
    expect(holdsSecret(w.worker.log(), key.secret), "wrangler's log held the key").toBe(false);
    expect(filesHolding(w.worker.state, key.secret), "files of the Durable Objects' storage that hold the key").toEqual([]);
  });
});

describe("the judges of this file, on wrong inputs (true today)", () => {
  it("the nonce judge refuses a nonce twice, a gap, a short list, a long list and one out of range, and takes the right list in any order", () => {
    const right = Array.from({ length: 100 }, (_, i) => i);
    expect(nonceProblems(right, 0, 100)).toEqual([]);
    expect(nonceProblems([...right].reverse(), 0, 100)).toEqual([]);
    expect(nonceProblems([...right.slice(0, 99), 98], 0, 100).join("; ")).toMatch(/98 was given 2 times.*99 was never used/);
    expect(nonceProblems(right.filter((n) => n !== 50), 0, 100).join("; ")).toMatch(/expected 100 nonces, got 99.*50 was never used/);
    expect(nonceProblems([...right, 100], 0, 100).join("; ")).toMatch(/got 101.*100 is outside/);
    expect(nonceProblems(right.map((n) => n + 1), 0, 100).join("; ")).toMatch(/0 was never used.*100 is outside/);
    expect(nonceProblems([0, 1, 1, 3], 0, 4).join("; ")).toMatch(/1 was given 2 times.*2 was never used/);
    expect(nonceProblems([], 0, 100)[0]).toMatch(/got 0/);
  });

  it("the secret finders see a key in text, with or without 0x and in any case, and in raw bytes, and not a key that is not there", () => {
    const dir = mkdtempSync(join(tmpdir(), "ortho-judge-"));
    try {
      expect(holdsSecret("a response with 0xAB12cd34", "ab12cd34")).toBe(true);
      expect(holdsSecret("a response with ab12cd34", "AB12CD34")).toBe(true);
      expect(holdsSecret("a response with ab12cd35", "ab12cd34")).toBe(false);
      writeFileSync(join(dir, "text"), "x 0xab12cd34 y");
      writeFileSync(join(dir, "raw"), Buffer.concat([Buffer.from("zz"), Buffer.from("ab12cd34", "hex")]));
      writeFileSync(join(dir, "none"), "ab12cd35");
      expect(filesHolding(dir, "ab12cd34").map((f) => f.split("/").pop()).sort()).toEqual(["raw", "text"]);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("the address derivation gives the known address of secret key 1, and the test contract's selector and topic are in its bytecode", () => {
    expect(ECHO_SELECTOR).toBe("0x82a67c81");
    expect(ECHO_BYTECODE.includes(ECHO_SELECTOR.slice(2))).toBe(true);
    expect(ECHO_BYTECODE.includes(GUARDED_SELECTOR.slice(2))).toBe(true);
    expect(guardedCall(5n)).toBe(`${GUARDED_SELECTOR}${"5".padStart(64, "0")}`);
    expect(ECHO_BYTECODE.includes(ECHOED_TOPIC.slice(2))).toBe(true);
    expect(echoCall(5n, digestOf("x"))).toBe(`0x82a67c81${"5".padStart(64, "0")}${digestOf("x").slice(2)}`);
    expect(makeKey("0".repeat(63) + "1").address).toBe("0x7e5f4552091a69125d5dfcb7b8c2659029395bdf");
    expect(makeKey().secret).toMatch(/^[0-9a-f]{64}$/);
  });
});
