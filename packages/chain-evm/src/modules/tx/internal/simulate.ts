import { Effect } from "effect";
import { mapRpcError } from "../../faults/service.ts";
import type { ChainPort, ChainPortOptions } from "../types.ts";
import type { Rpc } from "./rpc.ts";

/**
 * Simulation is a plain `eth_call` of the prepared transaction at the latest block (K7 Q5): it works on Anvil and on
 * a live node alike. A revert comes back as the same typed refusal a mined revert would carry, and nothing is sent.
 */
export const simulateCall = (rpc: Rpc, options: ChainPortOptions): ChainPort["simulate"] => (prepared) => {
  const { transaction } = prepared;
  const to = transaction.to ?? undefined;
  return rpc((client) => client.call({
    account: prepared.from,
    ...(to === undefined ? {} : { to }),
    ...(transaction.data === undefined ? {} : { data: transaction.data }),
    ...(transaction.value === undefined ? {} : { value: transaction.value }),
    gas: transaction.gas,
  })).pipe(
    Effect.asVoid,
    Effect.catch((error) => mapRpcError(error, to, options.refusals)),
    Effect.withSpan("chain.evm.simulate", { attributes: { chainId: options.chainId } }),
  );
};
