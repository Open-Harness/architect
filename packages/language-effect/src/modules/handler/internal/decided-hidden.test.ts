// M1.35 review, P1: a handler's log hides what the telemetry audience is not shown, by value, whatever its type or length.
// The handler loads a stored thing and logs each value as a log attribute and inside a message body.
import { Effect, Logger, Schema } from "effect";
import { CurrentLogAnnotations } from "effect/References";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import type { Records } from "#modules/records/types.js";
import { recordingLogs } from "./decided.ts";

const Org = Blueprint.thing({ description: "A group.", fields: { id: Blueprint.id("org") } });
const owner = Blueprint.role(Org, { rule: () => true });
const Vault = Blueprint.thing({
  description: "A vault with hidden fields of several types.",
  fields: {
    id: Blueprint.id("vlt"),
    open: Blueprint.visibility.private(Blueprint.value(Schema.Boolean), owner),
    contents: Blueprint.visibility.secret(Blueprint.value(Schema.Struct({ combination: Schema.String, spare: Schema.String }))),
    tag: Blueprint.visibility.secret(Blueprint.text({ max: 8 })),
  },
});
const stored = { id: "vlt_1", open: true, contents: { combination: "COMBO-7731", spare: "SPARE-9921" }, tag: "zq" };

/** Every record every logger saw: the message and the annotations an exporter reads, as JSON text. */
const logged = (handler: Effect.Effect<unknown>) => {
  const seen: Array<string> = [];
  const exporter = Logger.make(({ message, fiber }) => { seen.push(JSON.stringify({ message, annotations: fiber.getRef(CurrentLogAnnotations) })); });
  const records = { find: () => Effect.succeed(stored), insert: () => Effect.void, update: () => Effect.void } as unknown as Records["Service"];
  return Effect.runPromise(Effect.gen(function* () {
    const logs = yield* recordingLogs({}, {});
    yield* logs.around(Effect.gen(function* () {
      yield* logs.watching(records).find(Vault, "vlt_1" as never);
      yield* handler;
    }));
  }).pipe(Effect.provide(Logger.layer([exporter])))).then(() => seen.join("\n"));
};

describe("recordingLogs hides a stored value the telemetry audience is not shown, by value", () => {
  it("a boolean in a private field, in an annotation and in a message body", async () => {
    const out = await logged(Effect.logInfo(`the vault is open: ${stored.open}`).pipe(Effect.annotateLogs({ open: stored.open })));
    expect(out, "the annotation").not.toContain('"open":true');
    expect(out, "the message body").not.toContain("open: true");
  });

  it("an object in a secret field, in an annotation and in a message body", async () => {
    const out = await logged(Effect.logInfo(`contents ${JSON.stringify(stored.contents)}`).pipe(Effect.annotateLogs({ contents: stored.contents })));
    expect(out, "the combination").not.toContain("COMBO-7731");
    expect(out, "the spare key").not.toContain("SPARE-9921");
  });

  it("a two-character value in a secret field, in an annotation and in a message body", async () => {
    const out = await logged(Effect.logInfo(`tag is ${stored.tag}`).pipe(Effect.annotateLogs({ tag: stored.tag })));
    expect(out).not.toContain("zq");
  });
});
