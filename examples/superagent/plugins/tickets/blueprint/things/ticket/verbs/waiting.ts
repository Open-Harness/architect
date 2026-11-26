import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { Stage } from "../derive.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.read(Ticket, {
  where: ["superagent", "stage"],
  only: { stage: "person" },
  derive: Stage,
  order: "newest",
  page: 50,
  allowed: [Blueprint.signedIn, itsMain.of("superagent")],
  budget: { p95: "150 millis" },
});
