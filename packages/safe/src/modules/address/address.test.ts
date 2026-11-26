import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import { NoOwners, OwnersNotUnique, SafeAddress } from "../../index.ts";
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

  // Owners B then A, salt nonce 3: confirmed by the factory on Anvil (world.test.ts) and on Base Sepolia, 26 November 2026.
  test("the owners' order is part of the address: owners B then A at salt nonce 3 are 0xe3E5…dC64", () =>
    run(Effect.gen(function* () {
      expect(yield* SafeAddress.predict({ owners: [OWNER_B, OWNER_A], saltNonce: 3n })).toBe("0xe3E50206CC79c6232F3F6C2F84eD3D38Cf5ddC64");
    })));
});

describe("owners no Safe could be set up with are refused, typed", () => {
  const refused = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

  test("no owners at all is NoOwners, for the initializer and the prediction", () =>
    Promise.all([refused(SafeAddress.initializer([])), refused(SafeAddress.predict({ owners: [], saltNonce: 0n }))])
      .then(([initializer, predicted]) => {
        expect(initializer).toStrictEqual(new NoOwners());
        expect(predicted).toStrictEqual(new NoOwners());
      }));

  test("an owner given twice is OwnersNotUnique naming it, for the initializer and the prediction", () =>
    Promise.all([
      refused(SafeAddress.initializer([OWNER_A, OWNER_B, OWNER_A])),
      refused(SafeAddress.predict({ owners: [OWNER_A, OWNER_B, OWNER_B], saltNonce: 3n })),
    ]).then(([initializer, predicted]) => {
      expect(initializer).toStrictEqual(new OwnersNotUnique({ owner: OWNER_A }));
      expect(predicted).toStrictEqual(new OwnersNotUnique({ owner: OWNER_B }));
    }));

  test("the same owner in another case is still the same owner", () =>
    refused(SafeAddress.predict({ owners: [OWNER_A, OWNER_A.toLowerCase() as typeof OWNER_A], saltNonce: 0n }))
      .then((error) => expect(error).toStrictEqual(new OwnersNotUnique({ owner: OWNER_A }))));
});
