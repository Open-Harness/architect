import { Effect } from "effect";
import type { ChainPort, ChainPortOptions } from "../types.ts";
import type { Rpc } from "./rpc.ts";

/** Ask #471 (empty handler): a plain `eth_call` at latest that returns its data, a revert mapped as `simulate` maps it. Not built. */
export const readCall = (_rpc: Rpc, _options: ChainPortOptions): ChainPort["read"] => () =>
  Effect.die("Ask #471: ChainPort.read is not built");
