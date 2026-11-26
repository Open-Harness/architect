import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import { SafeAddress } from "../../index.ts";
import { expectedInitializer, keccak } from "../world/internal/testing.ts";

// The fixed vectors, worked out with the implementation's formula (infrastructure:P/safe-address.ts:205-206) from SafeProxy 1.4.1's
// creation code, the SafeL2 singleton and the factory at their canonical addresses. S1 (#1168) uses the first one.
const OWNER_A = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const OWNER_B = "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359";
const BIG_NONCE = 2n ** 255n + 7n;
const VECTORS = [
  { name: "owner A, salt nonce 0", firstOwner: OWNER_A, saltNonce: 0n, initializerHash: "0x69a9ff90d1b9b8a9389063c1c58f0b7334cfb9006504c00b1a6638f3875eca72",
    salt: "0x92ae05ccab3b6ae4d9ff58c3041f7969365bacdb4041714de7da3adbd87663aa", address: "0xC53486dfF84DDBcA04958BA4894F6e3b49879C58" },
  { name: "owner A, salt nonce 1", firstOwner: OWNER_A, saltNonce: 1n, initializerHash: "0x69a9ff90d1b9b8a9389063c1c58f0b7334cfb9006504c00b1a6638f3875eca72",
    salt: "0xfdba43d58d279cd4dd9f0e39f80f05edf3a19f2228bd16dd35bb5a7463c79833", address: "0xC9FB822eceD768758d387Ea131bF599398914036" },
  { name: "owner B, salt nonce 0", firstOwner: OWNER_B, saltNonce: 0n, initializerHash: "0x1659f7309b7281fd049058673e8ebddce1315e509657f92f99f589571c79aa08",
    salt: "0x471d9eacb1a1f8c2024eeb09795c2c94960fa6da6729416309c2129d911b8f4b", address: "0x7C124133727d664ee77A34589C438da47B0842df" },
  { name: "owner B, salt nonce 2^255 + 7", firstOwner: OWNER_B, saltNonce: BIG_NONCE, initializerHash: "0x1659f7309b7281fd049058673e8ebddce1315e509657f92f99f589571c79aa08",
    salt: "0x4cc7f35da9a75f9742a131cf161a1ffd9ed055ef8531c386d593fd854d847aab", address: "0x2C5F49C7Dd86BE818AeEE8cDc175e6c9b8855E5D" },
] as const;

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

describe("the initializer, the implementation's setup call (infrastructure:P/safe-address.ts:114-141)", () => {
  test.each([["owner A", OWNER_A], ["owner B", OWNER_B]] as const)("for %s it is setup([owner], 1, MultiSend, a delegatecall of enableModules([4337 module]) to SafeModuleSetup, 4337 module, no payment), byte for byte", (_name, owner) =>
    run(Effect.gen(function* () {
      expect(yield* SafeAddress.initializer(owner)).toBe(yield* expectedInitializer(owner));
    })));

  test.each(VECTORS.filter((vector) => vector.saltNonce === 0n))("its keccak-256 for $name is the vector's", (vector) =>
    run(Effect.gen(function* () {
      expect(keccak(yield* SafeAddress.initializer(vector.firstOwner))).toBe(vector.initializerHash);
    })));

  test("an owner written in lower case gives the same initializer", () =>
    run(Effect.gen(function* () {
      expect(yield* SafeAddress.initializer(OWNER_A.toLowerCase() as typeof OWNER_A)).toBe(yield* expectedInitializer(OWNER_A));
    })));
});

describe("the salt, keccak256(encodePacked(keccak256(initializer), saltNonce))", () => {
  test.each(VECTORS)("for $name it is the vector's", (vector) =>
    run(Effect.gen(function* () {
      expect(SafeAddress.salt(yield* expectedInitializer(vector.firstOwner), vector.saltNonce)).toBe(vector.salt);
    })));
});

describe("the predicted address, CREATE2 from the factory", () => {
  test.each(VECTORS)("for $name it is the vector's address, checksummed", (vector) =>
    run(Effect.gen(function* () {
      expect(yield* SafeAddress.predict({ firstOwner: vector.firstOwner, saltNonce: vector.saltNonce })).toBe(vector.address);
    })));

  test("an owner written in lower case predicts the same address", () =>
    run(Effect.gen(function* () {
      expect(yield* SafeAddress.predict({ firstOwner: OWNER_B.toLowerCase() as typeof OWNER_B, saltNonce: 0n })).toBe(VECTORS[2].address);
    })));
});
