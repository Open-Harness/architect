import { Effect } from "effect";
import type { ClockReading, WorldClockApi } from "./types.ts";
import { asked, bodyOf } from "./internal/door.ts";

export const WorldClock: WorldClockApi = {
  read: (url) =>
    asked(`${url}/_world/clock`).pipe(
      Effect.map((r) => (r.status === 200 ? (bodyOf(r.text) as ClockReading) : undefined)),
      Effect.orElseSucceed(() => undefined),
    ),
  move: (url, move) => {
    const [door, body] = "advance" in move ? ["advance", { span: move.advance }] as const : ["move-to", { to: move.moveTo }] as const;
    return asked(`${url}/_world/clock/${door}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).pipe(
      Effect.map((r) => ({ status: r.status, body: bodyOf(r.text) })),
      Effect.orElseSucceed(() => ({ status: 0, body: { _tag: "Unreachable", message: `the world at ${url} did not answer its clock door` } })),
    );
  },
};
