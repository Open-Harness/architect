import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { Stage } from "../derive.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";
import { itsAgent } from "../roles.ts";

export default Blueprint.read(Ticket, {
  by: "id",
  fields: ["superagent", "title", "state"],
  derive: Stage,
  allowed: [Blueprint.signedIn, itsMain.of("superagent"), itsAgent],
});
