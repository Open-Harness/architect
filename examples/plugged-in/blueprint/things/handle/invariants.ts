import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { machine } from "./machine.ts";
import { HandleAlreadyOwned, HandleTaken } from "./errors.ts";

// A name has one holder while it is claimed. A released handle keeps its name and frees it.
export const oneHolderPerName = Blueprint.invariant.unique(Handle.fields.name, {
  while: [machine.states.claimed],
  refuse: HandleTaken,
});

// A person holds one claimed name at a time.
export const oneNamePerPerson = Blueprint.invariant.unique(Handle.fields.owner, {
  while: [machine.states.claimed],
  refuse: HandleAlreadyOwned,
  description: "you already hold a name", // the generated sentence reads poorly here
});
