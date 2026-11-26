// Journey-author file: the fixed vectors the safe-* journeys' formula is held to (design/decisions/CX-safe.md, S1).
// Each address below is the canonical Safe 1.4.1 factory's own answer on Base Sepolia (84532), asked on 26 November 2026
// by an `eth_call` of `createProxyWithNonce(SafeL2, initializer, saltNonce)` from the zero address, never worked out by
// the formula under test. The second was already deployed there, so the factory refused it ("Create2 call failed") and
// the address was read back as a Safe proxy's code instead. The factory and singleton sit at the same addresses on every
// chain, so the address is the same in a world.
import { describe, expect, it } from "vitest";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { PROXY_CREATION_CODE, initializer, localBootstrap, predictAddress, saltNonceOf } from "../journeys/support/safe-address.ts";

const BOOTSTRAP = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

describe("a Safe's address, worked out the factory's way", () => {
  it("uses the canonical factory's own proxy creation code", () => {
    const bytes = Uint8Array.from(PROXY_CREATION_CODE.slice(2).match(/../g)!.map((p) => parseInt(p, 16)));
    expect(Buffer.from(keccak_256(bytes)).toString("hex")).toBe("1856e0ee08399d74e0ea0b03adca210aeade6f748969ac023cdcb4dd62dcaf5f");
  });

  it("works the salt nonce out from the namespace and the id, never anything else", () => {
    expect(saltNonceOf("capxul:local:safe:v1", "per_vector")).toBe(62114682060923814785091377113321526740516919412137734678101002323959782223436n);
    expect(saltNonceOf("capxul:local:safe:v1", "com_vector")).toBe(115712346795680899109204144877386049442716400241719637210056809986168374456913n);
    expect(saltNonceOf("capxul:staging:safe:v1", "per_vector")).not.toBe(saltNonceOf("capxul:local:safe:v1", "per_vector"));
  });

  it("sets up one owner, threshold 1, with the 4337 module on and no payment", () => {
    // The selector of setup(address[],uint256,address,bytes,address,address,uint256,address), then the owner and 1.
    const init = initializer(BOOTSTRAP);
    expect(init.slice(0, 10)).toBe("0xb63e800d");
    expect(init).toContain(BOOTSTRAP.slice(2).toLowerCase());
    expect(init).toContain("8d0dc49f"); // enableModules(address[])
  });

  it("gives the address the factory gave for a person's Safe, owned by the bootstrap key", () => {
    expect(predictAddress(BOOTSTRAP, 62114682060923814785091377113321526740516919412137734678101002323959782223436n)).toBe(
      "0x0c8E392a12f1dE39D98a724feA2C9f8909ceE8AA",
    );
    expect(predictAddress(BOOTSTRAP, 0n)).toBe("0xFD8A78aE7924A1097C048672da0C131dC5e68C01");
  });

  it("gives the address the factory gave for a company's Safe, owned by that person's Safe", () => {
    expect(predictAddress("0x0c8E392a12f1dE39D98a724feA2C9f8909ceE8AA", 115712346795680899109204144877386049442716400241719637210056809986168374456913n)).toBe(
      "0xC992482ab760d731e7f0A5d3e0436800123EDdf1",
    );
  });

  it("names the local bootstrap key's address on the local chain", () => {
    expect(localBootstrap).toBe(`eip155:31337:${BOOTSTRAP}`);
  });
});
