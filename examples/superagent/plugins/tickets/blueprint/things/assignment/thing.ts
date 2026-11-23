import { Blueprint } from "orthograph";
import { Ticket } from "../ticket/thing.ts";
import { Agent } from "@orthograph/agents/blueprint/things/agent/thing.ts";
import { Input } from "../input/thing.ts";

export const Assignment = Blueprint.thing({
  description: "One stretch of a ticket's executor holding a seat: it waits, runs, ends.",
  fields: {
    id: Blueprint.id("asg"),
    superagent: Blueprint.id("sag"),
    ticket: Ticket.fields.id,
    agent: Agent.fields.id,
    input: Input.fields.id,
    why: Blueprint.oneOf(["launch", "person", "input"]),
    seat: Blueprint.uint(8),
  },
  code: "AS",
});
