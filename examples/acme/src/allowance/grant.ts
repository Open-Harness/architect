// Scaffolded from blueprint/things/allowance/verbs/grant.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/allowance/grant.handler.ts";
import { Allowance } from "../../blueprint/things/allowance/thing.ts";
import { AllowanceLimitTooHigh } from "../../blueprint/things/allowance/errors.ts";

/** Let a member spend from the organisation, up to a limit each month. */
const grant: Handler = ({ organization, member, limit }, { steps, move, refs, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // The owner's role check read the organisation, and the runtime hands it in; the member it read too, or refused.
    const cap = typeof refs.organization?.["cap"] === "bigint" ? refs.organization["cap"] : 0n;
    if (limit > cap) {
      yield* Effect.logInfo("the limit is over the organisation's cap").pipe(Effect.annotateLogs({ limit: String(limit), cap: String(cap) }));
      return yield* new AllowanceLimitTooHigh({ cap });
    }
    // The runtime minted the new allowance's id before this ran.
    yield* steps.insert(records.insert(Allowance, { id, organization, member, limit, spent: 0n }));
    yield* move("active");
    return { allowance: id };
  });

export default grant;
