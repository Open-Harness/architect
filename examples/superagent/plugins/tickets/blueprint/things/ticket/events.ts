import { Blueprint } from "orthograph";
import { Ticket } from "./thing.ts";

export const TicketCreated = Blueprint.event({ superagent: Ticket.fields.superagent, ticket: Ticket.fields.id });
export const TicketEnded = Blueprint.event({ superagent: Ticket.fields.superagent, ticket: Ticket.fields.id });
export const TicketResumed = Blueprint.event({ superagent: Ticket.fields.superagent, ticket: Ticket.fields.id });
export const TicketStopped = Blueprint.event({ superagent: Ticket.fields.superagent, ticket: Ticket.fields.id });
