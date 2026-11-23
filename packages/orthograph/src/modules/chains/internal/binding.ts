import type { ChainNetwork, ChainToken } from "../types.ts";

/** A binding is plain frozen data, so an environment can be compared and hashed by what it says. */
export const network = (name: string): ChainNetwork => Object.freeze({ kind: "chain", of: "evm", network: name });
export const token = (address: string): ChainToken => Object.freeze({ kind: "chain-token", of: "evm", address });
