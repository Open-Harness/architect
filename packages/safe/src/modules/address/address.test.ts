import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import { SafeAddress } from "../../main.ts";
import { expectedInitializer, keccak } from "../world/internal/testing.ts";

// The fixed vectors, worked out with the implementation's formula (infrastructure:P/safe-address.ts:205-206) from SafeProxy 1.4.1's
// creation code, the SafeL2 singleton and the factory at their canonical addresses. S1 (#1168) uses the first one.
const OWNER_A = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const OWNER_B = "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359";
const BIG_NONCE = 2n ** 255n + 7n;
const VECTORS = [
  { name: "owner A, salt nonce 0", firstOwner: OWNER_A, saltNonce: 0n, initializerHash: "0x2f1fd6d9e6a82b264a7f081fc81baddb2d1f74b5a977dfc77e996d73d21fe90e",
    salt: "0xd358e155721a7c8837de787b541ab2c9f7367f762bb7706f13b8d7b3fe55ad2a", address: "0x925d0B0F1AE3B4Be9C3A831100b6bdF711dB4Bc9" },
  { name: "owner A, salt nonce 1", firstOwner: OWNER_A, saltNonce: 1n, initializerHash: "0x2f1fd6d9e6a82b264a7f081fc81baddb2d1f74b5a977dfc77e996d73d21fe90e",
    salt: "0xcd25400035c5ce2896ab6cfb8badb61726c42c7204ea8460c9d19a284e331435", address: "0x8fC4AF618430430a01522137f6d0b5930446c39B" },
  { name: "owner B, salt nonce 0", firstOwner: OWNER_B, saltNonce: 0n, initializerHash: "0x8d389559e0264c7858ff0085471b5bb3f78ab8ca9503e9001f46f40ba6636efb",
    salt: "0x797ca9e7eefdd972a48abdb55fce264bd30655d318c57829559915a10491fc52", address: "0x926482C8d5Da7f75a90c6B03EB4a2f4d4F3dcC54" },
  { name: "owner B, salt nonce 2^255 + 7", firstOwner: OWNER_B, saltNonce: BIG_NONCE, initializerHash: "0x8d389559e0264c7858ff0085471b5bb3f78ab8ca9503e9001f46f40ba6636efb",
    salt: "0x25349e98d2fb97174f1801645cd8562c427ca6f3859f38f168fec58c2b83f44a", address: "0x6225Baa84bdB934A65eAcCf184A07B07803C0291" },
] as const;

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

describe("the initializer, the implementation's setup call (infrastructure:P/organization-safe.ts:44-71)", () => {
  test.each([["owner A", OWNER_A], ["owner B", OWNER_B]] as const)("for %s it is setup([owner], 1, SafeModuleSetup, enableModules([4337 module]), 4337 module, no payment), byte for byte", (_name, owner) =>
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
