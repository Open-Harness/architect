import { Blueprint } from "orthograph";
import { Superagent } from "./thing.ts";

/** The superagent's main agent, acting as itself (K40 fix 3): the role over its `main` field. */
export const itsMain = Blueprint.role(Superagent, { agent: Superagent.fields.main });
