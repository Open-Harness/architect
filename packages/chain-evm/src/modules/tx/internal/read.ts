import { Effect } from "effect";
import { mapRpcError } from "../../faults/service.ts";
import type { ChainPort, ChainPortOptions } from "../types.ts";
import type { Rpc } from "./rpc.ts";

/**
 * A plain `eth_call` at the latest block that returns the data the call answered (`0x` when it answers nothing). It goes through the
 * same Rpc wrapper as `simulate` (deadline, Timers, abort) and a revert is mapped exactly as `simulate` maps it. Nothing is prepared or sent.
 */
export const readCall = (rpc: Rpc, options: ChainPortOptions): ChainPort["read"] => (call) =>
  rpc((client) => client.call({
    account: call.from,
    ...(call.to === undefined ? {} : { to: call.to }),
    ...(call.data === undefined ? {} : { data: call.data }),
    ...(call.value === undefined ? {} : { value: call.value }),
    ...(call.gas === undefined ? {} : { gas: call.gas }),
  })).pipe(
    Effect.map((result) => result.data ?? "0x"),
    Effect.catch((error) => mapRpcError(error, call.to, options.refusals)),
    Effect.withSpan("chain.evm.read", { attributes: { chainId: options.chainId } }),
  );
