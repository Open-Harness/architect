import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";

// The person who claimed the name.
export const handleOwner = Blueprint.role(Handle, { rule: (handle, caller) => handle.owner === caller.person });
