import { Blueprint } from "orthograph";
import { Thread } from "../thing.ts";
import { machine } from "../machine.ts";
import { itsMain } from "@orthograph/superagent/blueprint/things/superagent/roles.ts";

export default Blueprint.operation(Thread, {
  description: "Stop a ticket following a thread: a person's call, or the main agent's.",
  payload: { superagent: Thread.fields.superagent, thread: Thread.fields.id },
  answer: {  },
  move: machine.moves.unsubscribe,
  allowed: [Blueprint.signedIn, itsMain.of("superagent")],
});
