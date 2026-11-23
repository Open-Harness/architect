import { Blueprint } from "orthograph";
import { Eval } from "../thing.ts";
import { TriggerRequeued } from "../../trigger/events.ts";
import { ThreadSubscribed, ThreadUnsubscribed } from "../../thread/events.ts";
import { DecisionRecorded } from "../../decision/events.ts";

export default Blueprint.operation(Eval, {
  description: "One pass of the eval clock: batch each thread's waiting triggers into an eval, and expire the ones that ran out of time. Not armed again while paused.",
  payload: {
    superagent: Eval.fields.superagent,
  },
  answer: {
    started: Blueprint.uint(32),
  },
  allowed: [Blueprint.system],
  on: [Blueprint.on(TriggerRequeued, (e) => ({ superagent: e.superagent })), Blueprint.on(ThreadSubscribed, (e) => ({ superagent: e.superagent })), Blueprint.on(ThreadUnsubscribed, (e) => ({ superagent: e.superagent })), Blueprint.on(DecisionRecorded, (e) => ({ superagent: e.superagent }))],
});
