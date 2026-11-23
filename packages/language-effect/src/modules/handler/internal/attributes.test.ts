// L2.P and O2: only traceable public fields appear in span attributes.
import { Effect, Layer, Schema, Tracer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { ErrorNames, EventNames } from "orthograph/server";
import { BusyLive } from "#modules/work/service.js";
import { storeMemory } from "#modules/records/service.js";
import { Records } from "#modules/records/types.js";
import { Handlers } from "../service.ts";
import type { Handler } from "../types.ts";
import { answerAttributes, payloadAttributes } from "./attributes.ts";

/** The in-memory exporter: every span the runtime opens, kept for the test to read. */
const recording = () => {
  const spans: Array<Tracer.NativeSpan> = [];
  const tracer = Tracer.make({ span: (options) => { const s = new Tracer.NativeSpan(options); spans.push(s); return s; } });
  const store = storeMemory();
  return { spans, store, layer: Layer.mergeAll(BusyLive, store.layer, Layer.succeed(Tracer.Tracer, tracer)) };
};

const Org = Blueprint.thing({ description: "Who may see a pin.", fields: { id: Blueprint.id("org") } });
const owner = Blueprint.role(Org, { rule: () => true });
const Account = Blueprint.thing({
  description: "Someone's login.",
  fields: { id: Blueprint.id("acc"), memo: Blueprint.text(), pin: Blueprint.visibility.private(Blueprint.text(), owner) },
});
const Password = Blueprint.visibility.secret(Blueprint.text());
class Refused extends Blueprint.error({}, { exit: 40 }) {}
ErrorNames.name(Refused, "Refused");
const Moved = Blueprint.event({ account: Account.fields.id, pin: Account.fields.pin, memo: Account.fields.memo });
EventNames.name(Moved, "Moved");
const machine = Blueprint.machine(Account, { states: ["open"], moves: { open: { from: [], to: "open", emits: Moved } }, notFrom: { exit: 40 } });
const signIn = Blueprint.operation(Account, {
  description: "Sign in.",
  payload: { memo: Account.fields.memo, password: Password, pin: Account.fields.pin },
  answer: { account: Blueprint.visibility.secret(Account.fields.id), token: Password, memo: Account.fields.memo },
  move: machine.moves.open,
  allowed: [Blueprint.anyone],
  errors: [Refused],
});
const handler: Handler<typeof signIn, Records> = (payload, { move }) =>
  Effect.gen(function* () {
    yield* (yield* Records).insert(Account, { id: "acc_1" as never, memo: payload.memo, pin: payload.pin });
    yield* move();
    return { account: "acc_1" as never, token: "tok-secret-9999", memo: payload.memo };
  });
const payload = { memo: "notes for Ada", password: "hunter2-hunter2", pin: "pin-4321" };
const caller = { kind: "anonymous" } as const;

const call = async (h: Handler<typeof signIn, Records> = handler, input = payload) => {
  const r = recording();
  await Effect.runPromiseExit(Handlers.serve({ name: "account.sign-in", operation: signIn, handler: h }).call(input, caller).pipe(Effect.provide(r.layer)));
  return r;
};

describe("span attributes are an allowlist of traceable public fields", () => {
  it("keeps free text, secret and private fields off payload and answer spans", async () => {
    const { spans } = await call();
    const attributes = Object.fromEntries(spans.find((s) => s.name === "account.sign-in")!.attributes);
    for (const k of ["payload.memo", "payload.password", "payload.pin", "answer.memo", "answer.account", "answer.token"]) expect(attributes, k).not.toHaveProperty([k]);
    // Not in any span, under any key.
    const everything = JSON.stringify(spans.map((s) => [...s.attributes]));
    for (const v of ["notes for Ada", "hunter2-hunter2", "pin-4321", "tok-secret-9999", "acc_1"]) expect(everything, v).not.toContain(v);
  });

  it("traces marked text, ids, amounts, enums, booleans and times", () => {
    const Memo = Blueprint.text();
    const fields = {
      memo: Memo, label: Blueprint.traced(Memo), id: Account.fields.id,
      amount: Blueprint.uint(128), status: Blueprint.value(Schema.Literals(["active", "closed"])),
      live: Blueprint.value(Schema.Boolean), at: Blueprint.value(Schema.DateTimeUtcFromString),
      hidden: Blueprint.traced(Password),
    };
    const values = {
      memo: "notes for Ada", label: "expense category", id: "acc_1", amount: 12n,
      status: "active", live: true, at: "2026-11-18T12:00:00Z", hidden: "none of your business",
    };
    expect(payloadAttributes(values, fields)).toEqual({
      "payload.label": "expense category", "payload.id": "acc_1", "payload.amount": "12",
      "payload.status": "active", "payload.live": "true", "payload.at": "2026-11-18T12:00:00Z",
    });
    expect(answerAttributes(values, fields)).toEqual({
      "answer.label": "expense category", "answer.id": "acc_1", "answer.amount": "12",
      "answer.status": "active", "answer.live": true, "answer.at": "2026-11-18T12:00:00Z",
    });
  });

  it("keeps an event's public memo in its journal entry", async () => {
    const { store } = await call();
    expect(store.entries).toEqual([expect.objectContaining({ event: "Moved", fields: { account: "acc_1", memo: "notes for Ada" } })]);
  });

  it("keeps the label of a deciding log without an untraced argument", () =>
    call((p) => Effect.logInfo("Refused", p.memo).pipe(Effect.andThen(Effect.fail(new Refused({}))))).then(({ spans }) => {
      const log = spans.find((span) => span.name === "account.sign-in")?.attributes.get("refusal.log");
      expect(log).toEqual(expect.stringContaining("Refused"));
      expect(log).not.toContain(payload.memo);
    }));

  it("keeps the label of a structured deciding log without an escaped memo", () => {
    const memo = "receipt copy\nextra notes";
    return call((p) => Effect.logInfo("Refused", { memo: p.memo }).pipe(Effect.andThen(Effect.fail(new Refused({})))), { ...payload, memo }).then(({ spans }) => {
      const log = spans.find((span) => span.name === "account.sign-in")?.attributes.get("refusal.log");
      expect(log).toEqual(expect.stringContaining("Refused"));
      expect(log).not.toContain(memo);
      expect(log).not.toContain(JSON.stringify(memo).slice(1, -1));
    });
  });

  it("a field the declaration doesn't name is not an attribute either: it fails closed", async () => {
    const { spans } = await call((p, c) => handler(p, c).pipe(Effect.map((a) => ({ ...a, extra: "undeclared-value" }) as never)));
    expect(JSON.stringify(spans.map((s) => [...s.attributes]))).not.toContain("undeclared-value");
  });
});
