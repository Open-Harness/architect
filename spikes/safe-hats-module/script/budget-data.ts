import type { Address } from "viem"

export function budgetSpendData(chainId: number, verifyingContract: Address, message: {
  safe: Address; hatId: bigint; to: Address; amount: bigint; signer: Address; nonce: bigint; deadline: bigint;
}) {
  return {
    domain: { name: "Budgets", version: "1", chainId, verifyingContract },
    types: { BudgetSpend: [
      { name: "safe", type: "address" },
      { name: "hatId", type: "uint256" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint128" },
      { name: "signer", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ] },
    primaryType: "BudgetSpend",
    message,
  } as const
}

const maxUint128 = (1n << 128n) - 1n

export function parseBaseUnits(wire: unknown): bigint {
  if (typeof wire !== "string" || wire.length > 39 || !/^(0|[1-9][0-9]*)$/.test(wire)) {
    throw new TypeError("Expected a canonical unsigned base-unit string")
  }
  const amount = BigInt(wire)
  if (amount > maxUint128) throw new RangeError("Base units exceed uint128")
  return amount
}
