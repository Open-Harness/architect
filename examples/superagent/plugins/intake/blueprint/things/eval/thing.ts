import { Blueprint } from "orthograph";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const Eval = Blueprint.thing({
  description: "One judgement the main agent is asked for: a thread's waiting triggers, batched.",
  fields: {
    id: Blueprint.id("evl"),
    superagent: Superagent.fields.id,
    thread: Blueprint.id("thr"),
    triggers: Blueprint.list(Blueprint.text({ max: 120 })),
    activeAtStart: Blueprint.uint(64),
    timeoutMs: Blueprint.uint(64),
    /** The superagent's active clock (the wall clock less its pauses) when the main agent was told (`eval.delivered`): an overdue eval is judged from it, on the same clock. */
    deliveredAt: Blueprint.optional(Blueprint.uint(64)),
  },
  code: "EV",
});
