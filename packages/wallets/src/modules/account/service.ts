import { Option, type Brand } from "effect";
import { Keys } from "@orthograph/chain-evm/device";
import type { AccountApi } from "./types.ts";
import { CAIP10 } from "./internal/caip10.ts";

export const Account: AccountApi = {
  format: ({ chainId, address }) => `eip155:${chainId}:${address}`,
  parse: (text, chainId) => {
    const caip = CAIP10.exec(text);
    if (caip !== null) {
      const id = Number(caip[1]);
      return Number.isSafeInteger(id) && Keys.isAddress(caip[2]!) ? Option.some({ chainId: id, address: caip[2] as `0x${string}` }) : Option.none();
    }
    return chainId !== undefined && Keys.isAddress(text) ? Option.some({ chainId, address: text }) : Option.none();
  },
  idOf: (address) => `wal_${address.slice(2, 18).toLowerCase()}` as string & Brand.Brand<"wal">,
};
