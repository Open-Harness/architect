// Generated from abi/Roles.json. Do not edit.
// Hand-written to the shape `ortho new adapter --from-abi` makes (packages/generators/src/modules/abi/README.md, #1164) until
// A1 lands and regenerates it. Until the build of #1163, the calls and the event sources are empty handlers.
import { Data, Effect } from "effect";
import type {
  AbiDocument, Address, ChainError, ChainPort, DecodedEvent, EventSource, Hex, Signer, Submission,
} from "@orthograph/chain-evm/device";

export const abi: AbiDocument = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_avatar",
        "type": "address"
      },
      {
        "name": "_target",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "error",
    "name": "AlreadyDisabledModule",
    "inputs": [
      {
        "name": "module",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "AlreadyEnabledModule",
    "inputs": [
      {
        "name": "module",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ArraysDifferentLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CalldataOutOfBounds",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ConditionViolation",
    "inputs": [
      {
        "name": "status",
        "type": "uint8"
      },
      {
        "name": "info",
        "type": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "FunctionSignatureTooShort",
    "inputs": []
  },
  {
    "type": "error",
    "name": "HashAlreadyConsumed",
    "inputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidInitialization",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidModule",
    "inputs": [
      {
        "name": "module",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidPageSize",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MalformedMultiEntrypoint",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ModuleTransactionFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoMembership",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAuthorized",
    "inputs": [
      {
        "name": "sender",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotInitializing",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SetupModulesAlreadyCalled",
    "inputs": []
  },
  {
    "type": "event",
    "name": "AllowFunction",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32",
        "indexed": false
      },
      {
        "name": "targetAddress",
        "type": "address",
        "indexed": false
      },
      {
        "name": "selector",
        "type": "bytes4",
        "indexed": false
      },
      {
        "name": "options",
        "type": "uint8",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AllowTarget",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32",
        "indexed": false
      },
      {
        "name": "targetAddress",
        "type": "address",
        "indexed": false
      },
      {
        "name": "options",
        "type": "uint8",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AssignRoles",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": false
      },
      {
        "name": "roleKeys",
        "type": "bytes32[]",
        "indexed": false
      },
      {
        "name": "memberOf",
        "type": "bool[]",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AvatarSet",
    "inputs": [
      {
        "name": "previousAvatar",
        "type": "address",
        "indexed": true
      },
      {
        "name": "newAvatar",
        "type": "address",
        "indexed": true
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ConsumeAllowance",
    "inputs": [
      {
        "name": "allowanceKey",
        "type": "bytes32",
        "indexed": false
      },
      {
        "name": "consumed",
        "type": "uint128",
        "indexed": false
      },
      {
        "name": "newBalance",
        "type": "uint128",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisabledModule",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EnabledModule",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ExecutionFromModuleFailure",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": true
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ExecutionFromModuleSuccess",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": true
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "HashExecuted",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "HashInvalidated",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Initialized",
    "inputs": [
      {
        "name": "version",
        "type": "uint64",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RevokeFunction",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32",
        "indexed": false
      },
      {
        "name": "targetAddress",
        "type": "address",
        "indexed": false
      },
      {
        "name": "selector",
        "type": "bytes4",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RevokeTarget",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32",
        "indexed": false
      },
      {
        "name": "targetAddress",
        "type": "address",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RolesModSetup",
    "inputs": [
      {
        "name": "initiator",
        "type": "address",
        "indexed": true
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true
      },
      {
        "name": "avatar",
        "type": "address",
        "indexed": true
      },
      {
        "name": "target",
        "type": "address",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ScopeFunction",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32",
        "indexed": false
      },
      {
        "name": "targetAddress",
        "type": "address",
        "indexed": false
      },
      {
        "name": "selector",
        "type": "bytes4",
        "indexed": false
      },
      {
        "name": "conditions",
        "type": "tuple[]",
        "indexed": false,
        "components": [
          {
            "name": "parent",
            "type": "uint8"
          },
          {
            "name": "paramType",
            "type": "uint8"
          },
          {
            "name": "operator",
            "type": "uint8"
          },
          {
            "name": "compValue",
            "type": "bytes"
          }
        ]
      },
      {
        "name": "options",
        "type": "uint8",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ScopeTarget",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32",
        "indexed": false
      },
      {
        "name": "targetAddress",
        "type": "address",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SetAllowance",
    "inputs": [
      {
        "name": "allowanceKey",
        "type": "bytes32",
        "indexed": false
      },
      {
        "name": "balance",
        "type": "uint128",
        "indexed": false
      },
      {
        "name": "maxRefill",
        "type": "uint128",
        "indexed": false
      },
      {
        "name": "refill",
        "type": "uint128",
        "indexed": false
      },
      {
        "name": "period",
        "type": "uint64",
        "indexed": false
      },
      {
        "name": "timestamp",
        "type": "uint64",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SetDefaultRole",
    "inputs": [
      {
        "name": "module",
        "type": "address",
        "indexed": false
      },
      {
        "name": "defaultRoleKey",
        "type": "bytes32",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SetUnwrapAdapter",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "indexed": false
      },
      {
        "name": "selector",
        "type": "bytes4",
        "indexed": false
      },
      {
        "name": "adapter",
        "type": "address",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TargetSet",
    "inputs": [
      {
        "name": "previousTarget",
        "type": "address",
        "indexed": true
      },
      {
        "name": "newTarget",
        "type": "address",
        "indexed": true
      }
    ],
    "anonymous": false
  },
  {
    "type": "function",
    "name": "allowFunction",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32"
      },
      {
        "name": "targetAddress",
        "type": "address"
      },
      {
        "name": "selector",
        "type": "bytes4"
      },
      {
        "name": "options",
        "type": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowTarget",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32"
      },
      {
        "name": "targetAddress",
        "type": "address"
      },
      {
        "name": "options",
        "type": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowances",
    "inputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "refill",
        "type": "uint128"
      },
      {
        "name": "maxRefill",
        "type": "uint128"
      },
      {
        "name": "period",
        "type": "uint64"
      },
      {
        "name": "balance",
        "type": "uint128"
      },
      {
        "name": "timestamp",
        "type": "uint64"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "assignRoles",
    "inputs": [
      {
        "name": "module",
        "type": "address"
      },
      {
        "name": "roleKeys",
        "type": "bytes32[]"
      },
      {
        "name": "memberOf",
        "type": "bool[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "avatar",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "consumed",
    "inputs": [
      {
        "name": "",
        "type": "address"
      },
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "defaultRoles",
    "inputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "disableModule",
    "inputs": [
      {
        "name": "prevModule",
        "type": "address"
      },
      {
        "name": "module",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "enableModule",
    "inputs": [
      {
        "name": "module",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "execTransactionFromModule",
    "inputs": [
      {
        "name": "to",
        "type": "address"
      },
      {
        "name": "value",
        "type": "uint256"
      },
      {
        "name": "data",
        "type": "bytes"
      },
      {
        "name": "operation",
        "type": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "execTransactionFromModuleReturnData",
    "inputs": [
      {
        "name": "to",
        "type": "address"
      },
      {
        "name": "value",
        "type": "uint256"
      },
      {
        "name": "data",
        "type": "bytes"
      },
      {
        "name": "operation",
        "type": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      },
      {
        "name": "returnData",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "execTransactionWithRole",
    "inputs": [
      {
        "name": "to",
        "type": "address"
      },
      {
        "name": "value",
        "type": "uint256"
      },
      {
        "name": "data",
        "type": "bytes"
      },
      {
        "name": "operation",
        "type": "uint8"
      },
      {
        "name": "roleKey",
        "type": "bytes32"
      },
      {
        "name": "shouldRevert",
        "type": "bool"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "execTransactionWithRoleReturnData",
    "inputs": [
      {
        "name": "to",
        "type": "address"
      },
      {
        "name": "value",
        "type": "uint256"
      },
      {
        "name": "data",
        "type": "bytes"
      },
      {
        "name": "operation",
        "type": "uint8"
      },
      {
        "name": "roleKey",
        "type": "bytes32"
      },
      {
        "name": "shouldRevert",
        "type": "bool"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "bool"
      },
      {
        "name": "returnData",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getModulesPaginated",
    "inputs": [
      {
        "name": "start",
        "type": "address"
      },
      {
        "name": "pageSize",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "array",
        "type": "address[]"
      },
      {
        "name": "next",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "invalidate",
    "inputs": [
      {
        "name": "hash",
        "type": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isModuleEnabled",
    "inputs": [
      {
        "name": "_module",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "moduleTxHash",
    "inputs": [
      {
        "name": "data",
        "type": "bytes"
      },
      {
        "name": "salt",
        "type": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeFunction",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32"
      },
      {
        "name": "targetAddress",
        "type": "address"
      },
      {
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "revokeTarget",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32"
      },
      {
        "name": "targetAddress",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "scopeFunction",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32"
      },
      {
        "name": "targetAddress",
        "type": "address"
      },
      {
        "name": "selector",
        "type": "bytes4"
      },
      {
        "name": "conditions",
        "type": "tuple[]",
        "components": [
          {
            "name": "parent",
            "type": "uint8"
          },
          {
            "name": "paramType",
            "type": "uint8"
          },
          {
            "name": "operator",
            "type": "uint8"
          },
          {
            "name": "compValue",
            "type": "bytes"
          }
        ]
      },
      {
        "name": "options",
        "type": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "scopeTarget",
    "inputs": [
      {
        "name": "roleKey",
        "type": "bytes32"
      },
      {
        "name": "targetAddress",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setAllowance",
    "inputs": [
      {
        "name": "key",
        "type": "bytes32"
      },
      {
        "name": "balance",
        "type": "uint128"
      },
      {
        "name": "maxRefill",
        "type": "uint128"
      },
      {
        "name": "refill",
        "type": "uint128"
      },
      {
        "name": "period",
        "type": "uint64"
      },
      {
        "name": "timestamp",
        "type": "uint64"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setAvatar",
    "inputs": [
      {
        "name": "_avatar",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setDefaultRole",
    "inputs": [
      {
        "name": "module",
        "type": "address"
      },
      {
        "name": "roleKey",
        "type": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTarget",
    "inputs": [
      {
        "name": "_target",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTransactionUnwrapper",
    "inputs": [
      {
        "name": "to",
        "type": "address"
      },
      {
        "name": "selector",
        "type": "bytes4"
      },
      {
        "name": "adapter",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setUp",
    "inputs": [
      {
        "name": "initParams",
        "type": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "target",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unwrappers",
    "inputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  }
];

export interface ConstructorArgs { readonly _owner: Address; readonly _avatar: Address; readonly _target: Address }

export interface AllowFunctionArgs { readonly roleKey: Hex; readonly targetAddress: Address; readonly selector: Hex; readonly options: bigint }
export type AllowFunctionAnswer = void;
export interface AllowTargetArgs { readonly roleKey: Hex; readonly targetAddress: Address; readonly options: bigint }
export type AllowTargetAnswer = void;
export interface AllowancesArgs { readonly arg0: Hex }
export interface AllowancesAnswer { readonly refill: bigint; readonly maxRefill: bigint; readonly period: bigint; readonly balance: bigint; readonly timestamp: bigint }
export interface AssignRolesArgs { readonly module: Address; readonly roleKeys: ReadonlyArray<Hex>; readonly memberOf: ReadonlyArray<boolean> }
export type AssignRolesAnswer = void;
export type AvatarAnswer = Address;
export interface ConsumedArgs { readonly arg0: Address; readonly arg1: Hex }
export type ConsumedAnswer = boolean;
export interface DefaultRolesArgs { readonly arg0: Address }
export type DefaultRolesAnswer = Hex;
export interface DisableModuleArgs { readonly prevModule: Address; readonly module: Address }
export type DisableModuleAnswer = void;
export interface EnableModuleArgs { readonly module: Address }
export type EnableModuleAnswer = void;
export interface ExecTransactionFromModuleArgs { readonly to: Address; readonly value: bigint; readonly data: Hex; readonly operation: bigint }
export type ExecTransactionFromModuleAnswer = boolean;
export interface ExecTransactionFromModuleReturnDataArgs { readonly to: Address; readonly value: bigint; readonly data: Hex; readonly operation: bigint }
export interface ExecTransactionFromModuleReturnDataAnswer { readonly success: boolean; readonly returnData: Hex }
export interface ExecTransactionWithRoleArgs { readonly to: Address; readonly value: bigint; readonly data: Hex; readonly operation: bigint; readonly roleKey: Hex; readonly shouldRevert: boolean }
export type ExecTransactionWithRoleAnswer = boolean;
export interface ExecTransactionWithRoleReturnDataArgs { readonly to: Address; readonly value: bigint; readonly data: Hex; readonly operation: bigint; readonly roleKey: Hex; readonly shouldRevert: boolean }
export interface ExecTransactionWithRoleReturnDataAnswer { readonly success: boolean; readonly returnData: Hex }
export interface GetModulesPaginatedArgs { readonly start: Address; readonly pageSize: bigint }
export interface GetModulesPaginatedAnswer { readonly array: ReadonlyArray<Address>; readonly next: Address }
export interface InvalidateArgs { readonly hash: Hex }
export type InvalidateAnswer = void;
export interface IsModuleEnabledArgs { readonly _module: Address }
export type IsModuleEnabledAnswer = boolean;
export interface ModuleTxHashArgs { readonly data: Hex; readonly salt: Hex }
export type ModuleTxHashAnswer = Hex;
export type OwnerAnswer = Address;
export type RenounceOwnershipAnswer = void;
export interface RevokeFunctionArgs { readonly roleKey: Hex; readonly targetAddress: Address; readonly selector: Hex }
export type RevokeFunctionAnswer = void;
export interface RevokeTargetArgs { readonly roleKey: Hex; readonly targetAddress: Address }
export type RevokeTargetAnswer = void;
export interface ScopeFunctionArgsConditions { readonly parent: bigint; readonly paramType: bigint; readonly operator: bigint; readonly compValue: Hex }
export interface ScopeFunctionArgs { readonly roleKey: Hex; readonly targetAddress: Address; readonly selector: Hex; readonly conditions: ReadonlyArray<ScopeFunctionArgsConditions>; readonly options: bigint }
export type ScopeFunctionAnswer = void;
export interface ScopeTargetArgs { readonly roleKey: Hex; readonly targetAddress: Address }
export type ScopeTargetAnswer = void;
export interface SetAllowanceArgs { readonly key: Hex; readonly balance: bigint; readonly maxRefill: bigint; readonly refill: bigint; readonly period: bigint; readonly timestamp: bigint }
export type SetAllowanceAnswer = void;
export interface SetAvatarArgs { readonly _avatar: Address }
export type SetAvatarAnswer = void;
export interface SetDefaultRoleArgs { readonly module: Address; readonly roleKey: Hex }
export type SetDefaultRoleAnswer = void;
export interface SetTargetArgs { readonly _target: Address }
export type SetTargetAnswer = void;
export interface SetTransactionUnwrapperArgs { readonly to: Address; readonly selector: Hex; readonly adapter: Address }
export type SetTransactionUnwrapperAnswer = void;
export interface SetUpArgs { readonly initParams: Hex }
export type SetUpAnswer = void;
export type TargetAnswer = Address;
export interface TransferOwnershipArgs { readonly newOwner: Address }
export type TransferOwnershipAnswer = void;
export interface UnwrappersArgs { readonly arg0: Hex }
export type UnwrappersAnswer = Address;

export interface AllowFunctionEventArgs { readonly roleKey: Hex; readonly targetAddress: Address; readonly selector: Hex; readonly options: bigint }
export interface AllowTargetEventArgs { readonly roleKey: Hex; readonly targetAddress: Address; readonly options: bigint }
export interface AssignRolesEventArgs { readonly module: Address; readonly roleKeys: ReadonlyArray<Hex>; readonly memberOf: ReadonlyArray<boolean> }
export interface AvatarSetEventArgs { readonly previousAvatar: Address; readonly newAvatar: Address }
export interface ConsumeAllowanceEventArgs { readonly allowanceKey: Hex; readonly consumed: bigint; readonly newBalance: bigint }
export interface DisabledModuleEventArgs { readonly module: Address }
export interface EnabledModuleEventArgs { readonly module: Address }
export interface ExecutionFromModuleFailureEventArgs { readonly module: Address }
export interface ExecutionFromModuleSuccessEventArgs { readonly module: Address }
export interface HashExecutedEventArgs { readonly arg0: Hex }
export interface HashInvalidatedEventArgs { readonly arg0: Hex }
export interface InitializedEventArgs { readonly version: bigint }
export interface OwnershipTransferredEventArgs { readonly previousOwner: Address; readonly newOwner: Address }
export interface RevokeFunctionEventArgs { readonly roleKey: Hex; readonly targetAddress: Address; readonly selector: Hex }
export interface RevokeTargetEventArgs { readonly roleKey: Hex; readonly targetAddress: Address }
export interface RolesModSetupEventArgs { readonly initiator: Address; readonly owner: Address; readonly avatar: Address; readonly target: Address }
export interface ScopeFunctionEventArgsConditions { readonly parent: bigint; readonly paramType: bigint; readonly operator: bigint; readonly compValue: Hex }
export interface ScopeFunctionEventArgs { readonly roleKey: Hex; readonly targetAddress: Address; readonly selector: Hex; readonly conditions: ReadonlyArray<ScopeFunctionEventArgsConditions>; readonly options: bigint }
export interface ScopeTargetEventArgs { readonly roleKey: Hex; readonly targetAddress: Address }
export interface SetAllowanceEventArgs { readonly allowanceKey: Hex; readonly balance: bigint; readonly maxRefill: bigint; readonly refill: bigint; readonly period: bigint; readonly timestamp: bigint }
export interface SetDefaultRoleEventArgs { readonly module: Address; readonly defaultRoleKey: Hex }
export interface SetUnwrapAdapterEventArgs { readonly to: Address; readonly selector: Hex; readonly adapter: Address }
export interface TargetSetEventArgs { readonly previousTarget: Address; readonly newTarget: Address }

export interface AlreadyDisabledModuleFields { readonly module: Address }
export interface AlreadyEnabledModuleFields { readonly module: Address }
export interface ConditionViolationFields { readonly status: bigint; readonly info: Hex }
export interface HashAlreadyConsumedFields { readonly arg0: Hex }
export interface InvalidModuleFields { readonly module: Address }
export interface NotAuthorizedFields { readonly sender: Address }
export interface OwnableInvalidOwnerFields { readonly owner: Address }
export interface OwnableUnauthorizedAccountFields { readonly account: Address }

export class AlreadyDisabledModule extends Data.TaggedError("AlreadyDisabledModule")<AlreadyDisabledModuleFields> {}
export class AlreadyEnabledModule extends Data.TaggedError("AlreadyEnabledModule")<AlreadyEnabledModuleFields> {}
export class ArraysDifferentLength extends Data.TaggedError("ArraysDifferentLength")<{}> {}
export class CalldataOutOfBounds extends Data.TaggedError("CalldataOutOfBounds")<{}> {}
export class ConditionViolation extends Data.TaggedError("ConditionViolation")<ConditionViolationFields> {}
export class FunctionSignatureTooShort extends Data.TaggedError("FunctionSignatureTooShort")<{}> {}
export class HashAlreadyConsumed extends Data.TaggedError("HashAlreadyConsumed")<HashAlreadyConsumedFields> {}
export class InvalidInitialization extends Data.TaggedError("InvalidInitialization")<{}> {}
export class InvalidModule extends Data.TaggedError("InvalidModule")<InvalidModuleFields> {}
export class InvalidPageSize extends Data.TaggedError("InvalidPageSize")<{}> {}
export class MalformedMultiEntrypoint extends Data.TaggedError("MalformedMultiEntrypoint")<{}> {}
export class ModuleTransactionFailed extends Data.TaggedError("ModuleTransactionFailed")<{}> {}
export class NoMembership extends Data.TaggedError("NoMembership")<{}> {}
export class NotAuthorized extends Data.TaggedError("NotAuthorized")<NotAuthorizedFields> {}
export class NotInitializing extends Data.TaggedError("NotInitializing")<{}> {}
export class OwnableInvalidOwner extends Data.TaggedError("OwnableInvalidOwner")<OwnableInvalidOwnerFields> {}
export class OwnableUnauthorizedAccount extends Data.TaggedError("OwnableUnauthorizedAccount")<OwnableUnauthorizedAccountFields> {}
export class SetupModulesAlreadyCalled extends Data.TaggedError("SetupModulesAlreadyCalled")<{}> {}

export type Refusal =
  | AlreadyDisabledModule | AlreadyEnabledModule | ArraysDifferentLength | CalldataOutOfBounds | ConditionViolation | FunctionSignatureTooShort | HashAlreadyConsumed | InvalidInitialization | InvalidModule | InvalidPageSize | MalformedMultiEntrypoint | ModuleTransactionFailed | NoMembership | NotAuthorized | NotInitializing | OwnableInvalidOwner | OwnableUnauthorizedAccount | SetupModulesAlreadyCalled;

export interface Chain { readonly port: ChainPort; readonly address: Address; readonly from?: Address }

const empty = (what: string) => Effect.die(`zodiac-roles: ${what} is not built (#1163)`);

export const at = (_chain: Chain) => ({
  allowFunction: (_args: AllowFunctionArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("allowFunction"),
  allowTarget: (_args: AllowTargetArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("allowTarget"),
  allowances: (_args: AllowancesArgs): Effect.Effect<AllowancesAnswer, Refusal | ChainError> => empty("allowances"),
  assignRoles: (_args: AssignRolesArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("assignRoles"),
  avatar: (): Effect.Effect<AvatarAnswer, Refusal | ChainError> => empty("avatar"),
  consumed: (_args: ConsumedArgs): Effect.Effect<ConsumedAnswer, Refusal | ChainError> => empty("consumed"),
  defaultRoles: (_args: DefaultRolesArgs): Effect.Effect<DefaultRolesAnswer, Refusal | ChainError> => empty("defaultRoles"),
  disableModule: (_args: DisableModuleArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("disableModule"),
  enableModule: (_args: EnableModuleArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("enableModule"),
  execTransactionFromModule: (_args: ExecTransactionFromModuleArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("execTransactionFromModule"),
  execTransactionFromModuleReturnData: (_args: ExecTransactionFromModuleReturnDataArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("execTransactionFromModuleReturnData"),
  execTransactionWithRole: (_args: ExecTransactionWithRoleArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("execTransactionWithRole"),
  execTransactionWithRoleReturnData: (_args: ExecTransactionWithRoleReturnDataArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("execTransactionWithRoleReturnData"),
  getModulesPaginated: (_args: GetModulesPaginatedArgs): Effect.Effect<GetModulesPaginatedAnswer, Refusal | ChainError> => empty("getModulesPaginated"),
  invalidate: (_args: InvalidateArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("invalidate"),
  isModuleEnabled: (_args: IsModuleEnabledArgs): Effect.Effect<IsModuleEnabledAnswer, Refusal | ChainError> => empty("isModuleEnabled"),
  moduleTxHash: (_args: ModuleTxHashArgs): Effect.Effect<ModuleTxHashAnswer, Refusal | ChainError> => empty("moduleTxHash"),
  owner: (): Effect.Effect<OwnerAnswer, Refusal | ChainError> => empty("owner"),
  renounceOwnership: (_signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("renounceOwnership"),
  revokeFunction: (_args: RevokeFunctionArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("revokeFunction"),
  revokeTarget: (_args: RevokeTargetArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("revokeTarget"),
  scopeFunction: (_args: ScopeFunctionArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("scopeFunction"),
  scopeTarget: (_args: ScopeTargetArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("scopeTarget"),
  setAllowance: (_args: SetAllowanceArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("setAllowance"),
  setAvatar: (_args: SetAvatarArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("setAvatar"),
  setDefaultRole: (_args: SetDefaultRoleArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("setDefaultRole"),
  setTarget: (_args: SetTargetArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("setTarget"),
  setTransactionUnwrapper: (_args: SetTransactionUnwrapperArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("setTransactionUnwrapper"),
  setUp: (_args: SetUpArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("setUp"),
  target: (): Effect.Effect<TargetAnswer, Refusal | ChainError> => empty("target"),
  transferOwnership: (_args: TransferOwnershipArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("transferOwnership"),
  unwrappers: (_args: UnwrappersArgs): Effect.Effect<UnwrappersAnswer, Refusal | ChainError> => empty("unwrappers"),
});

type Event<N extends string, A> = DecodedEvent & { readonly eventName: N; readonly args: A };

/** An empty source until the build: no event, and a decode that fails. */
const noSource = <E extends DecodedEvent>(address: Address, fromBlock: bigint): EventSource<E> => ({
  address, fromBlock, event: { type: "event", name: "", inputs: [] }, decode: () => empty("the event sources"),
});

export const events = {
  AllowFunction: (address: Address, fromBlock: bigint): EventSource<Event<"AllowFunction", AllowFunctionEventArgs>> => noSource(address, fromBlock),
  AllowTarget: (address: Address, fromBlock: bigint): EventSource<Event<"AllowTarget", AllowTargetEventArgs>> => noSource(address, fromBlock),
  AssignRoles: (address: Address, fromBlock: bigint): EventSource<Event<"AssignRoles", AssignRolesEventArgs>> => noSource(address, fromBlock),
  AvatarSet: (address: Address, fromBlock: bigint): EventSource<Event<"AvatarSet", AvatarSetEventArgs>> => noSource(address, fromBlock),
  ConsumeAllowance: (address: Address, fromBlock: bigint): EventSource<Event<"ConsumeAllowance", ConsumeAllowanceEventArgs>> => noSource(address, fromBlock),
  DisabledModule: (address: Address, fromBlock: bigint): EventSource<Event<"DisabledModule", DisabledModuleEventArgs>> => noSource(address, fromBlock),
  EnabledModule: (address: Address, fromBlock: bigint): EventSource<Event<"EnabledModule", EnabledModuleEventArgs>> => noSource(address, fromBlock),
  ExecutionFromModuleFailure: (address: Address, fromBlock: bigint): EventSource<Event<"ExecutionFromModuleFailure", ExecutionFromModuleFailureEventArgs>> => noSource(address, fromBlock),
  ExecutionFromModuleSuccess: (address: Address, fromBlock: bigint): EventSource<Event<"ExecutionFromModuleSuccess", ExecutionFromModuleSuccessEventArgs>> => noSource(address, fromBlock),
  HashExecuted: (address: Address, fromBlock: bigint): EventSource<Event<"HashExecuted", HashExecutedEventArgs>> => noSource(address, fromBlock),
  HashInvalidated: (address: Address, fromBlock: bigint): EventSource<Event<"HashInvalidated", HashInvalidatedEventArgs>> => noSource(address, fromBlock),
  Initialized: (address: Address, fromBlock: bigint): EventSource<Event<"Initialized", InitializedEventArgs>> => noSource(address, fromBlock),
  OwnershipTransferred: (address: Address, fromBlock: bigint): EventSource<Event<"OwnershipTransferred", OwnershipTransferredEventArgs>> => noSource(address, fromBlock),
  RevokeFunction: (address: Address, fromBlock: bigint): EventSource<Event<"RevokeFunction", RevokeFunctionEventArgs>> => noSource(address, fromBlock),
  RevokeTarget: (address: Address, fromBlock: bigint): EventSource<Event<"RevokeTarget", RevokeTargetEventArgs>> => noSource(address, fromBlock),
  RolesModSetup: (address: Address, fromBlock: bigint): EventSource<Event<"RolesModSetup", RolesModSetupEventArgs>> => noSource(address, fromBlock),
  ScopeFunction: (address: Address, fromBlock: bigint): EventSource<Event<"ScopeFunction", ScopeFunctionEventArgs>> => noSource(address, fromBlock),
  ScopeTarget: (address: Address, fromBlock: bigint): EventSource<Event<"ScopeTarget", ScopeTargetEventArgs>> => noSource(address, fromBlock),
  SetAllowance: (address: Address, fromBlock: bigint): EventSource<Event<"SetAllowance", SetAllowanceEventArgs>> => noSource(address, fromBlock),
  SetDefaultRole: (address: Address, fromBlock: bigint): EventSource<Event<"SetDefaultRole", SetDefaultRoleEventArgs>> => noSource(address, fromBlock),
  SetUnwrapAdapter: (address: Address, fromBlock: bigint): EventSource<Event<"SetUnwrapAdapter", SetUnwrapAdapterEventArgs>> => noSource(address, fromBlock),
  TargetSet: (address: Address, fromBlock: bigint): EventSource<Event<"TargetSet", TargetSetEventArgs>> => noSource(address, fromBlock),
};
