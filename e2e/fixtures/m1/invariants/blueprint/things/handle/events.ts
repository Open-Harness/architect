import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";

export const HandleClaimed = Blueprint.event({ handle: Handle.fields.id });
export const HandleReleased = Blueprint.event({ handle: Handle.fields.id });
