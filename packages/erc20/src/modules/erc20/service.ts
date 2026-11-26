import { Effect } from "effect";
import type { Erc20Api } from "./types.ts";

// Empty handlers: the checks (`erc20.test.ts`, `anvil.test.ts`) are red until the build lands (#1162).
export const Erc20: Erc20Api = {
  at: (_port, address) => ({
    address,
    balanceOf: () => Effect.die("erc20: balanceOf is not built (#1162)"),
    decimals: () => Effect.die("erc20: decimals is not built (#1162)"),
    transfer: () => Effect.die("erc20: transfer is not built (#1162)"),
    // An empty event: no name, no inputs, and a decode that fails.
    Transfer: (fromBlock) => ({
      address, fromBlock, event: { type: "event", name: "", inputs: [] },
      decode: () => Effect.die("erc20: the Transfer event is not built (#1162)"),
    }),
  }),
};
