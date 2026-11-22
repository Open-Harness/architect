// contract: one deployed contract as a service, and the two kinds of call every ABI function is (ST2-abi-adapters section 3).
// A `view` or `pure` function is a read: `port.read`, then its answer decoded. Any other function is a write: `prepare`,
// `simulate` (mandatory, M1.32), `sign`, `submit`, answering the `Submission`. A revert in simulation or in a read is decoded
// by the contract's own errors and nothing is sent. The adapter never makes a key: the host or the wallet provides the service.
//
// Shape asked of Goal 4 (Ask #471) and imported once it lands: `Abi.encodeCall`, `Abi.decodeResult`, `Abi.refusal`
// (an ABI error as a `RefusalLockEntry`) and `ChainPort.read`. Nothing here imports viem.
import { Context, type Effect } from "effect";
import type { Address, ChainFault, ChainPort, RefusalLockEntry, Signer, Submission } from "@orthograph/chain-evm/device";
import type { AbiErrorItem, AbiFunctionItem } from "../generate/types.ts";

/** What a call needs: the contract's chain. */
export interface ContractChainShape {
  /**
   * Made with `refusals: Contract.refusals(bindings, address)`, so a revert by one of the contract's own errors arrives as a
   * `ChainRefusal` this module maps to the declared class.
   */
  readonly port: ChainPort;
  readonly address: Address;
  /** Only a write needs one. A write without it fails `ChainFault` of kind `configuration`, before anything is sent. */
  readonly signer?: Signer;
}

export class ContractChain extends Context.Service<ContractChain, ContractChainShape>()("@orthograph/adapters-abi/ContractChain") {}

/** One declared error of the contract: its ABI item, the code its refusal carries, and how a decoded revert becomes the class. */
export interface ErrorBinding<E = unknown> {
  /** `<adapter>.<ErrorName>`: `erc20.ERC20InsufficientBalance`. */
  readonly code: string;
  readonly item: AbiErrorItem;
  /** The declared `Blueprint.error` class's instance, from the decoded fields by name. */
  readonly make: (fields: Readonly<Record<string, unknown>>) => E;
}

/** A call's arguments: an object keyed by the ABI's parameter names, never positional. */
export type CallArgs = object;

export interface ContractApi {
  /**
   * A `view` or `pure` function: encode, `port.read`, decode. The answer is the value of the one output, `void` for none,
   * and an object keyed by output names for several. A revert decoded to one of `errors` fails as that error (from `make`);
   * any other revert (an unknown selector, empty data, a panic) stays the `ChainFault`; an answer that does not decode as the
   * outputs (the empty answer of an address with no such function) is a `ChainFault` of kind `revert`.
   */
  readonly read: <A, E>(
    fn: AbiFunctionItem, args: CallArgs, errors: ReadonlyArray<ErrorBinding<E>>,
  ) => Effect.Effect<A, E | ChainFault, ContractChain>;
  /**
   * Any other function: prepare, simulate, sign, submit; answers the `Submission`. A revert in simulation fails as the declared
   * error that decodes it, and then nothing is signed or sent: the signer's nonce does not move. It does not wait for inclusion.
   */
  readonly write: <E>(
    fn: AbiFunctionItem, args: CallArgs, errors: ReadonlyArray<ErrorBinding<E>>,
  ) => Effect.Effect<Submission, E | ChainFault, ContractChain>;
  /** The contract's errors as the refusal lock `makeChainPort` takes, scoped to `address`. */
  readonly refusals: (errors: ReadonlyArray<ErrorBinding>, address: Address) => Effect.Effect<ReadonlyArray<RefusalLockEntry>>;
}
