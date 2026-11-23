// M1.19's rule for log bodies: hidden payload text never reaches any logger, the exporters' included, only the recorder's.
import { Effect, Logger } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { recordingLogs } from "./decided.ts";

const fields = { memo: Blueprint.text({ max: 200 }), note: Blueprint.traced(Blueprint.text({ max: 200 })) };

describe("recordingLogs", () => {
  it("redacts untraced text for every logger it runs under, and keeps traced text", async () => {
    const exported: Array<string> = [];
    const exporter = Logger.make(({ message }) => { exported.push(JSON.stringify(message)); });
    const last = await Effect.runPromise(Effect.gen(function* () {
      const logs = yield* recordingLogs({ memo: "a private memo", note: "a traced note" }, fields);
      yield* logs.around(Effect.logInfo("Refused", "a private memo", { why: "a private memo" }, "a traced note"));
      return yield* logs.last;
    }).pipe(Effect.provide(Logger.layer([exporter]))));
    expect(exported).toHaveLength(1);
    expect(exported[0]).not.toContain("a private memo");
    expect(exported[0]).toContain("[redacted]");
    expect(exported[0]).toContain("a traced note");
    expect(last).not.toContain("a private memo");
    expect(last).toContain("a traced note");
  });

  it("leaves the loggers untouched when nothing is hidden", async () => {
    const exported: Array<string> = [];
    const exporter = Logger.make(({ message }) => { exported.push(JSON.stringify(message)); });
    await Effect.runPromise(Effect.gen(function* () {
      const logs = yield* recordingLogs({ note: "a traced note" }, fields);
      yield* logs.around(Effect.logInfo("ok", "a traced note"));
    }).pipe(Effect.provide(Logger.layer([exporter]))));
    expect(exported).toEqual([JSON.stringify(["ok", "a traced note"])]);
  });
});
