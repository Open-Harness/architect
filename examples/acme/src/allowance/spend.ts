// Scaffolded from blueprint/things/allowance/verbs/spend.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/allowance/spend.handler.ts";
import { Allowance } from "../../blueprint/things/allowance/thing.ts";
import { AllowanceExceeded } from "../../blueprint/things/allowance/errors.ts";

/** Spend from what is left of this month's allowance. */
const spend: Handler = ({ allowance, amount }, { steps, move, subject }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Only the allowance's grantee may spend, so the runtime has already read it, and hands it in as subject.
    const found = yield* steps.load(Effect.succeed(subject));
    if (!found) return yield* Effect.die(new Error(`allowance ${allowance} was checked and then not found`));
    const limit = found["limit"] as bigint;
    const spent = found["spent"] as bigint;
    const remaining = limit - spent;
    if (amount > remaining) {
      yield* Effect.logInfo("the amount is more than is left").pipe(Effect.annotateLogs({ amount: String(amount), remaining: String(remaining) }));
      return yield* new AllowanceExceeded({ remaining });
    }
    yield* steps.record(records.update(Allowance, allowance, { spent: spent + amount }));
    yield* move(amount === remaining ? "exhausted" : "active");
    return { remaining: remaining - amount };
  });

export default spend;
