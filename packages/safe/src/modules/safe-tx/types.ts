import type { Address, Hex } from "@orthograph/chain-evm/device";

/** 0 is a call, 1 a delegatecall. */
export type SafeOperation = 0 | 1;

/** One Safe transaction, the fields of the `SafeTx` EIP-712 message in its order. The nonce is the Safe's, in the message. */
export interface SafeTransaction {
  readonly to: Address;
  readonly value: bigint;
  readonly data: Hex;
  readonly operation: SafeOperation;
  readonly safeTxGas: bigint;
  readonly baseGas: bigint;
  readonly gasPrice: bigint;
  readonly gasToken: Address;
  readonly refundReceiver: Address;
  readonly nonce: bigint;
}

export interface SafeTxField {
  readonly name: string;
  readonly type: string;
}

/** The typed data an owner signs. Safe 1.4.1's domain is the chain id and the Safe's address and nothing else. */
export interface SafeTxTypedData {
  readonly domain: { readonly chainId: number; readonly verifyingContract: Address };
  readonly types: { readonly SafeTx: ReadonlyArray<SafeTxField> };
  readonly primaryType: "SafeTx";
  readonly message: SafeTransaction;
}

export interface SafeCallInput {
  readonly to: Address;
  readonly data: Hex;
  readonly nonce: bigint;
  /** Default 0. */
  readonly value?: bigint;
  /** Default 0, a call. */
  readonly operation?: SafeOperation;
}

export interface SafeTxApi {
  /** A Safe transaction that pays nobody for gas: `safeTxGas`, `baseGas` and `gasPrice` 0, `gasToken` and `refundReceiver` the zero address. */
  readonly call: (input: SafeCallInput) => SafeTransaction;
  readonly typedData: (chainId: number, safe: Address, tx: SafeTransaction) => SafeTxTypedData;
  /** The EIP-712 digest of that typed data: what the Safe's `getTransactionHash` returns for the same transaction and nonce. */
  readonly digest: (chainId: number, safe: Address, tx: SafeTransaction) => Hex;
}
