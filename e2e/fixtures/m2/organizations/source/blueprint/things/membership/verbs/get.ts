import { Blueprint } from "orthograph";
import { Membership } from "../thing.js";
import { holder } from "../roles.js";
import { owner } from "../../organization/roles.js";

export default Blueprint.read(Membership, {
  by: "id",
  fields: ["organization", "person", "role"],
  allowed: [holder, owner.of("membership.organization")],
  budget: { p95: "50 millis" },
});
