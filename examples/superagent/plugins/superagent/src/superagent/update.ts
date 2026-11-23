import { Effect } from "effect";
import { Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/superagent/verbs/update.ts";
import { Superagent } from "../../blueprint/things/superagent/thing.ts";
import { SlotsOutOfRange, StaleRevision } from "../../blueprint/things/superagent/errors.ts";

/**
 * Save a superagent's configuration as its next version: the revision the caller read is the one it holds, or the save is refused with the current one,
 * and its slots are 1 to 254. The change is in place (a superagent has one row), and a main agent's call never reaches here: it records a Proposal instead.
 */
const update: Handler<typeof declaration, Records> = (payload, { subject }) =>
  Effect.gen(function* () {
    const current = subject!["configRevision"] as bigint;
    if (payload.base !== current) return yield* new StaleRevision({ current });
    if (payload.slots < 1n || payload.slots > 254n) return yield* new SlotsOutOfRange({ slots: payload.slots });
    const records = yield* Records;
    const revision = current + 1n;
    yield* records.update(Superagent, payload.superagent, { name: payload.name, purpose: payload.purpose, connections: payload.connections, playbook: payload.playbook, slots: payload.slots, configRevision: revision } as never);
    return { revision };
  });

export default update;
