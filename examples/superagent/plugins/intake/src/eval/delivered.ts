import { Clock, Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";
import type declaration from "../../blueprint/things/eval/verbs/delivered.ts";
import { Eval } from "../../blueprint/things/eval/thing.ts";
import { activeClock } from "../modules/clock/service.ts";

/**
 * The eval is told to the main agent: its clock starts now. It starts on the superagent's active clock (the wall clock less its pauses, GOAL17-pause),
 * so `eval.due` judges it overdue by the same clock and a pause that spans it does not count against it.
 */
const delivered: Handler<typeof declaration, Records> = ({ eval: evaluation }, { subject, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const superagent = yield* records.find(Superagent, String(subject?.["superagent"]));
    const now = BigInt(yield* Clock.currentTimeMillis);
    const at = superagent === undefined ? now : activeClock({ state: String(superagent.state), pausedAt: superagent["pausedAt"] as bigint | undefined, pausedFor: superagent["pausedFor"] as bigint }, now);
    yield* records.update(Eval, evaluation, { deliveredAt: at });
    yield* move();
    return {};
  });

export default delivered;
