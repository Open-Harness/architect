import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/account/verbs/seen.ts";
import { oneAccountPerExternalId } from "../../blueprint/things/account/invariants.ts";

/**
 * Record an account an event came from. One account is one outside id of one superagent's source: a known one answers its id,
 * records nothing and keeps its state (only a person lists or unlists it); a new one is made, `seen`, from the payload.
 */
const seen: Handler<typeof declaration, Records> = ({ superagent, source, external }, { id, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const known = yield* records.findBy(oneAccountPerExternalId, { superagent, source, external });
    if (known !== undefined) return { account: known["id"] as NonNullable<typeof id> };
    yield* move();
    return { account: id as NonNullable<typeof id> };
  });

export default seen;
