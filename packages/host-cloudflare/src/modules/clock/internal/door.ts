// The world's clock door, beside `cast` and `facts` (M8-checks call 9):
//   GET  /_world/clock           { kind, now, timers }
//   POST /_world/clock/advance   { span }  -> { now, fired }
//   POST /_world/clock/move-to   { to }    -> { now, fired }
// A real clock refuses a move with 409 `ClockNotMovable`. With a controller (the world's timers, M8.07) a move settles:
// it fires what is due on the way, waits for quiet, and fails as 409 `NeverQuiet` naming who is busy. Without one it only
// sets the instant.
import { Effect } from "effect";
import type { ClockReading, ClockState, Controller, Moved, Planned, Unsettled } from "../types.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const iso = (millis: number) => new Date(millis).toISOString();

/** Every refusal says where the world's clock stands now (`now`), so a caller that was refused after a move reached something still knows the instant. */
const refusal = (moved: Extract<Moved, { readonly ok: false }>, now: string): Response => json({ ...moved.body, now }, moved.status);

const unsettled = (why: Unsettled, now: string): Response =>
  why._tag === "Refused"
    ? json({ ...why.body, now }, why.status)
    : why._tag === "WorldReset"
    ? json({ _tag: "WorldReset", now, message: "the world was reset while this move was running: nothing was moved after it" }, 409)
    : why._tag === "NeverQuiet"
    ? json({ _tag: "NeverQuiet", busy: why.busy, now, message: `the world is never quiet: still busy ${why.busy.join(", ")}` }, 409)
    : json({ _tag: "WakeFailed", owner: why.owner, name: why.name, now, message: `the timer ${why.owner} ${why.name} failed to wake: ${why.message}` }, 500);

/** A planned move, made: settled by the controller, or only set when the world has none. */
const make = (state: ClockState, plan: () => Planned, controller: Controller | undefined): Promise<Response> => {
  if (controller === undefined) {
    const planned = plan();
    if (!planned.ok) return Promise.resolve(refusal(planned, iso(state.now())));
    const moved = state.moveTo(iso(planned.target));
    return Promise.resolve(moved.ok ? json({ now: iso(moved.now), fired: [] }) : refusal(moved, iso(state.now())));
  }
  return Effect.runPromise(controller.settle(plan).pipe(
    Effect.match({
      onSuccess: (settled) => json(settled),
      onFailure: (why) => unsettled(why, iso(state.now())),
    }),
  ));
};

export const clockDoor = (state: ClockState, request: Request, controller?: Controller): Promise<Response> | undefined => {
  const { pathname } = new URL(request.url);
  if (pathname === "/_world/clock" && request.method === "GET") {
    const reading: ClockReading = { kind: state.kind, now: iso(state.now()), timers: controller?.timers() ?? [] };
    return Promise.resolve(json(reading));
  }
  if (request.method !== "POST" || (pathname !== "/_world/clock/advance" && pathname !== "/_world/clock/move-to")) return undefined;
  return request.json().catch(() => ({})).then((body) => {
    const { span, to } = body as { readonly span?: unknown; readonly to?: unknown };
    if (pathname === "/_world/clock/advance") {
      return typeof span === "string" ? make(state, () => state.plan({ span }), controller) : Promise.resolve(json({ _tag: "BadMove", now: iso(state.now()), message: "advance names a span: { \"span\": \"1 month\" }" }, 400));
    }
    return typeof to === "string" ? make(state, () => state.plan({ to }), controller) : Promise.resolve(json({ _tag: "BadMove", now: iso(state.now()), message: "move-to names an instant: { \"to\": \"2027-01-10T09:00:00Z\" }" }, 400));
  });
};
