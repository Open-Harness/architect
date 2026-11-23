// Assets: what an amount counts (M6-money item 2). One file per asset in `blueprint/assets/`, named by its path.

/** A token: an ERC-20 on a chain. Its address is never here: the environment binds it per network (`Chain.evm.token`). */
export interface TokenAsset {
  readonly kind: "asset";
  readonly of: "token";
  readonly symbol: string;
  /** The places an amount has: 6 for USDC, so `1250000` is 1.25 USDC. The host checks it against the token's own `decimals()`. */
  readonly decimals: number;
}

/** A currency by its ISO 4217 code; its places come from the code (EUR 2, JPY 0). It has no chain binding. */
export interface CurrencyAsset {
  readonly kind: "asset";
  readonly of: "currency";
  readonly code: string;
}

export type Asset = TokenAsset | CurrencyAsset;

export interface AssetsApi {
  readonly asset: {
    /** `export default Blueprint.asset.token({ symbol: "USDC", decimals: 6 })` in `blueprint/assets/usdc.ts`. */
    readonly token: (spec: { readonly symbol: string; readonly decimals: number }) => TokenAsset;
    /** `export default Blueprint.asset.currency("EUR")` in `blueprint/assets/eur.ts`. */
    readonly currency: (code: string) => CurrencyAsset;
  };
}
