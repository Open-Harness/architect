import { Blueprint } from "orthograph";

export const Eval = Blueprint.thing({
  description: "One judgement the main agent is asked for: a thread's waiting triggers, batched.",
  fields: {
    id: Blueprint.id("evl"),
    superagent: Blueprint.id("sag"),
    thread: Blueprint.id("thr"),
    triggers: Blueprint.list(Blueprint.text({ max: 120 })),
    activeAtStart: Blueprint.uint(64),
    timeoutMs: Blueprint.uint(64),
    /** The clock's reading when the main agent was told (`eval.delivered`): an overdue eval is judged from it. */
    deliveredAt: Blueprint.optional(Blueprint.uint(64)),
  },
  code: "EV",
});
