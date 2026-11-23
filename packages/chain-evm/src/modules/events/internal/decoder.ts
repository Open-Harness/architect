// Adapted from @prb/effect-evm@5.0.3 src/events/decoder.ts. See LICENSE-prb-effect-evm.
import { Effect } from "effect";
import { decodeEventLog, type Address } from "viem";
import { ChainFault } from "../../faults/types.ts";
import type { EventAbi, EventFor, EventSource } from "../types.ts";

export const makeEventSource = <const T extends EventAbi>(
  event: T,
  address: Address,
  fromBlock: bigint,
): EventSource<EventFor<T>> => ({
  address,
  event,
  fromBlock,
  decode: (log) => Effect.gen(function* () {
    const { blockHash, blockNumber, transactionHash, logIndex } = log;
    const badLog = () => new ChainFault({ kind: "event", program: address, message: "Could not decode a mined EVM event" });
    if (blockHash === null || blockNumber === null || transactionHash === null || logIndex === null || log.removed ||
        log.address.toLowerCase() !== address.toLowerCase()) return yield* badLog();
    const decoded = yield* Effect.try({
      try: () => decodeEventLog({ abi: [event], data: log.data, topics: log.topics, strict: true }),
      catch: badLog,
    });
    return {
      eventName: event.name, args: decoded.args as EventFor<T>["args"], address: log.address,
      blockNumber, blockHash, transactionHash, logIndex,
    };
  }),
});
