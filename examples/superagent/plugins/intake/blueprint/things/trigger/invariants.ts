import { Blueprint } from "orthograph";
import { Trigger } from "./thing.ts";

/** An event is one trigger of one superagent's source, whatever way it came: `trigger.receive` answers `duplicate` for a second, and a race for the first is a conflict the call runs again. */
export const oneTriggerPerEvent = Blueprint.invariant.unique([Trigger.fields.superagent, Trigger.fields.source, Trigger.fields.event]);
