# assets

Owns `Blueprint.asset.token({ symbol, decimals })` and `Blueprint.asset.currency("EUR")` (M6-money item 2): what an
amount counts. An asset is plain frozen data, with no name and no address: its name is its file's,
`blueprint/assets/<name>.ts`, and a token's address is bound per network in the environment (`Chain.evm.token`). The
compiler refuses a currency code that is not ISO 4217; `placesOf` is its table. Test: `assets.test.ts`.
