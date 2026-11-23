// M1.35 review: a handler's log hides a hidden PAYLOAD value of any type, as it does a stored one, never only a string.
// The operation's payload declares private fields; the handler logs each value in its message and as an annotation named for the field.
import { Effect, Logger, Schema } from "effect";
import { CurrentLogAnnotations } from "effect/References";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { recordingLogs } from "./decided.ts";

const Org = Blueprint.thing({ description: "A group.", fields: { id: Blueprint.id("org") } });
const owner = Blueprint.role(Org, { rule: () => true });
const fields = {
  amount: Blueprint.visibility.private(Blueprint.value(Schema.Number), owner),
  approved: Blueprint.visibility.private(Blueprint.value(Schema.Boolean), owner),
  limits: Blueprint.visibility.secret(Blueprint.value(Schema.Struct({ ceiling: Schema.String }))),
  note: Blueprint.visibility.private(Blueprint.text({ max: 40 }), owner),
  count: Blueprint.value(Schema.Number),
};
const payload = { amount: 48213, approved: true, limits: { ceiling: "CEILING-5519" }, note: "NOTE-private-7742", count: 7391 };

/** Every record every logger saw: the message and the annotations an exporter reads, as JSON text. */
const logged = (handler: Effect.Effect<unknown>) => {
  const seen: Array<string> = [];
  const exporter = Logger.make(({ message, fiber }) => { seen.push(JSON.stringify({ message, annotations: fiber.getRef(CurrentLogAnnotations) })); });
  return Effect.runPromise(Effect.gen(function* () {
    const logs = yield* recordingLogs(payload, fields);
    yield* logs.around(handler);
  }).pipe(Effect.provide(Logger.layer([exporter])))).then(() => seen.join("\n"));
};

describe("recordingLogs hides a payload value the telemetry audience is not shown, whatever its type", () => {
  it("a private number, in an annotation and in a message body", async () => {
    const out = await logged(Effect.logInfo(`amount is ${payload.amount}`).pipe(Effect.annotateLogs({ amount: payload.amount })));
    expect(out, "the annotation").not.toContain("48213");
    expect(out).toContain("[redacted]");
  });

  it("a private boolean, in an annotation and in a message body", async () => {
    const out = await logged(Effect.logInfo(`approved: ${payload.approved}`).pipe(Effect.annotateLogs({ approved: payload.approved })));
    expect(out, "the annotation").not.toContain('"approved":true');
    expect(out, "the message body").not.toContain("approved: true");
  });

  it("a secret object, in an annotation and in a message body", async () => {
    const out = await logged(Effect.logInfo(`limits ${JSON.stringify(payload.limits)}`).pipe(Effect.annotateLogs({ limits: payload.limits })));
    expect(out).not.toContain("CEILING-5519");
  });

  it("a private string stays hidden, as before", async () => {
    const out = await logged(Effect.logInfo(`note ${payload.note}`).pipe(Effect.annotateLogs({ note: payload.note })));
    expect(out).not.toContain("NOTE-private-7742");
  });

  it("a public non-text number still appears unredacted", async () => {
    const out = await logged(Effect.logInfo(`count is ${payload.count}`).pipe(Effect.annotateLogs({ count: payload.count })));
    expect(out, "the annotation").toContain('"count":7391');
    expect(out, "the message body").toContain("count is 7391");
  });
});
