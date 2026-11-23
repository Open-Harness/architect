import { Blueprint } from "orthograph";
import { Trigger } from "../thing.ts";
import { machine } from "../machine.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Trigger, {
  description: "Put a trigger back for evaluation.",
  payload: {
    superagent: Trigger.fields.superagent,
    trigger: Trigger.fields.id,
  },
  answer: {},
  move: machine.moves.requeue,
  allowed: [itsMain.of("superagent")],
});
