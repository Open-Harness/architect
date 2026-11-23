import { Blueprint } from "orthograph";
import { Superagent } from "../things/superagent/thing.ts";
import { Assignment } from "@orthograph/tickets/blueprint/things/assignment/thing.ts";

/** One executor per ticket, from its first ask to its last review: a pool of seats, plus one kept for a person's message (GOAL17-executor-slots). */
export default Blueprint.agent({
  model: "deepseek-v4-flash-0731", // the playbook's model, when it names one
  slots: { size: Superagent.fields.slots, reserve: 1, held: Assignment },
  background: { after: "5 seconds", keep: "30 minutes" },
});
