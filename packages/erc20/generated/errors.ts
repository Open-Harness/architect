// Generated from abi.json. Do not edit.
import { Blueprint, Schema } from "orthograph";
import type { ErrorBinding } from "@orthograph/adapters-abi";

const Hex0x = Schema.TemplateLiteral(["0x", Schema.String]);

export class ERC20InsufficientAllowance extends Blueprint.error({
  spender: Blueprint.value(Hex0x),
  allowance: Blueprint.uint(256),
  needed: Blueprint.uint(256),
}, { exit: 100 }) {}

export class ERC20InsufficientBalance extends Blueprint.error({
  sender: Blueprint.value(Hex0x),
  balance: Blueprint.uint(256),
  needed: Blueprint.uint(256),
}, { exit: 101 }) {}

export class ERC20InvalidApprover extends Blueprint.error({
  approver: Blueprint.value(Hex0x),
}, { exit: 102 }) {}

export class ERC20InvalidReceiver extends Blueprint.error({
  receiver: Blueprint.value(Hex0x),
}, { exit: 103 }) {}

export class ERC20InvalidSender extends Blueprint.error({
  sender: Blueprint.value(Hex0x),
}, { exit: 104 }) {}

export class ERC20InvalidSpender extends Blueprint.error({
  spender: Blueprint.value(Hex0x),
}, { exit: 105 }) {}

export type DeclaredError =
  | ERC20InsufficientAllowance
  | ERC20InsufficientBalance
  | ERC20InvalidApprover
  | ERC20InvalidReceiver
  | ERC20InvalidSender
  | ERC20InvalidSpender;

export const bindings: ReadonlyArray<ErrorBinding<DeclaredError>> = [
  {
    code: "erc20.ERC20InsufficientAllowance",
    item: {
      "type": "error",
      "name": "ERC20InsufficientAllowance",
      "inputs": [
        {
          "name": "spender",
          "type": "address"
        },
        {
          "name": "allowance",
          "type": "uint256"
        },
        {
          "name": "needed",
          "type": "uint256"
        }
      ]
    },
    make: (fields) => new ERC20InsufficientAllowance(fields as ConstructorParameters<typeof ERC20InsufficientAllowance>[0]),
  },
  {
    code: "erc20.ERC20InsufficientBalance",
    item: {
      "type": "error",
      "name": "ERC20InsufficientBalance",
      "inputs": [
        {
          "name": "sender",
          "type": "address"
        },
        {
          "name": "balance",
          "type": "uint256"
        },
        {
          "name": "needed",
          "type": "uint256"
        }
      ]
    },
    make: (fields) => new ERC20InsufficientBalance(fields as ConstructorParameters<typeof ERC20InsufficientBalance>[0]),
  },
  {
    code: "erc20.ERC20InvalidApprover",
    item: {
      "type": "error",
      "name": "ERC20InvalidApprover",
      "inputs": [
        {
          "name": "approver",
          "type": "address"
        }
      ]
    },
    make: (fields) => new ERC20InvalidApprover(fields as ConstructorParameters<typeof ERC20InvalidApprover>[0]),
  },
  {
    code: "erc20.ERC20InvalidReceiver",
    item: {
      "type": "error",
      "name": "ERC20InvalidReceiver",
      "inputs": [
        {
          "name": "receiver",
          "type": "address"
        }
      ]
    },
    make: (fields) => new ERC20InvalidReceiver(fields as ConstructorParameters<typeof ERC20InvalidReceiver>[0]),
  },
  {
    code: "erc20.ERC20InvalidSender",
    item: {
      "type": "error",
      "name": "ERC20InvalidSender",
      "inputs": [
        {
          "name": "sender",
          "type": "address"
        }
      ]
    },
    make: (fields) => new ERC20InvalidSender(fields as ConstructorParameters<typeof ERC20InvalidSender>[0]),
  },
  {
    code: "erc20.ERC20InvalidSpender",
    item: {
      "type": "error",
      "name": "ERC20InvalidSpender",
      "inputs": [
        {
          "name": "spender",
          "type": "address"
        }
      ]
    },
    make: (fields) => new ERC20InvalidSpender(fields as ConstructorParameters<typeof ERC20InvalidSpender>[0]),
  },
];
