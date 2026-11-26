import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";
import { Account } from "@orthograph/intake/blueprint/things/account/thing.ts";

export const Mandate = Blueprint.thing({
  description: "What a ticket may do, pinned to the policy version it was accepted under.",
  fields: {
    id: Blueprint.id("mnd"),
    superagent: Superagent.fields.id,
    ticket: Ticket.fields.id,
    account: Account.fields.id,
    policy: Blueprint.uint(32),
  },
  code: "MA",
});
