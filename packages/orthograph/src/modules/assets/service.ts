import type { AssetsApi } from "./types.ts";

export const Assets: AssetsApi = {
  asset: Object.freeze({
    token: (spec) => Object.freeze({ kind: "asset", of: "token", symbol: spec.symbol, decimals: spec.decimals }),
    currency: (code) => Object.freeze({ kind: "asset", of: "currency", code }),
  }),
};

export { placesOf } from "./internal/currencies.ts";
