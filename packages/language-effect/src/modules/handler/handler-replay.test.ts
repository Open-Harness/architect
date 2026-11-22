// M1.35 review, P1: an answer kept for a request key was filtered (by the server) under the roles of the call that made it.
// The same key with a different payload is a different request: it is refused, never answered with the kept answer.
import { Effect, Exit, Layer, Tracer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Busy } from "#modules/work/types.js";
import { BusyLive } from "#modules/work/service.js";
import { storeMemory } from "#modules/records/service.js";
import { Handlers } from "./service.ts";
import type { Handler } from "./types.ts";

const Org = Blueprint.thing({ description: "A group.", fields: { id: Blueprint.id("org") } });
const owner = Blueprint.role(Org, { rule: () => true });
const Locker = Blueprint.thing({
  description: "A locker.",
  fields: { id: Blueprint.id("lkr"), organization: Org.fields.id, note: Blueprint.visibility.private(Blueprint.text({ max: 40 }), owner) },
});
const open = Blueprint.operation(Locker, {
  description: "Open the lockers of an organisation.",
  payload: { organization: Locker.fields.organization },
  answer: { locker: Locker.fields.id, note: Locker.fields.note },
  allowed: [Blueprint.signedIn],
  idempotent: "request",
  steps: { read: Blueprint.step.database() },
});
const handler: Handler<typeof open> = ({ organization }, { steps }) =>
  steps.read(Effect.succeed({ locker: "lkr_1" as never, note: `NOTE-of-${organization}` }));

const ada = { kind: "person", person: "per_ada" } as const;

describe("a request key and the payload it was first used with", () => {
  it("refuses the same key with a payload naming another organisation, and never returns the kept answer", async () => {
    const store = storeMemory();
    const layer = Layer.mergeAll(BusyLive, store.layer);
    const served = Handlers.serve({ name: "locker.open", operation: open, handler });
    const first = await Effect.runPromiseExit(Effect.provide(served.run({ organization: "org_a" } as never, ada, "key-1"), layer));
    expect(Exit.isSuccess(first), "the first call is answered").toBe(true);
    const replay = await Effect.runPromiseExit(Effect.provide(served.run({ organization: "org_b" } as never, ada, "key-1"), layer));
    expect(Exit.isFailure(replay), "the same key with another payload is refused (an idempotency conflict), not answered from the kept answer").toBe(true);
    expect(JSON.stringify(replay), "no field of the first call's answer comes back").not.toContain("NOTE-of-org_a");
  });

  it("still answers a true replay (same key, same payload) from the kept answer", async () => {
    const store = storeMemory();
    const layer = Layer.mergeAll(BusyLive, store.layer);
    const served = Handlers.serve({ name: "locker.open", operation: open, handler });
    await Effect.runPromise(Effect.provide(served.run({ organization: "org_a" } as never, ada, "key-2"), layer));
    const again = await Effect.runPromiseExit(Effect.provide(served.run({ organization: "org_a" } as never, ada, "key-2"), layer));
    expect(Exit.isSuccess(again)).toBe(true);
  });
});

// M1.12a: the key a call was made with is an id, so it is on the operation span as the caller sent it, replays included.
describe("request.key on the operation span", () => {
  it("carries the caller's key on every attempt of a keyed call and on a replay, and nothing on a keyless call", async () => {
    const spans: Array<Tracer.NativeSpan> = [];
    const tracer = Tracer.make({ span: (options) => { const span = new Tracer.NativeSpan(options); spans.push(span); return span; } });
    const layer = Layer.mergeAll(BusyLive, storeMemory().layer);
    const served = Handlers.serve({ name: "locker.open", operation: open, handler });
    const call = (request?: string) => Effect.runPromise(Effect.provide(served.run({ organization: "org_a" } as never, ada, request), layer).pipe(Effect.provideService(Tracer.Tracer, tracer)));
    await call("key-3");
    await call("key-3");
    await call();
    const operation = spans.filter((s) => s.name === "locker.open").map((s) => Object.fromEntries(s.attributes));
    expect(operation.map((a) => a["request.key"]), "the key as sent, never the store's `locker.open|per_ada|key-3`").toEqual(["key-3", "key-3", undefined]);
    expect(operation[1], "the replay says both").toMatchObject({ "request.key": "key-3", "request.replayed": true });
  });
});
