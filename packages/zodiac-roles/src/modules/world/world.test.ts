// #1163 (A4), the world starter's checks, on Anvil (gated as chain-evm's Anvil proofs are: ORTHO_CHAIN_EVM_ANVIL=1).
// The code hashes are a recording: the keccak-256 of the runtime code that Zodiac's own deployment leaves at each canonical
// address, replayed on Anvil on 26 November 2026 from the published creation code: the ERC-2470 singleton factory's
// presigned transaction, then ModuleProxyFactory with its salt (@gnosis-guild/zodiac-core 4.3.1), then Roles' libraries
// Integrity and Packer and the Roles 2.1.1 mastercopy (constructor (0x…01, 0x…01, 0x…01)), each with salt 0
// (zodiac-roles-sdk 4.2.0's typechain). Each landed at the canonical address, which is how the replay was checked.
import { Effect } from "effect";
import type { Address } from "@orthograph/chain-evm/device";
import { expect, test } from "vitest";
import { checksum, encode, fn, hex, keccak, word } from "../roles/internal/fixtures/evm.ts";
import { anvilGate as gate, modifierAbi, run, topicOf, world } from "../roles/internal/fixtures/world.ts";
import { ZodiacWorld } from "./service.ts";

const canonical = {
  factory: { address: "0x000000000000aDdB49795b0f9bA5BC298cDda236", code: "0x01623cbcf010a1c326230f1b2d5f48a66b440232ee49096102bc84967dc5f21e" },
  mastercopy: { address: "0xF2964CE6161ce0e75964Fe7927cE114cb0B283D5", code: "0x471d8b3b419f1eb955230c0326c8812176df49bf3c7b414a563fda5a3c6c10b6" },
  integrity: { address: "0x6a6Af4b16458Bc39817e4019fB02BD3b26d41049", code: "0xee8ec55ea4ac609a3fc768eccf3f0479631454fe0a802e4a4b8132102d10d495" },
  packer: { address: "0x869718C939652084BC491fBC5ce0D3C1d5B309F0", code: "0xc28f5fb0c8857669286d01e3df89f310d5ddfbf98205ad46d2f7d28767a76c82" },
} as const;
const installed = { factory: canonical.factory.address, mastercopy: canonical.mastercopy.address };

const chainOf = world.pipe(Effect.map((w) => ({
  ...w, codeHash: (address: Address) => w.codeOf(address).pipe(Effect.map((code) => (code === "0x" ? undefined : keccak(code)))),
})));

test.skipIf(gate)("install puts the factory and the Roles 2.1.1 mastercopy, with its libraries, at their canonical addresses with their canonical code", () =>
  run(Effect.gen(function* () {
    const w = yield* chainOf;
    for (const { address } of Object.values(canonical)) expect(yield* w.codeHash(address)).toBeUndefined();
    const before = yield* w.now;
    expect(yield* ZodiacWorld.install(w.anvil.rpcUrl)).toEqual(installed);
    for (const { address, code } of Object.values(canonical)) expect(yield* w.codeHash(address)).toBe(code);
    // The mastercopy as its constructor left it: owner, avatar and target 0x…01 (its storage, not only its code).
    const one = checksum("0x0000000000000000000000000000000000000001");
    const read = (item: typeof modifierAbi.owner) => w.read(canonical.mastercopy.address, item).pipe(Effect.map(([address]) => address));
    expect([yield* read(modifierAbi.owner), yield* read(modifierAbi.avatar), yield* read(modifierAbi.target)]).toEqual([one, one, one]);
    // The world's clock is left as it was: a few seconds of blocks, no jump.
    expect((yield* w.now) - before).toBeLessThan(60n);
  })), 30_000);

test.skipIf(gate)("a chain that has the factory but not Roles gets Roles, with its libraries", () =>
  run(Effect.gen(function* () {
    const source = yield* chainOf;
    yield* ZodiacWorld.install(source.anvil.rpcUrl);
    const factoryCode = yield* source.codeOf(canonical.factory.address);
    const w = yield* chainOf;
    yield* w.rpc("anvil_setCode", [canonical.factory.address, factoryCode]);
    expect(yield* ZodiacWorld.install(w.anvil.rpcUrl)).toEqual(installed);
    for (const { address, code } of Object.values(canonical)) expect(yield* w.codeHash(address)).toBe(code);
  })), 30_000);

test.skipIf(gate)("installing on a chain that already has them changes nothing", () =>
  run(Effect.gen(function* () {
    const w = yield* chainOf;
    yield* ZodiacWorld.install(w.anvil.rpcUrl);
    const block = yield* w.rpc("eth_blockNumber");
    expect(yield* ZodiacWorld.install(w.anvil.rpcUrl)).toEqual(installed);
    for (const { address, code } of Object.values(canonical)) expect(yield* w.codeHash(address)).toBe(code);
    expect(yield* w.rpc("eth_blockNumber")).toBe(block);
  })), 30_000);

test.skipIf(gate)("the installed factory deploys a working modifier from the installed mastercopy", () =>
  run(Effect.gen(function* () {
    const w = yield* chainOf;
    yield* ZodiacWorld.install(w.anvil.rpcUrl);
    const owner: Address = "0x0000000000000000000000000000000000000a01";
    const avatar: Address = "0x0000000000000000000000000000000000000a02";
    const target: Address = "0x0000000000000000000000000000000000000a03";
    const initializer = yield* encode(fn("setUp", [["bytes", "initParams"]]), [hex(word(BigInt(owner)), word(BigInt(avatar)), word(BigInt(target)))]);
    const deployModule = fn("deployModule", [["address"], ["bytes"], ["uint256"]], [["address"]]);
    const receipt = yield* w.send(w.deployer, { to: canonical.factory.address, data: yield* encode(deployModule, [canonical.mastercopy.address, initializer, 7n]) });
    const created = receipt.logs.find((log) => log.address.toLowerCase() === canonical.factory.address.toLowerCase() && log.topics[0] === topicOf("ModuleProxyCreation(address,address)"));
    const [proxyTopic, mastercopyTopic] = [created?.topics[1], created?.topics[2]];
    if (proxyTopic === undefined) return yield* Effect.fail(new Error("No ModuleProxyCreation"));
    expect(mastercopyTopic).toBe(hex(word(BigInt(canonical.mastercopy.address))));
    const proxy = checksum(`0x${proxyTopic.slice(26)}`);
    const read = (item: typeof modifierAbi.owner) => w.read(proxy, item).pipe(Effect.map(([address]) => address));
    expect([yield* read(modifierAbi.owner), yield* read(modifierAbi.avatar), yield* read(modifierAbi.target)]).toEqual([owner, avatar, target].map(checksum));
  })), 30_000);
