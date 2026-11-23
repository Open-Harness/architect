import { Blueprint } from "orthograph";
import { Agent } from "@orthograph/agents/blueprint/things/agent/thing.ts";

export const Ticket = Blueprint.thing({
  description: "One piece of work a superagent was allowed to do, with the executor that works it.",
  fields: {
    id: Blueprint.id("tkt"),
    superagent: Blueprint.id("sag"),
    title: Blueprint.text({ max: 200 }),
    agent: Agent.fields.id,
    seq: Blueprint.uint(64),
  },
  code: "TI",
});
