import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WorldClock } from "./service.ts";

const asked: Array<string> = [];
const server = createServer((request, response) => {
  let text = "";
  request.on("data", (chunk: Buffer) => (text += chunk.toString()));
  request.on("end", () => {
    asked.push(`${request.method} ${request.url} ${text}`);
    const json = (status: number, body: unknown) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
    if (request.url === "/_world/clock") return json(200, { kind: "stepped", now: "2027-01-10T09:00:00.000Z", timers: [] });
    if (request.url === "/_world/clock/advance") return json(200, { now: "2027-02-10T09:00:00.000Z", fired: [] });
    if (request.url === "/_world/clock/move-to") return json(409, { _tag: "ClockNotMovable", message: "this world runs on the real clock" });
    return json(404, { error: "not found" });
  });
});
let url = "";
beforeAll(() => new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => { url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; resolve(); })));
afterAll(() => new Promise<void>((resolve) => { server.close(() => resolve()); }));

describe("the world's clock door, as a journey's clock step uses it", () => {
  it("reads the clock, and moves it by a span or to an instant, answering the door's own words", async () => {
    asked.length = 0;
    expect(await Effect.runPromise(WorldClock.read(url))).toMatchObject({ kind: "stepped", now: "2027-01-10T09:00:00.000Z" });
    expect(await Effect.runPromise(WorldClock.move(url, { advance: "1 month" }))).toEqual({ status: 200, body: { now: "2027-02-10T09:00:00.000Z", fired: [] } });
    expect(await Effect.runPromise(WorldClock.move(url, { moveTo: "2030-01-01T00:00:00Z" }))).toMatchObject({ status: 409, body: { _tag: "ClockNotMovable" } });
    expect(asked).toEqual([
      "GET /_world/clock ",
      `POST /_world/clock/advance {"span":"1 month"}`,
      `POST /_world/clock/move-to {"to":"2030-01-01T00:00:00Z"}`,
    ]);
  });

  it("has no clock to read where nothing answers, and says so when a move cannot be asked", async () => {
    expect(await Effect.runPromise(WorldClock.read("http://127.0.0.1:1"))).toBeUndefined();
    expect(await Effect.runPromise(WorldClock.move("http://127.0.0.1:1", { advance: "1 day" }))).toMatchObject({ status: 0, body: { _tag: "Unreachable" } });
  });
});
