import { Blueprint } from "orthograph";
import { Superagent } from "../thing.ts";
import { Health } from "../derive.ts";
import { itsMain } from "../roles.ts";

export default Blueprint.read(Superagent, {
  by: "id",
  fields: ["name", "state", "pausedAt"],
  derive: Health,
  allowed: [Blueprint.signedIn, itsMain],
  budget: { p95: "200 millis" },
});
