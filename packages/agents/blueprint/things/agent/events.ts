import { Blueprint } from "orthograph";
import { Agent } from "./thing.ts";

export const AgentOpened = Blueprint.event({ agent: Agent.fields.id, kind: Agent.fields.kind, about: Agent.fields.about });
export const AgentTold = Blueprint.event({ agent: Agent.fields.id, requestId: Blueprint.text({ max: 120 }) });
export const AgentIdled = Blueprint.event({ agent: Agent.fields.id, about: Agent.fields.about, assignment: Blueprint.optional(Blueprint.id("asg")) });
export const AgentClosed = Blueprint.event({ agent: Agent.fields.id, assignment: Blueprint.id("asg") });
