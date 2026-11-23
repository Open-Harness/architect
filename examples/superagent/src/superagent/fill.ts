// Scaffolded from blueprint/things/superagent/verbs/fill.ts. Yours from now on.
import { Effect } from "effect";
import { Records, Store } from "@orthograph/language-effect";
import { Assignment } from "@orthograph/tickets/blueprint/things/assignment/thing.ts";
import { machine as assignments } from "@orthograph/tickets/blueprint/things/assignment/machine.ts";
import { Input } from "@orthograph/tickets/blueprint/things/input/thing.ts";
import { slots } from "@orthograph/tickets/src/modules/slots/service.ts";
import type { Why } from "@orthograph/tickets/src/modules/slots/types.ts";
import type { Handler } from "../../generated/api/src/superagent/fill.handler.ts";

const SEATS = 255;

/**
 * superagent.fill: Start waiting Assignments, in line, while seats are free. Does nothing while paused.
 *
 * Who may call, from blueprint/things/superagent/verbs/fill.ts:
 *   the system
 *
 * Payload, from blueprint/things/superagent/verbs/fill.ts:
 *   superagent  superagent.id
 *
 * Answer, from blueprint/things/superagent/verbs/fill.ts:
 *   started  uint
 *
 * Refusals:
 *   SuperagentNotFound  exit 4  SU-901  the runtime's, when no superagent has that id, carrying id; from @orthograph/superagent/blueprint/things/superagent/thing.js
 *   NotAllowed          exit 3  AR-001  the runtime's, when the caller isn't the system; from blueprint/things/superagent/verbs/fill.ts
 *
 * The superagent's machine, from @orthograph/superagent/blueprint/things/superagent/machine.js (this call makes no move):
 *     from       move    to         emits
 *     (creates)  create  observing  SuperagentCreated
 *     observing  goLive  live       SuperagentWentLive
 *     observing  pause   paused     SuperagentPaused
 *     live       pause   paused     SuperagentPaused
 *     paused     resume  observing  SuperagentResumed
 *     paused     resume  live       SuperagentResumed
 *     observing  retire  retired    SuperagentRetired
 *     live       retire  retired    SuperagentRetired
 *     paused     retire  retired    SuperagentRetired
 *
 * What the runtime does, so this handler doesn't:
 *   before it runs, it refuses NotAllowed unless the caller is the system;
 *   before it runs, it hands in the superagent it read as subject, so this handler never reads it again;
 *   the call is the span superagent.fill, and its commit superagent.fill.commit.
 */
const fill: Handler<Records | Store> = ({ superagent }, { subject, also }) =>
  Effect.gen(function* () {
    // The sweep is not a hop, so it looks at the state itself: nothing starts while paused (GOAL17-pause), and nothing for a retired superagent.
    if (subject === undefined || subject.state === "paused" || subject.state === "retired") return { started: 0n };
    const store = yield* Store;
    const records = yield* Records;
    const listed = (state: string) => store.list({ thing: Assignment, where: { superagent }, state, order: "oldest", limit: SEATS, after: undefined }).pipe(Effect.map((page) => page.items));
    // The running and the closing hold their seats; the waiting come in line, a person's first.
    const held = new Set<bigint>([...(yield* listed("running")), ...(yield* listed("closing"))].map((a) => a["seat"] as bigint));
    const waiting = yield* listed("pending");
    let started = 0n;
    for (const next of slots.line(waiting.map((a) => ({ assignment: String(a["id"]), why: a["why"] as Why })))) {
      const seat = slots.seatFor(subject.slots, held, next.why);
      // The head cannot start, so nobody behind it can.
      if (seat === undefined) break;
      const input = yield* records.find(Input, String(waiting.find((a) => a["id"] === next.assignment)?.["input"]));
      yield* also(assignments.moves.started, { id: next.assignment, fields: { seat }, event: { text: String(input?.["text"] ?? "") } });
      held.add(seat);
      started += 1n;
    }
    return { started };
  });

export default fill;
