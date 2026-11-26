// Generated from abi/ERC20.json. Do not edit.
// Hand-written to the shape `ortho new adapter --from-abi` makes (packages/generators/src/modules/abi/README.md, #1164) until
// A1 lands and regenerates it. Until the build of #1162, the calls, the event sources and `deploy` are empty handlers.
import { Data, Effect } from "effect";
import type {
  AbiDocument, Address, ChainError, ChainPort, DecodedEvent, EventSource, Hex, Signer, Submission,
} from "@orthograph/chain-evm/device";

export const abi: AbiDocument = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "supply",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true
      },
      {
        "name": "spender",
        "type": "address",
        "indexed": true
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
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
  {
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
  {
    "type": "error",
    "name": "ERC20InvalidApprover",
    "inputs": [
      {
        "name": "approver",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidReceiver",
    "inputs": [
      {
        "name": "receiver",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSender",
    "inputs": [
      {
        "name": "sender",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSpender",
    "inputs": [
      {
        "name": "spender",
        "type": "address"
      }
    ]
  }
];

/** The test token's creation code: the stand-in `deploy` puts on a world's Anvil. Empty until the build (#1162). */
export const bytecode: Hex = "0x";

export interface ConstructorArgs { readonly supply: bigint }

export interface AllowanceArgs { readonly owner: Address; readonly spender: Address }
export type AllowanceAnswer = bigint;
export interface ApproveArgs { readonly spender: Address; readonly value: bigint }
export type ApproveAnswer = boolean;
export interface BalanceOfArgs { readonly account: Address }
export type BalanceOfAnswer = bigint;
export type DecimalsAnswer = bigint;
export type NameAnswer = string;
export type SymbolAnswer = string;
export type TotalSupplyAnswer = bigint;
export interface TransferArgs { readonly to: Address; readonly value: bigint }
export type TransferAnswer = boolean;
export interface TransferFromArgs { readonly from: Address; readonly to: Address; readonly value: bigint }
export type TransferFromAnswer = boolean;

export interface ApprovalEventArgs { readonly owner: Address; readonly spender: Address; readonly value: bigint }
export interface TransferEventArgs { readonly from: Address; readonly to: Address; readonly value: bigint }

export interface ERC20InsufficientAllowanceFields { readonly spender: Address; readonly allowance: bigint; readonly needed: bigint }
export interface ERC20InsufficientBalanceFields { readonly sender: Address; readonly balance: bigint; readonly needed: bigint }
export interface ERC20InvalidApproverFields { readonly approver: Address }
export interface ERC20InvalidReceiverFields { readonly receiver: Address }
export interface ERC20InvalidSenderFields { readonly sender: Address }
export interface ERC20InvalidSpenderFields { readonly spender: Address }

export class ERC20InsufficientAllowance extends Data.TaggedError("ERC20InsufficientAllowance")<ERC20InsufficientAllowanceFields> {}
export class ERC20InsufficientBalance extends Data.TaggedError("ERC20InsufficientBalance")<ERC20InsufficientBalanceFields> {}
export class ERC20InvalidApprover extends Data.TaggedError("ERC20InvalidApprover")<ERC20InvalidApproverFields> {}
export class ERC20InvalidReceiver extends Data.TaggedError("ERC20InvalidReceiver")<ERC20InvalidReceiverFields> {}
export class ERC20InvalidSender extends Data.TaggedError("ERC20InvalidSender")<ERC20InvalidSenderFields> {}
export class ERC20InvalidSpender extends Data.TaggedError("ERC20InvalidSpender")<ERC20InvalidSpenderFields> {}

export type Refusal =
  | ERC20InsufficientAllowance | ERC20InsufficientBalance | ERC20InvalidApprover
  | ERC20InvalidReceiver | ERC20InvalidSender | ERC20InvalidSpender;

export interface Chain { readonly port: ChainPort; readonly address: Address; readonly from?: Address }

const empty = (what: string) => Effect.die(`erc20: ${what} is not built (#1162)`);

export const at = (_chain: Chain) => ({
  allowance: (_args: AllowanceArgs): Effect.Effect<AllowanceAnswer, Refusal | ChainError> => empty("allowance"),
  approve: (_args: ApproveArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("approve"),
  balanceOf: (_args: BalanceOfArgs): Effect.Effect<BalanceOfAnswer, Refusal | ChainError> => empty("balanceOf"),
  decimals: (): Effect.Effect<DecimalsAnswer, Refusal | ChainError> => empty("decimals"),
  name: (): Effect.Effect<NameAnswer, Refusal | ChainError> => empty("name"),
  symbol: (): Effect.Effect<SymbolAnswer, Refusal | ChainError> => empty("symbol"),
  totalSupply: (): Effect.Effect<TotalSupplyAnswer, Refusal | ChainError> => empty("totalSupply"),
  transfer: (_args: TransferArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("transfer"),
  transferFrom: (_args: TransferFromArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("transferFrom"),
});

type Event<N extends string, A> = DecodedEvent & { readonly eventName: N; readonly args: A };

/** An empty source until the build: no event, and a decode that fails. */
const noSource = <E extends DecodedEvent>(address: Address, fromBlock: bigint): EventSource<E> => ({
  address, fromBlock, event: { type: "event", name: "", inputs: [] }, decode: () => empty("the event sources"),
});

export const events = {
  Approval: (address: Address, fromBlock: bigint): EventSource<Event<"Approval", ApprovalEventArgs>> => noSource(address, fromBlock),
  Transfer: (address: Address, fromBlock: bigint): EventSource<Event<"Transfer", TransferEventArgs>> => noSource(address, fromBlock),
};

export const deploy = (_port: ChainPort, _signer: Signer, _args: ConstructorArgs): Effect.Effect<Address, Refusal | ChainError> =>
  empty("deploy");
