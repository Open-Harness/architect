// Journey-author file: the fixed vectors the safe-* journeys' formula is held to (design/decisions/CX-safe.md, S1).
// Each address below is the canonical Safe 1.4.1 factory's own answer on Base Sepolia (84532), asked on 26 November 2026
// by an `eth_call` of `createProxyWithNonce(SafeL2, initializer, saltNonce)` from the zero address, with the MultiSend
// initializer confirmed on #1161. They were never worked out by the formula under test. The factory and singleton sit at
// the same addresses on every chain, so the address is the same in a world. Capxul's own namespace, not the earlier
// implementation's: byte-compatibility with its Safes is not a goal.
import { describe, expect, it } from "vitest";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { PROXY_CREATION_CODE, checksummed, initializer, predictAddress, saltNonceOf } from "../journeys/support/safe-address.ts";
import { SafeSettings } from "../blueprint/values/safe.ts";

const hexOf = (h: string) => Buffer.from(keccak_256(Uint8Array.from(h.slice(2).match(/../g)!.map((p) => parseInt(p, 16))))).toString("hex");

// A fixed signer for the vectors: Anvil's first development address. Only its address is used.
const SIGNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const PER_VECTOR = 62114682060923814785091377113321526740516919412137734678101002323959782223436n;

describe("a Safe's address, worked out the factory's way", () => {
  it("uses the canonical factory's own proxy creation code", () => {
    expect(hexOf(PROXY_CREATION_CODE)).toBe("1856e0ee08399d74e0ea0b03adca210aeade6f748969ac023cdcb4dd62dcaf5f");
  });

  it("keeps the local environment's salt namespace and chain where CX-safe puts them", () => {
    // blueprint/values is not protected from a builder, so this pins what the journeys' salt nonce is worked out from.
    expect(SafeSettings.local.namespace).toBe("capxul:local:safe:v1");
    expect(SafeSettings.local.chain).toBe("eip155:31337");
  });

  it("works the salt nonce out from the namespace and the person's id, never anything else", () => {
    expect(saltNonceOf("capxul:local:safe:v1", "per_vector")).toBe(PER_VECTOR);
    expect(saltNonceOf("capxul:staging:safe:v1", "per_vector")).not.toBe(PER_VECTOR);
    expect(saltNonceOf("capxul:local:safe:v1", "per_vectos")).not.toBe(PER_VECTOR);
  });

  it("checksums an address as EIP-55 does", () => {
    expect(checksummed(SIGNER.toLowerCase())).toBe(SIGNER);
    expect(checksummed("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed")).toBe("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed");
  });

  it("gives the address the factory gave for a Capxul person's Safe, claimed with a fixed signer", () => {
    expect(predictAddress(SIGNER, PER_VECTOR)).toBe("0x905C2DFeca0D4694e8D56fFE40216c7755CB21ea");
    expect(predictAddress(SIGNER, 0n)).toBe("0x56608B2093426D2348EFeCE7E3aD79AE8efEe829");
  });

  it("agrees with @orthograph/safe's own vector (A3, #1182 at 8eba668d), which the factory also gives", () => {
    const owner = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
    expect(hexOf(initializer(owner))).toBe("69a9ff90d1b9b8a9389063c1c58f0b7334cfb9006504c00b1a6638f3875eca72");
    expect(predictAddress(owner, 0n)).toBe("0xC53486dfF84DDBcA04958BA4894F6e3b49879C58");
    expect(predictAddress(owner, 1n)).toBe("0xC9FB822eceD768758d387Ea131bF599398914036");
  });

  it("gives another address for another signer, and for another salt nonce", () => {
    const other = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    expect(predictAddress(other, PER_VECTOR)).not.toBe(predictAddress(SIGNER, PER_VECTOR));
    expect(predictAddress(SIGNER, PER_VECTOR + 1n)).not.toBe(predictAddress(SIGNER, PER_VECTOR));
  });
});
