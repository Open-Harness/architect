import { Blueprint } from "orthograph";
import { Policy } from "./thing.ts";

export const PolicyChanged = Blueprint.event({ superagent: Policy.fields.superagent, revision: Policy.fields.revision });
