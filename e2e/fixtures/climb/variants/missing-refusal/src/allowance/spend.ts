// Climb check fixture (missing-refusal): acme's spend handler with one planted fault: it never refuses an amount over what is left.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/allowance/spend.handler.ts";
import { Allowance } from "../../blueprint/things/allowance/thing.ts";

/** Spend from what is left of this month's allowance. */
const spend: Handler = ({ allowance, amount }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // Only the allowance's grantee may spend, so the runtime has already found it before this runs.
    const found = yield* steps.load(records.find(Allowance, allowance));
    if (!found) return yield* Effect.die(new Error(`allowance ${allowance} was checked and then not found`));
    const limit = found["limit"] as bigint;
    const spent = found["spent"] as bigint;
    const remaining = limit - spent;
    yield* steps.record(records.update(Allowance, allowance, { spent: spent + amount }));
    yield* move(amount === remaining ? "exhausted" : "active");
    return { remaining: amount > remaining ? 0n : remaining - amount };
  });

export default spend;
