import { Blueprint } from "orthograph";
import { Assignment } from "./thing.ts";
import { machine } from "./machine.ts";
import { ExecutorAlreadyQueued, SeatTaken } from "./errors.ts";

/** A seat has one holder while it is held: a closing Assignment still holds its seat. */
export const oneHolderPerSeat = Blueprint.invariant.unique(
  [Assignment.fields.superagent, Assignment.fields.seat],
  { while: [machine.states.running, machine.states.closing], refuse: SeatTaken },
);

/** An executor has one live Assignment: queued, running or closing. */
export const oneLivePerExecutor = Blueprint.invariant.unique(
  Assignment.fields.agent,
  { while: [machine.states.pending, machine.states.running, machine.states.closing], refuse: ExecutorAlreadyQueued },
);
