// A journey's clock step (M8.07): whatever the door answers, `s.clock.now` is the world's real current instant. A refusal that came after
// the clock had moved (a wake that failed, a world that never went quiet) carries the instant the move reached, and the journey goes on from it.
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Blueprint, refuses } from "orthograph";
import { Journeys } from "./service.ts";

class WakeFailed { readonly _tag = "WakeFailed"; }
class BadMove { readonly _tag = "BadMove"; }

const START = "2027-01-10T09:00:00.000Z";
const REACHED = "2027-02-01T09:00:00.000Z";
let advances = 0;
const server = createServer((request, response) => {
  request.resume();
  request.on("end", () => {
    const json = (status: number, body: unknown) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
    if (request.url === "/_world/cast") return json(200, {});
    if (request.url === "/_world/clock") return json(200, { kind: "stepped", now: START, timers: [] });
    if (request.url === "/_world/clock/advance") {
      advances += 1;
      // The first advance reaches a timer on the way, and its wake fails: the clock is where it reached. The second is refused where it stands.
      return advances === 1
        ? json(500, { _tag: "WakeFailed", owner: "keeper/membership.renew/mem_1", name: "due", now: REACHED, message: "the keeper is down" })
        : json(400, { _tag: "BadMove", now: REACHED, message: "not a span" });
    }
    return json(404, { error: "not found" });
  });
});
let url = "";
beforeAll(() => new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => { url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); })));
afterAll(() => new Promise<void>((resolve) => { server.close(() => resolve()); }));

const project = { root: "", model: { operations: {} }, operations: new Map(), things: new Map(), journeys: [], startingWorlds: new Map() } as never;

describe("a refused clock step", () => {
  it("leaves s.clock.now at the instant the move reached, whatever the status: a failed wake and a refused move alike", async () => {
    advances = 0;
    const journey = Blueprint.journey("a move that fails after it moved", {
      cast: {},
      steps: (s) => [
        s.step("the wake fails after the clock moved", s.clock.advance("1 month"), refuses(WakeFailed as never, { now: s.clock.now })),
        s.step("a move refused where the clock stands", s.clock.advance("1 day"), refuses(BadMove as never, { now: s.clock.now })),
      ],
    });
    const run = await Effect.runPromise(Journeys.run(project, url, journey as never, 0));
    expect(run.stopped).toBeUndefined();
    expect(run.steps.map((step) => step.failures)).toEqual([[], []]);
  });
});
