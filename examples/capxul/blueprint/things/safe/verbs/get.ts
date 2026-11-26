import { Blueprint } from "orthograph";
import { Safe } from "../thing.ts";
import { holder } from "../roles.ts";
import { owner } from "../../company/roles.ts";

// A read. A person's Safe answers to its holder; a company's to the person who runs the company.
export default Blueprint.read(Safe, {
  by: "id",
  fields: ["kind", "person", "company", "account", "firstOwner", "owners", "threshold", "saltNonce", "state"],
  allowed: [holder, owner.of("company")],
  budget: { p95: "50 millis" },
});
