import { Blueprint } from "orthograph";
import { Organization } from "../thing.js";
import { owner } from "../roles.js";

export default Blueprint.read(Organization, {
  by: "id",
  fields: ["name", "owner", "state"],
  allowed: [owner],
  budget: { p95: "50 millis" },
});
