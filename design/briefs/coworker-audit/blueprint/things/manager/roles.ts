import { Blueprint } from "orthograph";
import { Manager } from "./thing.ts";

/** The manager itself, acting as itself (K40 fix 3): the role over its `agent` field. Form exists; the agent caller is in #781. */
export const itsManager = Blueprint.role(Manager, { agent: Manager.fields.agent });
