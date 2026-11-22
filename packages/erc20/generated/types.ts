// Generated from abi.json. Do not edit.
import type { Address } from "@orthograph/chain-evm/device";

export interface AllowanceArgs {
  readonly owner: Address;
  readonly spender: Address;
}
export type AllowanceAnswer = bigint;
export interface ApproveArgs {
  readonly spender: Address;
  readonly value: bigint;
}
export type ApproveAnswer = boolean;
export interface BalanceOfArgs {
  readonly account: Address;
}
export type BalanceOfAnswer = bigint;
export type DecimalsAnswer = bigint;
export type NameAnswer = string;
export type SymbolAnswer = string;
export type TotalSupplyAnswer = bigint;
export interface TransferArgs {
  readonly to: Address;
  readonly value: bigint;
}
export type TransferAnswer = boolean;
export interface TransferFromArgs {
  readonly from: Address;
  readonly to: Address;
  readonly value: bigint;
}
export type TransferFromAnswer = boolean;
export interface ApprovalEventArgs {
  readonly owner: Address;
  readonly spender: Address;
  readonly value: bigint;
}
export interface TransferEventArgs {
  readonly from: Address;
  readonly to: Address;
  readonly value: bigint;
}
export interface ERC20InsufficientAllowanceFields {
  readonly spender: Address;
  readonly allowance: bigint;
  readonly needed: bigint;
}
export interface ERC20InsufficientBalanceFields {
  readonly sender: Address;
  readonly balance: bigint;
  readonly needed: bigint;
}
export interface ERC20InvalidApproverFields {
  readonly approver: Address;
}
export interface ERC20InvalidReceiverFields {
  readonly receiver: Address;
}
export interface ERC20InvalidSenderFields {
  readonly sender: Address;
}
export interface ERC20InvalidSpenderFields {
  readonly spender: Address;
}
