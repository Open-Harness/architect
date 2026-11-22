// ST4.01: the club in a verified world. Three members join privately, one spends 20 from a private allowance, a 500
// proposal passes by private ballot with a public tally, a second ballot is refused, and tampered proofs are refused.
// Usage: node --import tsx src/bin/club.ts [verified|control] [budgets,ballots,tamper]
//   verified: proofs are checked at admission (the default); control: the same world with verification off.
//   The phases default to all three. Evidence goes to evidence/club-<mode>-<phases>.json.
import { setupLocalNetwork } from "@aztec/aztec/testing";
import { resolve } from "node:path";
import { Fr, GrumpkinScalar } from "@aztec/aztec.js/fields";
import { deriveKeys } from "@aztec/aztec.js/keys";
import { waitForNode, waitForTx } from "@aztec/aztec.js/node";
import { Tx } from "@aztec/stdlib/tx";
import { ChonkProof } from "@aztec/stdlib/proofs";
import { ClubContract } from "../generated/Club.js";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";
import { getContractInstanceFromInstantiationParams } from "@aztec/aztec.js/contracts";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";
import { SPONSORED_FPC_SALT } from "@aztec/constants";
import { Device, now, root, save, type Person } from "../lib/world.js";

const control = process.argv[2] === "control";
const phases = new Set((process.argv[3] ?? "budgets,ballots,tamper").split(","));
const realProofs = !control;
const bb = resolve(root, "client/node_modules/@aztec/bb.js/build", process.arch === "arm64" ? "arm64-macos" : "amd64-linux", "bb");
const names = ["treasurer", "ana", "ben", "cy", "outsider", "shop"] as const;
const keys = names.map(() => ({ secret: Fr.random(), salt: Fr.random(), signing: GrumpkinScalar.random() }));
const log: Record<string, unknown>[] = [];
const note = (step: string, value: Record<string, unknown> = {}) => { const row = { step, ...value }; log.push(row); console.log(JSON.stringify(row, (_, v) => (typeof v === "bigint" ? v.toString() : v))); };
const first = (e: unknown) => String((e as Error)?.message ?? e).split("\n")[0]!.slice(0, 240);

// Addresses must be known before genesis so the network can fund them with fee juice.
const t0 = now();
const pre = await setupLocalNetwork({ config: { realProofs: false } as never });
const scratch = await Device.create(pre.node as never, { ephemeral: true, pxe: { proverEnabled: false } });
const addresses = [];
for (const k of keys) addresses.push((await scratch.createSchnorrInitializerlessAccount(k.secret, k.salt, k.signing)).address);
await scratch.stop(); await pre.stop();
// Every fee is paid by the shared sponsor, so no member is a fee payer (only the treasurer, who deploys, holds fee juice).
const fpc = await getContractInstanceFromInstantiationParams(SponsoredFPCContract.artifact, { salt: new Fr(SPONSORED_FPC_SALT) });
const fee = { paymentMethod: new SponsoredFeePaymentMethod(fpc.address) };

const tNet = now();
const net = await setupLocalNetwork({ fundedAddresses: [addresses[0]!, fpc.address], config: { realProofs, bbBinaryPath: bb, bbWorkingDirectory: resolve(root, "runtime/bb") } as never });
const node = net.node as never as Parameters<typeof Device.create>[0];
await waitForNode(node as never);
note("world started", { realProofs, nodeReportsRealProofs: ((await (node as any).getNodeInfo()) as any).realProofs, startMs: Math.round(now() - tNet) });

