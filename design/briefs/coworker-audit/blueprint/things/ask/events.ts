import { Blueprint } from "orthograph";
import { Ask } from "./thing.ts";

export const AskRaised = Blueprint.event({ ask: Ask.fields.id, to: Ask.fields.to, manager: Ask.fields.manager, need: Ask.fields.need });
/** Joined to ManagerWoken, so the answer is the manager's next turn. */
export const AskAnswered = Blueprint.event({ ask: Ask.fields.id, manager: Ask.fields.manager, about: Ask.fields.about, answer: Ask.fields.answer });
export const AskPassed = Blueprint.event({ ask: Ask.fields.id, to: Ask.fields.to });
export const AskLapsed = Blueprint.event({ ask: Ask.fields.id, manager: Ask.fields.manager });
