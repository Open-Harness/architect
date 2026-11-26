import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import { SafeAddress } from "../../index.ts";
import { OWNER_A, OWNER_B, VECTORS, expectedInitializer, keccak } from "../world/internal/testing.ts";

// The fixed vectors are in testing.ts, with where each comes from; world.test.ts checks each against the factory on Anvil.
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const lower = (owners: ReadonlyArray<string>) => owners.map((owner) => owner.toLowerCase() as `0x${string}`);

describe("the initializer, in the implementation's shape (infrastructure:P/safe-address.ts:114-141)", () => {
  test.each([["owner A", [OWNER_A]], ["owner B", [OWNER_B]], ["owners A and B", [OWNER_A, OWNER_B]], ["owners B and A", [OWNER_B, OWNER_A]]] as const)(
    "for %s it is setup(owners, 1, MultiSend, a delegatecall of enableModules([4337 module]) to SafeModuleSetup, 4337 module, no payment), byte for byte",
    (_name, owners) => run(Effect.gen(function* () {
      expect(yield* SafeAddress.initializer(owners)).toBe(yield* expectedInitializer(owners));
    })));

  test.each(VECTORS)("its keccak-256 for $name is the vector's", (vector) =>
    run(Effect.gen(function* () {
      expect(keccak(yield* SafeAddress.initializer(vector.owners))).toBe(vector.initializerHash);
    })));

  test("owners written in lower case give the same initializer", () =>
    run(Effect.gen(function* () {
      expect(yield* SafeAddress.initializer(lower([OWNER_A, OWNER_B]))).toBe(yield* expectedInitializer([OWNER_A, OWNER_B]));
    })));
});

describe("the salt, keccak256(encodePacked(keccak256(initializer), saltNonce))", () => {
  test.each(VECTORS)("for $name it is the vector's", (vector) =>
    run(Effect.gen(function* () {
      expect(SafeAddress.salt(yield* expectedInitializer(vector.owners), vector.saltNonce)).toBe(vector.salt);
    })));
});

describe("the predicted address, CREATE2 from the factory", () => {
  test.each(VECTORS)("for $name it is the vector's address, checksummed", (vector) =>
    run(Effect.gen(function* () {
      expect(yield* SafeAddress.predict({ owners: vector.owners, saltNonce: vector.saltNonce })).toBe(vector.address);
    })));

  test("owners written in lower case predict the same address", () =>
    run(Effect.gen(function* () {
      expect(yield* SafeAddress.predict({ owners: lower([OWNER_A, OWNER_B]), saltNonce: 3n })).toBe(VECTORS[4].address);
    })));

  test("the owners' order is part of the address", () =>
    run(Effect.gen(function* () {
      const reversed = yield* SafeAddress.predict({ owners: [OWNER_B, OWNER_A], saltNonce: 3n });
      expect(reversed).not.toBe(VECTORS[4].address);
      expect(reversed).toMatch(/^0x[0-9a-fA-F]{40}$/);
    })));
});
