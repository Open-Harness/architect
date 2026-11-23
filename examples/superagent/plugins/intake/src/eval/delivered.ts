import { Clock, Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/eval/verbs/delivered.ts";
import { Eval } from "../../blueprint/things/eval/thing.ts";

/** The eval is told to the main agent: its clock starts now, and `eval.due` judges it overdue from this reading. */
const delivered: Handler<typeof declaration, Records> = ({ eval: evaluation }, { move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* records.update(Eval, evaluation, { deliveredAt: BigInt(yield* Clock.currentTimeMillis) });
    yield* move();
    return {};
  });

export default delivered;
