import { Blueprint } from "orthograph";
import { Decision } from "../thing.ts";
import { machine } from "../machine.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Decision, {
  description: "Route an eval's items: one to twenty, each accept, attach, stop or ignore. In observe an accept is only recorded as one it would make.",
  payload: {
    superagent: Decision.fields.superagent,
    eval: Decision.fields.eval,
    items: Decision.fields.items,
  },
  answer: {
    decision: Decision.fields.id,
  },
  move: machine.moves.route,
  allowed: [itsMain.of("superagent")],
});
