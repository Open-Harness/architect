import { Blueprint } from "orthograph";

// A chain store (K25): the contract is named by this file, "Budgets". One module per network, which any Safe enables.
export default Blueprint.store.chain.evm();