try {
  const people: Person[] = [];
  for (const [i, k] of keys.entries()) {
    const wallet = await Device.create(node, { ephemeral: true, pxe: { proverEnabled: true } });
    await wallet.registerContract(fpc, SponsoredFPCContract.artifact);
    const a = await wallet.createSchnorrInitializerlessAccount(k.secret, k.salt, k.signing);
    people.push({ name: names[i]!, wallet, address: a.address });
  }
  for (const a of people) for (const b of people) if (a !== b) await a.wallet.registerSender(b.address, "peer");
  const [treasurer, ana, ben, cy, outsider, shop] = people as [Person, Person, Person, Person, Person, Person];

  // The club's own keyed address: allowances are its notes, so the treasurer can replace them on revoke.
  const clubSecret = Fr.random();
  const { publicKeys } = await deriveKeys(clubSecret);
  const tDeploy = now();
  const { contract, instance } = await ClubContract.deploy(treasurer.wallet, treasurer.address, { publicKeys } as never).send({ from: treasurer.address }) as any;
  const club = contract.address;
  for (const p of people) {
    await p.wallet.registerContract(instance, ClubContract.artifact, p === outsider || p === shop ? undefined : clubSecret);
    await p.wallet.registerSender(club, "club");
  }
  note("club deployed", { ms: Math.round(now() - tDeploy) });
  const at = (p: Person) => ClubContract.at(club, p.wallet).methods;

  // prove on the person's device, then submit the bytes; returns the tx so it can be inspected or tampered.
  const prove = async (p: Person, call: { request: (o?: object) => Promise<any> }) => {
    const t = now();
    const proven = await p.wallet.prove(await call.request({ fee }), p.address, club);
    return { tx: await proven.toTx(), proveMs: Math.round(now() - t) };
  };
  const submit = async (tx: Tx) => {
    const t = now();
    await (node as any).sendTx(tx);
    const r: any = await waitForTx(node as never, tx.getTxHash(), { timeout: 120, interval: 0.25, dontThrowOnRevert: true } as never);
    return { result: String(r.executionResult), includedMs: Math.round(now() - t) };
  };
  // A device proves against the block it last saw. If the local sequencer re-builds that block (run 2: an L1 publish
  // failed and block 1 was checkpointed again), the node refuses the proof's anchor; the client syncs and proves again, once.
  const act = async (step: string, p: Person, call: any, again = true): Promise<Tx | undefined> => {
    try { const { tx, proveMs } = await prove(p, call); const s = await submit(tx); note(step, { by: p.name, ok: s.result === "success", proveMs, ...s }); return tx; }
    catch (e) {
      const refused = first(e);
      if (again && refused.includes("Block header not found")) { note(step, { by: p.name, ok: false, refused, then: "sync and prove again" }); await p.wallet.engine.sync(); return act(step, p, call, false); }
      note(step, { by: p.name, ok: false, refused }); return undefined;
    }
  };
  const footprint = async () => ((await at(treasurer).footprint().simulate({ from: treasurer.address })) as any).result;
  const proposal = async () => ((await at(treasurer).proposal(1n).simulate({ from: treasurer.address })) as any).result;
  const sync = async () => { for (const p of people) await p.wallet.engine.sync(); };
  // Does a member's address appear anywhere in the bytes the network sees?
  const names_in = (tx: Tx) => ({ named: [ana, ben, cy].filter((m) => tx.toBuffer().toString("hex").includes(m.address.toString().slice(2))).map((m) => m.name),
    feePayer: tx.data.feePayer.equals(fpc.address) ? "the sponsor" : people.find((p) => p.address.equals(tx.data.feePayer))?.name ?? "someone else" });

  await sync(); // a device proves against the block it last saw: before this, the treasurer's saw no club (run 1)
  // 1. Three people join, privately.
  if (phases.has("ballots")) for (const m of [ana, ben, cy]) { const tx = await act(`join ${m.name}`, treasurer, at(treasurer).join(m.address)); if (tx) note(`join ${m.name}: members named in its bytes`, names_in(tx)); }
  note("footprint after joins", { footprint: await footprint() });

  // 2. The budgets declaration: grant, spend, refusals, revoke.
  if (phases.has("budgets") || phases.has("tamper")) for (const [id, m] of (phases.has("budgets") ? [[1n, ana], [2n, ben], [3n, cy]] : [[1n, ana]]) as [bigint, Person][]) await act(`grant ${id} to ${m.name}`, treasurer, at(treasurer).grant(id, m.address, 100n));
  await sync();
  if (phases.has("budgets")) {
  const spendTx = await act("ana spends 20", ana, at(ana).spend(1n, 20n, shop.address));
  if (spendTx) note("ana's spend: members named in its bytes", names_in(spendTx));
  note("footprint after the spend", { footprint: await footprint() });
  await sync();
  note("ana reads her allowance", { get: ((await at(ana).get(1n).simulate({ from: ana.address, additionalScopes: [club] } as never)) as any).result });
  await act("ana spends 200 (over the limit)", ana, at(ana).spend(1n, 200n, shop.address));
  await act("ben spends from ana's allowance", ben, at(ben).spend(1n, 5n, shop.address));
  await act("outsider spends from ana's allowance", outsider, at(outsider).spend(1n, 5n, shop.address));
  await act("ana grants herself", ana, at(ana).grant(9n, ana.address, 1000n));
  await act("treasurer revokes ben's", treasurer, at(treasurer).revoke(2n));
  await sync();
  await act("ben spends after the revoke", ben, at(ben).spend(2n, 5n, shop.address));
  await act("cy spends all 100 (exhausted)", cy, at(cy).spend(3n, 100n, shop.address));
  await sync();
  await act("cy spends 1 more", cy, at(cy).spend(3n, 1n, shop.address));
  }

  // 3. A private ballot with a public tally.
  if (phases.has("ballots")) {
  await act("propose 500", treasurer, at(treasurer).propose(1n, 500n));
  await sync();
  for (const [m, c] of [[ana, true], [ben, true], [cy, false]] as const) { const tx = await act(`${m.name} casts`, m, at(m).cast(1n, c)); if (tx) note(`${m.name}'s ballot: members named in its bytes`, names_in(tx)); }
  await sync();
  await act("ben casts a second ballot", ben, at(ben).cast(1n, false));
  await act("outsider casts", outsider, at(outsider).cast(1n, true));
  await act("treasurer closes", treasurer, at(treasurer).close(1n));
  note("proposal after the close", { proposal: await proposal() });
  }

  // 4. Tampered proofs. One field of an honest proof is changed; the transaction is otherwise untouched.
  const withProof = (tx: Tx, chonkProof: ChonkProof) => Tx.from({ txHash: tx.txHash, data: tx.data, chonkProof, contractClassLogFields: tx.contractClassLogFields, publicFunctionCalldata: tx.publicFunctionCalldata });
  const tamper = (tx: Tx) => { const f = tx.chonkProof.fields.map((x) => x); f[300] = f[300]!.add(new Fr(1n)); return new ChonkProof(f); };
  await sync();
  if (phases.has("tamper")) for (const [label, p, call] of [["a tampered spend by ana", ana, at(ana).spend(1n, 5n, shop.address)], ["an empty proof on a spend by ana", ana, at(ana).spend(1n, 5n, shop.address)]] as const) {
    const before = await footprint();
    try {
      const { tx } = await prove(p, call);
      const bad = label.startsWith("an empty") ? withProof(tx, ChonkProof.empty()) : withProof(tx, tamper(tx));
      const s = await submit(bad); note(label, { accepted: true, ...s, footprintBefore: before, footprintAfter: await footprint() });
    } catch (e) { note(label, { accepted: false, refused: first(e), footprintBefore: before, footprintAfter: await footprint() }); }
  }
  note("final", { footprint: await footprint(), proposal: await proposal(), totalMs: Math.round(now() - t0) });
  for (const p of people) await p.wallet.stop();
} finally {
  await net.stop();
  // The node object lives in this process; what must be gone is its L1 (anvil) and the node's own loops.
  const l1Gone = await fetch(net.l1RpcUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }) }).then(() => false, () => true);
  note("world stopped", { l1Gone, l1: net.l1RpcUrl.replace(/:\/\/[^:]+/, "://host") });
  save(`club-${control ? "control" : "verified"}-${[...phases].join("-")}.json`, log);
}
process.exit(0);
