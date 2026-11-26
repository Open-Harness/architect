import { describe, expect, test } from "vitest";
import { SafeTx, type SafeTransaction } from "../../main.ts";
import { ZERO } from "../world/internal/testing.ts";

// Expected digests: viem 2.57.20's hashTypedData over Safe 1.4.1's SafeTx type and domain (spikes/safe-hats-module/script/safe.ts:57-76),
// worked out once and written here. client.test.ts checks the same digest against a live Safe's getTransactionHash.
const SAFE = "0x925d0B0F1AE3B4Be9C3A831100b6bdF711dB4Bc9";
const OTHER_SAFE = "0x8fC4AF618430430a01522137f6d0b5930446c39B";
const TO = "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359";
const BASE: SafeTransaction = {
  to: TO, value: 1n, data: "0xdeadbeef", operation: 0, safeTxGas: 0n, baseGas: 0n, gasPrice: 0n, gasToken: ZERO, refundReceiver: ZERO, nonce: 3n,
};
const SAFE_TX_TYPE = [
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "data", type: "bytes" },
  { name: "operation", type: "uint8" },
  { name: "safeTxGas", type: "uint256" },
  { name: "baseGas", type: "uint256" },
  { name: "gasPrice", type: "uint256" },
  { name: "gasToken", type: "address" },
  { name: "refundReceiver", type: "address" },
  { name: "nonce", type: "uint256" },
];

describe("SafeTx.call, a transaction that pays nobody for gas", () => {
  test("fills value and operation with 0, and every gas and refund field with 0 or the zero address", () => {
    expect(SafeTx.call({ to: TO, data: "0xdeadbeef", nonce: 3n })).toStrictEqual({ ...BASE, value: 0n });
  });

  test("keeps the value and operation it is given, and the nonce as given", () => {
    expect(SafeTx.call({ to: TO, data: "0xdeadbeef", nonce: 9n, value: 5n, operation: 1 }))
      .toStrictEqual({ ...BASE, value: 5n, operation: 1, nonce: 9n });
  });
});

describe("SafeTx.typedData", () => {
  test("is the SafeTx type, a domain of the chain id and the Safe alone, and the nonce in the message", () => {
    expect(SafeTx.typedData(84532, SAFE, BASE)).toStrictEqual({
      domain: { chainId: 84532, verifyingContract: SAFE },
      types: { SafeTx: SAFE_TX_TYPE },
      primaryType: "SafeTx",
      message: BASE,
    });
  });
});

describe("SafeTx.digest, the EIP-712 hash a Safe's getTransactionHash returns", () => {
  test.each([
    ["the base transaction on Base Sepolia", 84532, SAFE, BASE, "0x5cd5251c6e0f42960a28b7146741d0860da6948bb0b2f59576a144736387504f"],
    ["another chain id", 31337, SAFE, BASE, "0x0bdab873cc9bf5707bf3f25a297fff08ec3074a43216c79b7f11f77398617432"],
    ["another Safe", 84532, OTHER_SAFE, BASE, "0x03b2a9795497247c792d0056014d3535fdee6780e7d00efff6bac4fec59afa6c"],
    ["the next nonce", 84532, SAFE, { ...BASE, nonce: 4n }, "0x20666d458137b65ef430383926889668c784cd1780f3c03780ed05d1bb3ea6f0"],
    ["a delegatecall", 84532, SAFE, { ...BASE, operation: 1 }, "0xb539730be66b7bfca086c44f97028e76038ed0cd9700809b63b3ed1a49b8c23c"],
    ["every gas and refund field set", 84532, SAFE, {
      ...BASE, safeTxGas: 5n, baseGas: 6n, gasPrice: 7n, gasToken: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed", refundReceiver: OTHER_SAFE,
    }, "0x5e9368cb3ae3b44dde5d4386ebd5d7603e2f7a8c4708e739f7c9b36a8cf98a52"],
    ["empty data", 84532, SAFE, { ...BASE, data: "0x" }, "0x722daa1915a58ead1a492e4a9ce1e618d4adeb006ab045145b1020952664ae2f"],
  ] as const)("for %s", (_name, chainId, safe, tx, digest) => {
    expect(SafeTx.digest(chainId, safe, tx)).toBe(digest);
  });
});
