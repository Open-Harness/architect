import type { Redacted } from "effect";
import type { Address, Hex } from "@orthograph/chain-evm/device";

/** What a server's key store holds for each label. */
export type Store = Map<string, { readonly secret: Redacted.Redacted<Hex>; readonly address: Address }>;

/** The label the server's one key goes by. */
export const SERVER_LABEL = "server";

export const emptyStore = (): Store => new Map();
