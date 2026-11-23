// Adapted from @prb/effect-evm@5.0.3 src/nonce/service.ts. See LICENSE-prb-effect-evm.
import { Effect } from "effect";
import type { Address } from "viem";
import { rpcFault } from "../faults/service.ts";
import type { Rpc } from "../tx/internal/rpc.ts";
import { makeNonceManager } from "./internal/manager.ts";

export const makeNonces = (rpc: Rpc) =>
  Effect.gen(function* () {
    const manager = yield* makeNonceManager;
    const count = (address: Address, blockTag: "pending" | "latest" | "finalized") =>
      rpc((client) => client.getTransactionCount({ address, blockTag })).pipe(Effect.mapError((error) => rpcFault(error)));

    const reserve = (address: Address) => count(address, "pending").pipe(
      Effect.flatMap((startNonce) => manager.reserveNext(address, startNonce)),
      Effect.withSpan("chain.evm.nonce.reserve", { attributes: { address } }),
    );

    const pruneFinalized = (address: Address) => count(address, "finalized").pipe(
      Effect.flatMap((nonce) => manager.pruneFinalized(address, nonce)),
    );

    return { ...manager, reserve, nonceAtHead: (address: Address) => count(address, "latest"), pruneFinalized };
  });
