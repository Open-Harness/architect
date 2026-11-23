import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/create.ts";
import { Superagent } from "../../blueprint/things/superagent/thing.ts";
import { SlotsOutOfRange } from "../../blueprint/things/superagent/errors.ts";

/**
 * Make a superagent, observing, with the main agent a person opened first (GOAL17-stage-one, call 4): the framework has refused an
 * unknown one already. Its slots are 1 to 254. Its first policy is a `policy.save` from base 0, made by whoever deploys it.
 */
const create: Handler<typeof declaration, Records> = (payload, { id, move }) =>
  Effect.gen(function* () {
    if (payload.slots < 1n || payload.slots > 254n) return yield* new SlotsOutOfRange({ slots: payload.slots });
    const superagent = id as NonNullable<typeof id>;
    const records = yield* Records;
    yield* records.insert(Superagent, { id: superagent, ...payload, pausedFor: 0n, passGen: 0n, revision: 1n } as never);
    yield* move();
    return { superagent };
  });

export default create;
