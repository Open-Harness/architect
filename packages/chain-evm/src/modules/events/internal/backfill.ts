// Adapted from @prb/effect-evm@5.0.3 src/events/backfill.ts. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import type { Rpc } from "../../tx/internal/rpc.ts";
import { rpcFault } from "../../faults/service.ts";
import { retryRead } from "../../tx/internal/receipt-retry.ts";
import type { DecodedEvent, EventSource } from "../types.ts";

export const readRange = <TEvent extends DecodedEvent>(
  rpc: Rpc, timers: typeof Timers.Service, source: EventSource<TEvent>, fromBlock: bigint, toBlock: bigint,
) => retryRead(timers, rpc((client) => client.getLogs({ address: source.address, event: source.event, fromBlock, toBlock }))).pipe(
  Effect.mapError((error) => rpcFault(error, source.address)),
  Effect.flatMap((logs) => Effect.forEach(logs, source.decode)),
);
