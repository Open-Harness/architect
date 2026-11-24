import { Blueprint } from "orthograph";
import { OutgoingMessage } from "./thing.ts";

export const ReplyQueued = Blueprint.event({ superagent: OutgoingMessage.fields.superagent, ticket: OutgoingMessage.fields.ticket, message: OutgoingMessage.fields.id });
export const ReplySettled = Blueprint.event({ superagent: OutgoingMessage.fields.superagent, message: OutgoingMessage.fields.id });
export const ReplyWithdrawn = Blueprint.event({ superagent: OutgoingMessage.fields.superagent, message: OutgoingMessage.fields.id });
