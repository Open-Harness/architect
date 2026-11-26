// Generated from abi/. Do not edit.
import { Blueprint } from "orthograph";

export * as ERC20 from "./ERC20.ts";

export const calls = {
  ERC20: {
    allowance: Blueprint.call({ mode: "effect" }),
    approve: Blueprint.call({ mode: "effect" }),
    balanceOf: Blueprint.call({ mode: "effect" }),
    decimals: Blueprint.call({ mode: "effect" }),
    name: Blueprint.call({ mode: "effect" }),
    symbol: Blueprint.call({ mode: "effect" }),
    totalSupply: Blueprint.call({ mode: "effect" }),
    transfer: Blueprint.call({ mode: "effect" }),
    transferFrom: Blueprint.call({ mode: "effect" }),
  },
};

export const standIn = { kind: "stand-in", how: "process", what: "ERC20: deployed on the world's Anvil from abi/" } as const;
