import { Blueprint } from "orthograph";

// A chain store (K25). The contract takes its name from this file: "Treasury".
export default Blueprint.store.chain.evm({
  upgradeable: true, // new: its owners may take a newer version in place
});
