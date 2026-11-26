// Generated from abi/ModuleProxyFactory.json. Do not edit.
// Hand-written to the shape `ortho new adapter --from-abi` makes (packages/generators/src/modules/abi/README.md, #1164) until
// A1 lands and regenerates it. Until the build of #1163, the calls and the event sources are empty handlers.
import { Data, Effect } from "effect";
import type {
  AbiDocument, Address, ChainError, ChainPort, DecodedEvent, EventSource, Hex, Signer, Submission,
} from "@orthograph/chain-evm/device";

export const abi: AbiDocument = [
  {
    "type": "error",
    "name": "FailedInitialization",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TakenAddress",
    "inputs": [
      {
        "name": "address_",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "TargetHasNoCode",
    "inputs": [
      {
        "name": "target",
        "type": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": [
      {
        "name": "target",
        "type": "address"
      }
    ]
  },
  {
    "type": "event",
    "name": "ModuleProxyCreation",
    "inputs": [
      {
        "name": "proxy",
        "type": "address",
        "indexed": true
      },
      {
        "name": "masterCopy",
        "type": "address",
        "indexed": true
      }
    ],
    "anonymous": false
  },
  {
    "type": "function",
    "name": "deployModule",
    "inputs": [
      {
        "name": "masterCopy",
        "type": "address"
      },
      {
        "name": "initializer",
        "type": "bytes"
      },
      {
        "name": "saltNonce",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "proxy",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable"
  }
];

export interface DeployModuleArgs { readonly masterCopy: Address; readonly initializer: Hex; readonly saltNonce: bigint }
export type DeployModuleAnswer = Address;

export interface ModuleProxyCreationEventArgs { readonly proxy: Address; readonly masterCopy: Address }

export interface TakenAddressFields { readonly address_: Address }
export interface TargetHasNoCodeFields { readonly target: Address }
export interface ZeroAddressFields { readonly target: Address }

export class FailedInitialization extends Data.TaggedError("FailedInitialization")<{}> {}
export class TakenAddress extends Data.TaggedError("TakenAddress")<TakenAddressFields> {}
export class TargetHasNoCode extends Data.TaggedError("TargetHasNoCode")<TargetHasNoCodeFields> {}
export class ZeroAddress extends Data.TaggedError("ZeroAddress")<ZeroAddressFields> {}

export type Refusal =
  | FailedInitialization | TakenAddress | TargetHasNoCode | ZeroAddress;

export interface Chain { readonly port: ChainPort; readonly address: Address; readonly from?: Address }

const empty = (what: string) => Effect.die(`zodiac-roles: ${what} is not built (#1163)`);

export const at = (_chain: Chain) => ({
  deployModule: (_args: DeployModuleArgs, _signer: Signer): Effect.Effect<Submission, Refusal | ChainError> => empty("deployModule"),
});

type Event<N extends string, A> = DecodedEvent & { readonly eventName: N; readonly args: A };

/** An empty source until the build: no event, and a decode that fails. */
const noSource = <E extends DecodedEvent>(address: Address, fromBlock: bigint): EventSource<E> => ({
  address, fromBlock, event: { type: "event", name: "", inputs: [] }, decode: () => empty("the event sources"),
});

export const events = {
  ModuleProxyCreation: (address: Address, fromBlock: bigint): EventSource<Event<"ModuleProxyCreation", ModuleProxyCreationEventArgs>> => noSource(address, fromBlock),
};
