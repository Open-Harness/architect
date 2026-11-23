import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { machine } from "./machine.ts";

// A name has one holder while it is claimed. A released handle keeps its name and frees it. No refusal is named: the claim handler looks the name up and refuses.
export const oneHolderPerName = Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed] });
