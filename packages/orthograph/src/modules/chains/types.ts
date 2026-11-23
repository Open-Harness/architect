// Chains: where a chain store is bound in an environment, and which contract each token asset is there (M6-chain items
// 3 and 8, M6-money item 2). The blueprint never holds an address; an environment does.

/** The network a chain store runs on in an environment: `anvil` locally, a public test chain or a main chain later. */
export interface ChainNetwork {
  readonly kind: "chain";
  readonly of: "evm";
  readonly network: string;
}

/** The contract a token asset is on one network: `assets: { usdc: { budgets: Chain.evm.token("0x…") } }`. */
export interface ChainToken {
  readonly kind: "chain-token";
  readonly of: "evm";
  readonly address: string;
}

export interface ChainsApi {
  readonly evm: {
    /** `stores: { budgets: Chain.evm.network("anvil") }`: the chain store `budgets` runs on a local Anvil. */
    readonly network: (name: string) => ChainNetwork;
    /** A token asset's contract on the store's network. */
    readonly token: (address: string) => ChainToken;
  };
}
