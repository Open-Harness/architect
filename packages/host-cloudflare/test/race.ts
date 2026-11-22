// Spike S3's race, for both owners (D2 #39): 50 concurrent spends of 10 against a limit of 500. Each spend reads,
// awaits (a real store's round trip), then writes, so without the version guard updates are lost.
import { Cause, Effect, Exit, Layer } from "effect";
import { Blueprint, type Lives, type Thing } from "orthograph";
import { EventNames } from "orthograph/server";
import { BusyLive, Handlers, Records, Store, type Handler } from "@orthograph/language-effect";

const Amount = Blueprint.value(Blueprint.uint(128));

export const race = (lives: Lives, storeFor: (purse: Thing) => Layer.Layer<Store>) => {
  const Purse = Blueprint.thing({ description: "Money to spend.", fields: { id: Blueprint.id("pur"), limit: Amount, spent: Amount }, lives });
  const Spent = Blueprint.event({ purse: Purse.fields.id, amount: Amount });
  const Opened = Blueprint.event({ purse: Purse.fields.id });
  EventNames.name(Spent, "PurseSpent");
  EventNames.name(Opened, "PurseOpened");
  const machine = Blueprint.machine(Purse, {
    states: ["active", "exhausted"],
    moves: { open: { from: [], to: "active", emits: Opened }, spend: { from: ["active"], to: ["active", "exhausted"], emits: Spent } },
    notFrom: { exit: 40 },
  });
  const open = Blueprint.operation(Purse, {
    description: "Open a purse.", payload: { limit: Amount }, answer: { purse: Purse.fields.id }, move: machine.moves.open, allowed: [Blueprint.signedIn],
  });
  const spend = Blueprint.operation(Purse, {
    description: "Spend from it.", payload: { purse: Purse.fields.id, amount: Amount }, answer: { remaining: Amount },
    move: machine.moves.spend, allowed: [Blueprint.signedIn],
  });
  const id = `pur_${lives}${Math.random().toString(36).slice(2, 8)}`;
  const opener: Handler<typeof open, Records> = ({ limit }, { move }) =>
    Effect.gen(function* () {
      yield* (yield* Records).insert(Purse, { id: id as never, limit, spent: 0n });
      yield* move();
      return { purse: id as never };
    });
  const spender: Handler<typeof spend, Records> = ({ purse, amount }, { move }) =>
    Effect.gen(function* () {
      const records = yield* Records;
      const found = (yield* records.find(Purse, purse))!;
      const spent = (found["spent"] as bigint) + amount;
      yield* records.update(Purse, purse, { spent });
      const remaining = (found["limit"] as bigint) - spent;
      yield* move(remaining === 0n ? "exhausted" : "active");
      return { remaining };
    });
  const ada = { kind: "person", person: "per_ada", via: "session" } as const;
  const opened = Handlers.serve({ name: "purse.open", operation: open, handler: opener });
  const spent = Handlers.serve({ name: "purse.spend", operation: spend, handler: spender, notFrom: "PurseNotActive" });
  return Effect.gen(function* () {
    const { purse } = yield* opened.call({ limit: "500" }, ada);
    const exits = yield* Effect.all(
      Array.from({ length: 50 }, () => Effect.exit(spent.call({ purse, amount: "10" }, ada))),
      { concurrency: "unbounded" },
    );
    const after = yield* (yield* Store).find(Purse, purse);
    const refused = yield* Effect.exit(spent.call({ purse, amount: "10" }, ada));
    const failures = exits.filter(Exit.isFailure).map((e) => Cause.pretty(e.cause).split("\n").filter((l) => !l.trim().startsWith("at ")).join(" | ").slice(0, 600));
    return { accepted: exits.filter(Exit.isSuccess).length, after, refused, failures };
  }).pipe(Effect.provide(Layer.mergeAll(storeFor(Purse), BusyLive)));
};
