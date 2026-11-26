import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import { Keys, type Hex } from "@orthograph/chain-evm/device";
import { SafeAddress, SafeWorld } from "../../index.ts";
import { ABI, CANON, codeAt, deploySafe, balanceOf, freshOwner, keccak, read, rpc, txCount, withWorld } from "./internal/testing.ts";

// Needs Foundry's Anvil on PATH, as CI's check-static has it. Expected code hashes: @safe-global/safe-deployments 1.37.67 (canonical);
// SafeModuleSetup's runtime from @safe-global/safe-4337 0.3.0 (it has no immutables); the 4337 module bound to EntryPoint v0.7.
const CODE_HASHES = [
  ["SafeProxyFactory", CANON.proxyFactory, "0x50c3cdc4074750a7a974204a716c999edd37482f907608d960b2b025ee0b3317"],
  ["SafeL2", CANON.singleton, "0xb1f926978a0f44a2c0ec8fe822418ae969bd8c3f18d61e5103100339894f81ff"],
  ["MultiSend", CANON.multiSend, "0x0e4f7fc66550a322d1e7688e181b75e217e662a4f3f4d6a29b22bc61217c4b77"],
  ["MultiSendCallOnly", CANON.multiSendCallOnly, "0xecd5bd14a08c5d2122379900b2f272bdf107a7e92423c10dd5fe3254386c9939"],
  ["SafeModuleSetup", CANON.moduleSetup, "0xaf2d170bb766d2773c3fa88717f5b3599827478074d3767d1dee55e5c2f3fbcb"],
  // Safe4337Module 0.3.0's creation code (@safe-global/safe-4337 0.3.0) run with EntryPoint v0.7: its one immutable.
  ["Safe4337Module", CANON.safe4337Module, "0x2aea997c4e3cf0e2f333025372e219abcfde81c21fc2f8fb066414a5685dd3e0"],
] as const;
const TIMEOUT = { timeout: 60_000 };

describe("SafeWorld.install, the world starter", () => {
  test("puts each contract's pinned code at its canonical address, with the canonical code hash", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      for (const [, address] of CODE_HASHES) expect(yield* codeAt(world.rpcUrl, address)).toBe("0x");
      yield* SafeWorld.install(world.rpcUrl);
      const hashes = yield* Effect.forEach(CODE_HASHES, ([name, address]) =>
        codeAt(world.rpcUrl, address).pipe(Effect.map((code) => [name, keccak(code)] as const)));
      expect(hashes).toStrictEqual(CODE_HASHES.map(([name, , hash]) => [name, hash]));
    })));

  test("puts the 4337 module at its address, bound to EntryPoint v0.7", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      yield* SafeWorld.install(world.rpcUrl);
      expect(yield* codeAt(world.rpcUrl, CANON.safe4337Module)).not.toBe("0x");
      const [entryPoint] = yield* read(world.port, world.keys[1]!.address, CANON.safe4337Module, ABI.SUPPORTED_ENTRYPOINT);
      expect(entryPoint).toBe(CANON.entryPoint);
    })));

  test("leaves the EntryPoint's address empty, and the world's own accounts as they were", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      const standing = Effect.forEach(world.keys, (key) => Effect.all([balanceOf(world.rpcUrl, key.address), txCount(world.rpcUrl, key.address)]));
      const before = yield* standing;
      yield* SafeWorld.install(world.rpcUrl);
      expect(yield* codeAt(world.rpcUrl, CANON.entryPoint)).toBe("0x");
      expect(yield* standing).toStrictEqual(before);
    })));

  test("a chain that does not answer is a ChainFault, not a defect", TIMEOUT, () =>
    Effect.runPromise(SafeWorld.install("http://127.0.0.1:9").pipe(Effect.flip))
      .then((error) => expect(error).toMatchObject({ _tag: "ChainFault" })));

  test("the factory's proxy creation code is SafeProxy 1.4.1's", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      yield* SafeWorld.install(world.rpcUrl);
      const [code] = yield* read(world.port, world.keys[1]!.address, CANON.proxyFactory, ABI.proxyCreationCode);
      expect(keccak(code as Hex)).toBe("0x1856e0ee08399d74e0ea0b03adca210aeade6f748969ac023cdcb4dd62dcaf5f");
    })));

  test("running it twice changes nothing and fails nothing", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      yield* SafeWorld.install(world.rpcUrl);
      const first = yield* Effect.forEach(CODE_HASHES, ([, address]) => codeAt(world.rpcUrl, address));
      yield* SafeWorld.install(world.rpcUrl);
      expect(yield* Effect.forEach(CODE_HASHES, ([, address]) => codeAt(world.rpcUrl, address))).toStrictEqual(first);
    })));
});

describe("on an installed world, the factory deploys where the prediction says", () => {
  test("the fixed vector: owner 0x5aAe…eAed with salt nonce 0 is deployed at 0xC534…9C58, as predicted", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      yield* SafeWorld.install(world.rpcUrl);
      const owner = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
      const predicted = yield* SafeAddress.predict({ firstOwner: owner, saltNonce: 0n });
      expect(predicted).toBe("0xC53486dfF84DDBcA04958BA4894F6e3b49879C58");
      expect(yield* deploySafe(world, owner, 0n)).toBe(predicted);
    })));

  test("a fresh owner and a large salt nonce are deployed at the predicted address", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      yield* SafeWorld.install(world.rpcUrl);
      const { key } = yield* freshOwner;
      const saltNonce = 2n ** 200n + 12345n;
      const predicted = yield* SafeAddress.predict({ firstOwner: key.address, saltNonce });
      expect(yield* codeAt(world.rpcUrl, predicted)).toBe("0x");
      expect(yield* deploySafe(world, key.address, saltNonce)).toBe(predicted);
      expect(yield* codeAt(world.rpcUrl, predicted)).not.toBe("0x");
    })));

  test("the deployed Safe is 1.4.1, owned by its first owner alone at threshold 1, with the 4337 module enabled and as fallback handler", TIMEOUT, () =>
    withWorld((world) => Effect.gen(function* () {
      yield* SafeWorld.install(world.rpcUrl);
      const { key } = yield* freshOwner;
      const safe = yield* deploySafe(world, key.address, 7n);
      const from = world.keys[1]!.address;
      expect(yield* read(world.port, from, safe, ABI.VERSION)).toStrictEqual(["1.4.1"]);
      expect(yield* read(world.port, from, safe, ABI.getOwners)).toStrictEqual([[key.address]]);
      expect(yield* read(world.port, from, safe, ABI.getThreshold)).toStrictEqual([1n]);
      expect(yield* read(world.port, from, safe, ABI.nonce)).toStrictEqual([0n]);
      expect(yield* read(world.port, from, safe, ABI.isModuleEnabled, [CANON.safe4337Module])).toStrictEqual([true]);
      // keccak256("fallback_manager.handler.address"), Safe 1.4.1's FallbackManager slot.
      const slot = yield* rpc<Hex>(world.rpcUrl, "eth_getStorageAt", [safe, "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5", "latest"]);
      expect(Keys.checksum(`0x${slot.slice(26)}`)).toBe(CANON.safe4337Module);
    })));
});
