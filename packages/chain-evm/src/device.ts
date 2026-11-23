// `@orthograph/chain-evm/device`: all a wallet needs on a device, a server or in a world's code, with no process to
// spawn (so no `node:` import): the chain port, its faults, events and keys. `Anvil` is only in the package's front door.
export { makeChainPort } from "./modules/tx/service.ts";
export type {
  Call, ChainPort, ChainPortOptions, ConfirmationLevel, Intent, ReplacementPolicy,
  Signed, Signer, Standing, Submission, Transaction, TxState, Unsigned,
} from "./modules/tx/types.ts";
export { decodeRevert, mapRpcError } from "./modules/faults/service.ts";
export { ChainFault, ChainRefusal, type ChainError, type FaultKind, type RefusalLockEntry } from "./modules/faults/types.ts";
export { makeEventSource } from "./modules/events/service.ts";
export type {
  BlockIdentity, DecodedEvent, EventAbi, EventChange, EventCheckpoint, EventFollower, EventFor, EventPoll, EventSource,
} from "./modules/events/types.ts";
export { Keys } from "./modules/keys/service.ts";
export type { Key, KeysApi } from "./modules/keys/types.ts";
export type { Address, Hash, Hex, TransactionReceipt } from "viem";
