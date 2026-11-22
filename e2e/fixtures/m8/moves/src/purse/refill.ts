// Scaffolded from blueprint/things/purse/verbs/refill.ts. Yours from now on.
import { Clock, DateTime, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/purse/refill.handler.ts";
import { Purse } from "../../blueprint/things/purse/thing.ts";

/** The month the purse is in now: the first is 1, and each whole month since it opened adds one (in UTC). */
const periodAt = (openedAt: string, now: number): bigint => {
  const opened = DateTime.makeUnsafe(openedAt);
  let months = 0;
  while (DateTime.toEpochMillis(DateTime.add(opened, { months: months + 1 })) <= now) months += 1;
  return BigInt(months + 1);
};

/** A new month: nothing spent, and the period the purse is in now, however many months went by unspent. */
const refill: Handler = ({ purse }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Purse, purse));
    if (!found) return yield* Effect.die(new Error(`purse ${purse} was checked and then not found`));
    const period = periodAt(found["openedAt"] as string, yield* Clock.currentTimeMillis);
    yield* steps.record(records.update(Purse, purse, { spent: 0n, period }));
    yield* move("active");
    return { period };
  });

export default refill;
