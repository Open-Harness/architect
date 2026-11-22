// Scaffolded from blueprint/things/budget/verbs/open.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/budget/open.handler.ts";
import { Budget } from "../../blueprint/things/budget/thing.ts";

/** Open a budget now, by the world's clock. */
const open: Handler = ({ title }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const openedAt = DateTime.formatIso(DateTime.makeUnsafe(yield* Clock.currentTimeMillis));
    const budget = yield* Ids.of(Budget.fields.id);
    yield* steps.insert(records.insert(Budget, { id: budget, title, openedAt, resets: 0n, reports: 0n }));
    yield* move("active");
    return { budget, openedAt };
  });

export default open;
