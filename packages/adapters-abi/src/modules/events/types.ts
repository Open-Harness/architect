// events: a typed event source from an ABI event item and the contract's address (ST2-abi-adapters section 4). One per ABI
// event: `makeEventSource` over the item, with the generated argument type. They go to the follower (M6.09) and in through
// `on:` (M5.03); this slice only makes them typed and decodable.
import type { Address, DecodedEvent, EventSource } from "@orthograph/chain-evm/device";
import type { AbiEventItem } from "../generate/types.ts";

/** A decoded event whose name and arguments are the generated ones. */
export type TypedEvent<Name extends string, Args> = DecodedEvent & {
  readonly eventName: Name;
  readonly args: Args;
};

export interface EventsApi {
  /**
   * The source of one ABI event at `address`, reading from `fromBlock`. Its `decode` gives `args` keyed by the ABI's parameter
   * names with each value in the generator's mapping (an `address` is an `Address`, any `uint` a `bigint`, an indexed string,
   * bytes, array or tuple the `Hex` of its topic). A log that is not the contract's, or does not decode, is a `ChainFault` of kind `event`.
   */
  readonly source: <Name extends string, Args>(
    item: AbiEventItem, address: Address, fromBlock: bigint,
  ) => EventSource<TypedEvent<Name, Args>>;
}
