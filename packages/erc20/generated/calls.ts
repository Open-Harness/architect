// Generated from abi.json. Do not edit.
import type { Effect } from "effect";
import { Contract } from "@orthograph/adapters-abi";
import type { AbiFunctionItem, ContractChain } from "@orthograph/adapters-abi";
import type { ChainFault, Submission } from "@orthograph/chain-evm/device";
import { bindings, type DeclaredError } from "./errors.ts";
import type { AllowanceArgs, AllowanceAnswer, ApproveArgs, ApproveAnswer, BalanceOfArgs, BalanceOfAnswer, DecimalsAnswer, NameAnswer, SymbolAnswer, TotalSupplyAnswer, TransferArgs, TransferAnswer, TransferFromArgs, TransferFromAnswer } from "./types.ts";

export type Failure = DeclaredError | ChainFault;

const allowanceItem: AbiFunctionItem = {
  "type": "function",
  "name": "allowance",
  "inputs": [
    {
      "name": "owner",
      "type": "address"
    },
    {
      "name": "spender",
      "type": "address"
    }
  ],
  "outputs": [
    {
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view"
};
export const allowance = (args: AllowanceArgs): Effect.Effect<AllowanceAnswer, Failure, ContractChain> =>
  Contract.read<AllowanceAnswer, DeclaredError>(allowanceItem, args, bindings);

const approveItem: AbiFunctionItem = {
  "type": "function",
  "name": "approve",
  "inputs": [
    {
      "name": "spender",
      "type": "address"
    },
    {
      "name": "value",
      "type": "uint256"
    }
  ],
  "outputs": [
    {
      "name": "",
      "type": "bool"
    }
  ],
  "stateMutability": "nonpayable"
};
export const approve = (args: ApproveArgs): Effect.Effect<Submission, Failure, ContractChain> =>
  Contract.write(approveItem, args, bindings);

const balanceOfItem: AbiFunctionItem = {
  "type": "function",
  "name": "balanceOf",
  "inputs": [
    {
      "name": "account",
      "type": "address"
    }
  ],
  "outputs": [
    {
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view"
};
export const balanceOf = (args: BalanceOfArgs): Effect.Effect<BalanceOfAnswer, Failure, ContractChain> =>
  Contract.read<BalanceOfAnswer, DeclaredError>(balanceOfItem, args, bindings);

const decimalsItem: AbiFunctionItem = {
  "type": "function",
  "name": "decimals",
  "inputs": [],
  "outputs": [
    {
      "name": "",
      "type": "uint8"
    }
  ],
  "stateMutability": "view"
};
export const decimals = (): Effect.Effect<DecimalsAnswer, Failure, ContractChain> =>
  Contract.read<DecimalsAnswer, DeclaredError>(decimalsItem, {}, bindings);

const nameItem: AbiFunctionItem = {
  "type": "function",
  "name": "name",
  "inputs": [],
  "outputs": [
    {
      "name": "",
      "type": "string"
    }
  ],
  "stateMutability": "view"
};
export const name = (): Effect.Effect<NameAnswer, Failure, ContractChain> =>
  Contract.read<NameAnswer, DeclaredError>(nameItem, {}, bindings);

const symbolItem: AbiFunctionItem = {
  "type": "function",
  "name": "symbol",
  "inputs": [],
  "outputs": [
    {
      "name": "",
      "type": "string"
    }
  ],
  "stateMutability": "view"
};
export const symbol = (): Effect.Effect<SymbolAnswer, Failure, ContractChain> =>
  Contract.read<SymbolAnswer, DeclaredError>(symbolItem, {}, bindings);

const totalSupplyItem: AbiFunctionItem = {
  "type": "function",
  "name": "totalSupply",
  "inputs": [],
  "outputs": [
    {
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view"
};
export const totalSupply = (): Effect.Effect<TotalSupplyAnswer, Failure, ContractChain> =>
  Contract.read<TotalSupplyAnswer, DeclaredError>(totalSupplyItem, {}, bindings);

const transferItem: AbiFunctionItem = {
  "type": "function",
  "name": "transfer",
  "inputs": [
    {
      "name": "to",
      "type": "address"
    },
    {
      "name": "value",
      "type": "uint256"
    }
  ],
  "outputs": [
    {
      "name": "",
      "type": "bool"
    }
  ],
  "stateMutability": "nonpayable"
};
export const transfer = (args: TransferArgs): Effect.Effect<Submission, Failure, ContractChain> =>
  Contract.write(transferItem, args, bindings);

const transferFromItem: AbiFunctionItem = {
  "type": "function",
  "name": "transferFrom",
  "inputs": [
    {
      "name": "from",
      "type": "address"
    },
    {
      "name": "to",
      "type": "address"
    },
    {
      "name": "value",
      "type": "uint256"
    }
  ],
  "outputs": [
    {
      "name": "",
      "type": "bool"
    }
  ],
  "stateMutability": "nonpayable"
};
export const transferFrom = (args: TransferFromArgs): Effect.Effect<Submission, Failure, ContractChain> =>
  Contract.write(transferFromItem, args, bindings);
