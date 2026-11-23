import { Effect } from "effect";
import { Ids, Records, Store, type Handler } from "@orthograph/language-effect";
import { Policy } from "@orthograph/intake/blueprint/things/policy/thing.ts";
import type declaration from "../../blueprint/things/ticket/verbs/accept.ts";
import { machine as assignments } from "../../blueprint/things/assignment/machine.ts";
import { Input } from "../../blueprint/things/input/thing.ts";
import { Mandate } from "../../blueprint/things/mandate/thing.ts";
import { Subscription } from "../../blueprint/things/subscription/thing.ts";
import { Ticket } from "../../blueprint/things/ticket/thing.ts";

/**
 * Make a ticket from an accepted trigger, in one commit (GOAL17-stage-one, call 3): the Ticket, its Mandate (pinned to the policy version
 * it was accepted under), its Subscription to the thread (its own), its first Assignment (waiting for a seat) and its first Input (the
 * trigger's words). Its executor is an Agent a person opened first: the framework has refused an unknown one.
 *
 * `TicketCreated` is its own move, and the Assignment's `queued` is made with `also` (GOAL17-slice9-build, call 8): `AssignmentQueued` is journalled with it, and its hop calls
 * `superagent.fill`. The Input is made `waiting` without its own event until `input.store`'s is written.
 */
const accept: Handler<typeof declaration, Records | Store> = ({ superagent, account, title, agent, thread, text }, { id, steps, move, also }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const store = yield* Store;
    const ticket = id as NonNullable<typeof id>;
    const [policy] = (yield* store.list({ thing: Policy, where: { superagent }, state: undefined, order: "newest", limit: 1, after: undefined })).items;
    const input = yield* Ids.of(Input.fields.id);
    yield* steps.write(Effect.gen(function* () {
      yield* records.insert(Ticket, { id: ticket, superagent, title, agent, seq: 1n });
      yield* records.insert(Mandate, { id: yield* Ids.of(Mandate.fields.id), superagent, ticket, account, policy: (policy?.["revision"] as bigint | undefined) ?? 0n }, "held");
      yield* records.insert(Subscription, { id: yield* Ids.of(Subscription.fields.id), superagent, ticket, thread, mode: "own" }, "live");
      yield* also(assignments.moves.queued, { fields: { superagent, ticket, agent, input, why: "launch", seat: 0n } });
      yield* records.insert(Input, { id: input, superagent, ticket, from: "trigger", text, seq: 1n, retryAt: 0n, refusals: 0n }, "waiting");
    }));
    yield* move();
    return { ticket };
  });

export default accept;
