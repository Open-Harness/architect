import { Blueprint } from "orthograph";
import { BridgeBusiness } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read. It answers from the KYB's record; only the company's owner sees it.
export default Blueprint.read(BridgeBusiness, {
  by: "id",
  fields: ["company", "legalName", "email", "kybLink", "tosLink", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
