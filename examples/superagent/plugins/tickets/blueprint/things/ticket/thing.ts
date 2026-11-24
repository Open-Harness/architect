import { Blueprint } from "orthograph";
import { Agent } from "@orthograph/agents/blueprint/things/agent/thing.ts";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const Ticket = Blueprint.thing({
  description: "One piece of work a superagent was allowed to do, with the executor that works it.",
  fields: {
    id: Blueprint.id("tkt"),
    superagent: Superagent.fields.id,
    title: Blueprint.text({ max: 200 }),
    agent: Agent.fields.id,
    seq: Blueprint.uint(64),
  },
  code: "TI",
});
