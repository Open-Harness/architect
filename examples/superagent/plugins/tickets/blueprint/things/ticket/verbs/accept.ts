import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";
import { machine } from "../machine.ts";
import { listed } from "@orthograph/intake/blueprint/things/account/roles.ts";
import { Mandate } from "../../mandate/thing.ts";
import { Subscription } from "../../subscription/thing.ts";
import { Assignment } from "../../assignment/thing.ts";
import { Input } from "../../input/thing.ts";
import { Account } from "@orthograph/intake/blueprint/things/account/thing.ts";

export default Blueprint.operation(Ticket, {
  description: "Make a ticket from an accepted trigger: its mandate, subscription, first assignment and first input, in one commit.",
  payload: {
    superagent: Ticket.fields.superagent,
    account: Account.fields.id,
    title: Ticket.fields.title,
    agent: Ticket.fields.agent,
    thread: Blueprint.text({ max: 200 }),
    text: Blueprint.text({ max: 65536 }),
  },
  answer: {
    ticket: Ticket.fields.id,
  },
  move: machine.moves.accept,
  allowed: [listed.of("account")],
  steps: { write: Blueprint.step.database({ writes: [Ticket, Mandate, Subscription, Assignment, Input] }) },
});
