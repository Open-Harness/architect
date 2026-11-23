import { Blueprint } from "orthograph";
import { Company } from "../thing.ts";
import { machine } from "../machine.ts";

// No `errors:`: CompanyNameTaken and CompanyAbbrTaken belong to the rules in ../invariants.ts, and the runtime refuses them.
export default Blueprint.operation(Company, {
  description: "Set up a company; the person who sets it up runs it.",
  payload: {
    companyName: Company.fields.companyName,
    abbr: Company.fields.abbr,
    country: Company.fields.country,
    defaultCurrency: Company.fields.defaultCurrency,
  },
  answer: { company: Company.fields.id },
  move: machine.moves.create,
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
