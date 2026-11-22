import { DateTime, Option } from "effect";
import { Spans } from "orthograph/server";
import type { ClockModel, MoveTimeModel, TimesApi } from "./types.ts";
import { anchorProblems } from "./internal/anchor.ts";

const spanProblem = (where: string, what: string, span: string): ReadonlyArray<string> => {
  const read = Spans.read(span);
  return read !== undefined && read.count >= 1 ? [] : [`${where} is made by time, but its ${what} "${span}" isn't a span like "1 month" or "14 days"`];
};

export const Times: TimesApi = {
  move: ({ name, thing, key, move }) => {
    const where = `${name}.${key}`;
    const { by, late, lazy } = move;
    if (by === undefined) {
      const stray = [late === undefined ? "" : "late", lazy === undefined ? "" : "lazy"].filter((s) => s !== "");
      return { time: undefined, problems: stray.length === 0 ? [] : [`${where} declares ${stray.join(" and ")} but is not made by time: give it a \`by\``] };
    }
    const problems = [
      ...(move.from.length === 0 ? [`${where} is made by time, but it has no from state: a move that creates the thing has nothing to count from`] : []),
      ...spanProblem(where, "span", by.span),
      ...(late === undefined ? [] : spanProblem(where, "late", late)),
      ...anchorProblems(where, thing, by),
    ];
    const time: MoveTimeModel = {
      by: by.kind === "after"
        ? { kind: "after", field: by.field, span: by.span }
        : { kind: "every", span: by.span, ...(by.from === undefined ? {} : { from: by.from }), ...(by.on === undefined ? {} : { on: by.on }), ...(by.zone === undefined ? {} : { zone: by.zone }) },
      ...(late === undefined ? {} : { late }),
      ...(lazy === true ? { lazy: true as const } : {}),
    };
    return { time, problems };
  },
  clock: ({ file, clock }) => {
    if (clock.which === "real") return { clock: { kind: "real" } satisfies ClockModel, problems: [] };
    const starts = DateTime.make(clock.starts);
    if (Option.isNone(starts)) return { clock: undefined, problems: [`${file}: the clock starts at "${clock.starts}", which isn't an instant (ISO 8601, like 2027-01-10T09:00:00Z)`] };
    const at = DateTime.formatIso(starts.value);
    if (clock.which === "stepped") return { clock: { kind: "stepped", starts: at }, problems: [] };
    if (!(clock.speed > 0) || !Number.isFinite(clock.speed)) return { clock: undefined, problems: [`${file}: the scaled clock's speed ${String(clock.speed)} must be a number above 0`] };
    return { clock: { kind: "scaled", starts: at, speed: clock.speed }, problems: [] };
  },
};
