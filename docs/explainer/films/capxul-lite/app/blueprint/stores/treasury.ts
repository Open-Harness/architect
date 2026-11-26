import { Blueprint } from "orthograph";

// A chain store (K25). The contract takes its name from this file: "Treasury".
// Every thing that lives here shares that one contract.
export default Blueprint.store.chain.evm();
