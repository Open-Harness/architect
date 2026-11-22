// The stand-in's deployment into a world's chain, on Anvil (ST2-abi-adapters section 7). Gated: ORTHO_CHAIN_EVM_ANVIL=1.
import { Effect, type Scope } from "effect";
import { describe, expect, it } from "vitest";
import { anvilOn, bindings, fn, tokenBytecode } from "../../../test/support.ts";
import { Contract } from "../contract/service.ts";
import { ContractChain } from "../contract/types.ts";
import { startWorld } from "../../testing.ts";
import { StandInContract } from "./service.ts";

const anvil = it.skipIf(!anvilOn);
const timeout = 60_000;
const run = <A, E>(body: Effect.Effect<A, E, Scope.Scope>) => Effect.runPromise(Effect.scoped(body));

describe("StandInContract.deploy, on Anvil", () => {
  anvil("deploys the bytecode, answers the contract's address, and the contract answers there", () =>
    run(Effect.gen(function* () {
      const world = yield* startWorld;
      const [deployer] = world.keys;
      if (deployer === undefined) return yield* Effect.die("no key");
      const port = yield* world.port();
      const address = yield* StandInContract.deploy({ port, signer: deployer.signer, bytecode: tokenBytecode });
      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      // The deployer is the constructor's msg.sender: it holds the supply.
      const held = yield* Contract.read(fn("balanceOf"), { account: deployer.address }, bindings).pipe(
        Effect.provideService(ContractChain, { port, address }),
      );
      expect(held).toBe(1_000_000n * 10n ** 18n);
    })), timeout);

  anvil("deploys twice to two different addresses", () =>
    run(Effect.gen(function* () {
      const world = yield* startWorld;
      const [deployer] = world.keys;
      if (deployer === undefined) return yield* Effect.die("no key");
      const port = yield* world.port();
      const first = yield* StandInContract.deploy({ port, signer: deployer.signer, bytecode: tokenBytecode });
      const second = yield* StandInContract.deploy({ port, signer: deployer.signer, bytecode: tokenBytecode });
      expect(second).not.toBe(first);
    })), timeout);

  anvil("a deployment that reverts fails, and no address is answered", () =>
    run(Effect.gen(function* () {
      const world = yield* startWorld;
      const [deployer] = world.keys;
      if (deployer === undefined) return yield* Effect.die("no key");
      const nonce = yield* world.nonceOf(deployer);
      // PUSH1 0 PUSH1 0 REVERT: creation code that reverts with no data.
      const failure = yield* Effect.flip(StandInContract.deploy({ port: yield* world.port(), signer: deployer.signer, bytecode: "0x60006000fd" }));
      expect(failure).toMatchObject({ _tag: "ChainFault", kind: "revert" });
      expect(yield* world.nonceOf(deployer)).toBe(nonce);
    })), timeout);
});
