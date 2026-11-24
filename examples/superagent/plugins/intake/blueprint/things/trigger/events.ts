import { Blueprint } from "orthograph";
import { Trigger } from "./thing.ts";

export const TriggerReceived = Blueprint.event({ superagent: Trigger.fields.superagent, trigger: Trigger.fields.id, thread: Trigger.fields.thread, text: Trigger.fields.text });
export const TriggerRequeued = Blueprint.event({ superagent: Trigger.fields.superagent, trigger: Trigger.fields.id });
