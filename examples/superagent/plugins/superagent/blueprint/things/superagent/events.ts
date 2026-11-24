import { Blueprint } from "orthograph";
import { Superagent } from "./thing.ts";

export const SuperagentCreated = Blueprint.event({ superagent: Superagent.fields.id });
export const SuperagentWentLive = Blueprint.event({ superagent: Superagent.fields.id });
export const SuperagentPaused = Blueprint.event({ superagent: Superagent.fields.id, from: Blueprint.text({ max: 20 }), at: Blueprint.uint(64) });
export const SuperagentResumed = Blueprint.event({ superagent: Superagent.fields.id, to: Blueprint.text({ max: 20 }), at: Blueprint.uint(64), length: Blueprint.uint(64) });
export const SuperagentRetired = Blueprint.event({ superagent: Superagent.fields.id });
