import { Blueprint } from "orthograph";
import { Input } from "../thing.ts";
import { machine } from "../machine.ts";
import { TriggerReceived } from "@orthograph/intake/blueprint/things/trigger/events.ts";
import { Ticket } from "../../ticket/thing.ts";

export default Blueprint.operation(Input, {
  description: "Store a message for a ticket's executor: a person's, or a followed thread's trigger.",
  payload: {
    superagent: Input.fields.superagent,
    ticket: Blueprint.optional(Ticket.fields.id.value),
    thread: Blueprint.text({ max: 200 }),
    from: Input.fields.from,
    text: Input.fields.text,
  },
  answer: {
    input: Input.fields.id,
  },
  move: machine.moves.stored,
  allowed: [Blueprint.system],
  on: [Blueprint.on(TriggerReceived, (e) => ({ superagent: e.superagent, thread: e.thread, from: "trigger", text: e.text }))],
});
