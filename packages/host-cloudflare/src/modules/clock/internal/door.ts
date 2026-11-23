// The world's clock door, beside `cast` and `facts` (M8-checks call 9):
//   GET  /_world/clock           { kind, now, timers }
//   POST /_world/clock/advance   { span }  -> { now, fired }
//   POST /_world/clock/move-to   { to }    -> { now, fired }
// A real clock refuses a move with 409 `ClockNotMovable`. Settling (firing what is due on the way, waiting for quiet,
// `NeverQuiet`) is the controller's, M8.07; here a move sets the instant, and nothing is due because no timer table exists yet.
import type { ClockReading, ClockState, Moved } from "../types.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const iso = (millis: number) => new Date(millis).toISOString();

const answer = (moved: Moved): Response => (moved.ok ? json({ now: iso(moved.now), fired: [] }) : json(moved.body, moved.status));

export const clockDoor = (state: ClockState, request: Request): Promise<Response> | undefined => {
  const { pathname } = new URL(request.url);
  if (pathname === "/_world/clock" && request.method === "GET") {
    const reading: ClockReading = { kind: state.kind, now: iso(state.now()), timers: [] };
    return Promise.resolve(json(reading));
  }
  if (request.method !== "POST" || (pathname !== "/_world/clock/advance" && pathname !== "/_world/clock/move-to")) return undefined;
  return request.json().catch(() => ({})).then((body) => {
    const { span, to } = body as { readonly span?: unknown; readonly to?: unknown };
    if (pathname === "/_world/clock/advance") return answer(typeof span === "string" ? state.advance(span) : { ok: false, status: 400, body: { _tag: "BadMove", message: "advance names a span: { \"span\": \"1 month\" }" } });
    return answer(typeof to === "string" ? state.moveTo(to) : { ok: false, status: 400, body: { _tag: "BadMove", message: "move-to names an instant: { \"to\": \"2027-01-10T09:00:00Z\" }" } });
  });
};
