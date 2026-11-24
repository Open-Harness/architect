import { Blueprint } from "orthograph";
import { Attention } from "./thing.ts";

export const AttentionRaised = Blueprint.event({ superagent: Attention.fields.superagent, attention: Attention.fields.id, ticket: Attention.fields.ticket });
