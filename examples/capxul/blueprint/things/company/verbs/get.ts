import { Blueprint } from "orthograph";
import { Company } from "../thing.ts";
import { owner } from "../roles.ts";

// A read. It answers from the company's record.
export default Blueprint.read(Company, {
  by: "id",
  fields: ["companyName", "abbr", "country", "defaultCurrency", "owner", "state"],
  allowed: [owner],
  budget: { p95: "50 millis" },
});
