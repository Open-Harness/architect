import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/start.ts";
import { Eval } from "../../blueprint/things/eval/thing.ts";

/** Make an eval for one thread's waiting triggers: queued, with none of the tickets it might touch counted yet (those are the tickets plugin's to say). */
const start: Handler<typeof declaration, Records> = (payload, { id, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const evaluation = id as NonNullable<typeof id>;
    // `deliveredAt` is left out: the clock starts when the main agent is told (`eval.delivered`).
    yield* records.insert(Eval, { id: evaluation, ...payload, activeAtStart: 0n } as never);
    yield* move();
    return { eval: evaluation };
  });

export default start;
