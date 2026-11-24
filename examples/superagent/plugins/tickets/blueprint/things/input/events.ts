import { Blueprint } from "orthograph";
import { Input } from "./thing.ts";
import { Agent } from "@orthograph/agents/blueprint/things/agent/thing.ts";

export const InputStored = Blueprint.event({ superagent: Input.fields.superagent, input: Input.fields.id, ticket: Input.fields.ticket });
export const InputRouted = Blueprint.event({ superagent: Input.fields.superagent, input: Input.fields.id, ticket: Input.fields.ticket, agent: Agent.fields.id, assignment: Blueprint.id("asg"), text: Input.fields.text });
export const InputDelivered = Blueprint.event({ superagent: Input.fields.superagent, input: Input.fields.id });
export const InputFailed = Blueprint.event({ superagent: Input.fields.superagent, input: Input.fields.id });
