// Scaffolded from blueprint/things/purse/verbs/spend.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/purse/spend.handler.ts";
import { Purse } from "../../blueprint/things/purse/thing.ts";
import { PurseExceeded } from "../../blueprint/things/purse/errors.ts";

/** Spend from what is left this month. A refill that was due has already been worked out before this runs. */
const spend: Handler = ({ purse, amount }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Purse, purse));
    if (!found) return yield* Effect.die(new Error(`purse ${purse} was checked and then not found`));
    const left = (found["limit"] as bigint) - (found["spent"] as bigint);
    if (amount > left) {
      yield* Effect.logInfo("the amount is more than is left this month").pipe(Effect.annotateLogs({ amount: String(amount), left: String(left) }));
      return yield* new PurseExceeded({ left });
    }
    yield* steps.record(records.update(Purse, purse, { spent: (found["spent"] as bigint) + amount }));
    yield* move("active");
    return { left: left - amount };
  });

export default spend;
