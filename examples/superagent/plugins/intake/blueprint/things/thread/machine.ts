import { Blueprint } from "orthograph";
import { Thread } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Thread, {
  states: ["idle", "queued", "evaluating"],
  moves: {
    bind: { from: [], to: "idle", emits: Events.ThreadSubscribed },
    closed: { from: ["idle", "queued", "evaluating"], to: "idle", emits: Events.ThreadClosed },
    unsubscribe: { from: ["idle", "queued", "evaluating"], to: "idle", emits: Events.ThreadUnsubscribed },
    queue: { from: ["idle"], to: "queued", emits: Events.ThreadQueued },
    evaluate: { from: ["queued"], to: "evaluating", emits: Events.ThreadEvaluating },
    release: { from: ["evaluating"], to: "idle", emits: Events.ThreadReleased },
  },
  notFrom: { exit: 84 },
});
