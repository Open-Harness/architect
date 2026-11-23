// Says when a move made by time happens, in the words M8-checks call 10 fixes: "every month from `startedAt`",
// "14 days after `overdueAt`", "every month on day 25, in Europe/London", "every month on the last day, in Europe/London",
// then "by the keeper", or for a lazy move "worked out at the purse's next use". A move a person makes says nothing.
import type { MoveTimeModel, OperationModel, Model } from "@orthograph/compiler";

/** `"1 month"` is "month" and `"2 months"` stays as it is: "every month", "every 2 months". */
const period = (span: string): string => (span.startsWith("1 ") ? span.slice(2).replace(/s$/, "") : span);

const anchor = (by: MoveTimeModel["by"], mark: string): string => {
  if (by.kind === "after") return `${by.span} after ${mark}${by.field}${mark}`;
  const every = `every ${period(by.span)}`;
  if (by.from !== undefined) return `${every} from ${mark}${by.from}${mark}`;
  const on = by.on === undefined ? "" : "weekday" in by.on ? ` on ${by.on.weekday}` : by.on.day === "last" ? " on the last day" : ` on day ${by.on.day}`;
  return `${every}${on}, in ${by.zone ?? "UTC"}`;
};

/** The move an operation makes, when it is made by time. */
export const timeMoveOf = (model: Model, op: OperationModel): MoveTimeModel | undefined => {
  const moves = model.things[op.thing]?.machine?.moves;
  const move = op.move === null ? undefined : moves?.[op.move.key];
  return move?.by === undefined ? undefined : { by: move.by, ...(move.late === undefined ? {} : { late: move.late }), ...(move.lazy === undefined ? {} : { lazy: move.lazy }) };
};

/** The sentence, without its full stop; `mark` quotes a field name (backticks in markdown, nothing in plain text). */
export const whenWords = (thing: string, time: MoveTimeModel, mark: string): string =>
  [anchor(time.by, mark), time.lazy === true ? `worked out at the ${thing}'s next use` : "by the keeper", ...(time.late === undefined ? [] : [`up to ${time.late} late`])].join(", ");
