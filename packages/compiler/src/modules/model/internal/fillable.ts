// An event the runtime can't fill (K16, M1.48): the move's event is built from the subject as the call left it, then the
// payload, then the answer (`language-effect`'s `applyMove`). A field in none of them would die at commit, so the
// compiler refuses the blueprint instead, naming the event, the field and each operation that makes the move.
import type { Operation } from "orthograph";

/** One problem per event field nothing can fill, for this operation's move. */
export const unfillable = (op: Operation, name: string, thing: string, event: string, eventsFile: string): ReadonlyArray<string> => {
  if (!op.move) return [];
  const supplied = new Set([...Object.keys(op.thing.fields), ...Object.keys(op.payload), ...Object.keys(op.answer)]);
  return Object.keys(op.move.emits.fields)
    .filter((field) => !supplied.has(field))
    .map((field) => `${eventsFile}: ${event}.${field} is in none of ${thing}'s fields, ${name}'s payload or its answer, so nothing can fill it`);
};
