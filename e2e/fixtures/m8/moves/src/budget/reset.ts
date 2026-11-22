// Scaffolded from blueprint/things/budget/verbs/reset.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/budget/reset.handler.ts";
import { Budget } from "../../blueprint/things/budget/thing.ts";

/** Counted, at the world's time: the instant it was due, in a stepped world. */
const reset: Handler = ({ budget }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Budget, budget));
    if (!found) return yield* Effect.die(new Error(`budget ${budget} was checked and then not found`));
    const at = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    yield* steps.record(records.update(Budget, budget, { resets: (found["resets"] as bigint) + 1n }));
    yield* move("active");
    return { at };
  });

export default reset;
