import { Blueprint } from "orthograph";
import { Ticket } from "./thing.ts";

/** The ticket's own executor, acting as itself (K40 fix 3): the role over its `agent` field. */
export const itsAgent = Blueprint.role(Ticket, { agent: Ticket.fields.agent });
