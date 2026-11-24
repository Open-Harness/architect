import { Blueprint } from "orthograph";
import { Assignment } from "./thing.ts";

export const AssignmentQueued = Blueprint.event({ superagent: Assignment.fields.superagent, assignment: Assignment.fields.id, ticket: Assignment.fields.ticket, input: Assignment.fields.input, why: Assignment.fields.why });
export const AssignmentStarted = Blueprint.event({ superagent: Assignment.fields.superagent, assignment: Assignment.fields.id, ticket: Assignment.fields.ticket, agent: Assignment.fields.agent, input: Assignment.fields.input, text: Blueprint.text({ max: 65536 }), seat: Assignment.fields.seat, why: Assignment.fields.why });
export const AssignmentEnded = Blueprint.event({ superagent: Assignment.fields.superagent, assignment: Assignment.fields.id, ticket: Assignment.fields.ticket, seat: Assignment.fields.seat });
export const AssignmentInterrupted = Blueprint.event({ superagent: Assignment.fields.superagent, assignment: Assignment.fields.id, ticket: Assignment.fields.ticket, agent: Assignment.fields.agent, seat: Assignment.fields.seat });
export const AssignmentPromoted = Blueprint.event({ superagent: Assignment.fields.superagent, assignment: Assignment.fields.id, ticket: Assignment.fields.ticket });
