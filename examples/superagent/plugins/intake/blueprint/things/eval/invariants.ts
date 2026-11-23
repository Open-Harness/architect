import { Blueprint } from "orthograph";
import { Eval } from "./thing.ts";
import { machine } from "./machine.ts";

/**
 * One eval runs on a thread at a time: queued or delivered. Two passes of `eval.due` that overlap can each see a thread with nothing running,
 * so the commit enforces it: the pass that loses runs again, finds the eval the other made, and makes nothing.
 */
export const oneLiveEvalPerThread = Blueprint.invariant.unique(Eval.fields.thread, { while: [machine.states.queued, machine.states.delivered], retry: true });
