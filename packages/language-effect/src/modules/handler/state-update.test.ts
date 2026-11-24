// A handler served by `Handlers.serve` is given its records watched (so a log never says a hidden value), and the watching wrapper must hand every
// argument on: `records.update(thing, id, changes, state)` moves the instance to `state` in the commit, as the unwrapped records do.
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Records, Store } from "#modules/records/types.js";
import { storeMemory } from "#modules/records/service.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "./service.ts";

const Job = Blueprint.thing({ description: "A job.", fields: { id: Blueprint.id("job"), title: Blueprint.text() }, code: "JB" });
const sweep = Blueprint.operation(Job, { description: "End a job with no move.", payload: { job: Job.fields.id }, answer: {}, allowed: [Blueprint.system] });
const system = { kind: "system" } as const;

describe("a handler served by Handlers.serve", () => {
  it("moves an instance to the state it names with records.update, and keeps the changes it made beside it", async () => {
    const store = storeMemory([[Job, { id: "job_1", title: "first", state: "waiting" }]]);
    const served = Handlers.serve({
      name: "job.sweep", operation: sweep,
      handler: (({ job }: { job: string }) => Effect.flatMap(Records, (records) => Effect.as(records.update(Job, job, { title: "done" }, "ended"), {}))) as never,
    });
    await Effect.runPromise((served.run({ job: "job_1" } as never, system) as Effect.Effect<unknown, unknown, never>).pipe(Effect.provide(Layer.mergeAll(BusyLive, store.layer))));
    const after = await Effect.runPromise(Effect.flatMap(Store, (s) => s.find(Job, "job_1")).pipe(Effect.provide(store.layer)));
    expect(after?.instance).toMatchObject({ title: "done", state: "ended" });
  });

  it("leaves the state alone when none is named", async () => {
    const store = storeMemory([[Job, { id: "job_1", title: "first", state: "waiting" }]]);
    const served = Handlers.serve({
      name: "job.sweep", operation: sweep,
      handler: (({ job }: { job: string }) => Effect.flatMap(Records, (records) => Effect.as(records.update(Job, job, { title: "renamed" }), {}))) as never,
    });
    await Effect.runPromise((served.run({ job: "job_1" } as never, system) as Effect.Effect<unknown, unknown, never>).pipe(Effect.provide(Layer.mergeAll(BusyLive, store.layer))));
    const after = await Effect.runPromise(Effect.flatMap(Store, (s) => s.find(Job, "job_1")).pipe(Effect.provide(store.layer)));
    expect(after?.instance).toMatchObject({ title: "renamed", state: "waiting" });
  });
});
