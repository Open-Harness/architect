import { Blueprint } from "orthograph";
import home from "./home.ts";
import tab_contract from "../components/tab-contract.ts";
import tab_metrics from "../components/tab-metrics.ts";
import tab_proof from "../components/tab-proof.ts";
import tab_docs from "../components/tab-docs.ts";
import tab_notes from "../components/tab-notes.ts";

export default Blueprint.page({
  description: "One operation, on five tabs: contract, metrics, proof, docs and notes.",
  route: { path: "/portal/operations/:name", params: { name: Blueprint.text() } },
  parent: home,
  allowed: [Blueprint.anyone],
  components: [tab_contract, tab_metrics, tab_proof, tab_docs, tab_notes],
});
