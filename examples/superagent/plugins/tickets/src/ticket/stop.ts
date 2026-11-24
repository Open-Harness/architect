import { Effect } from "effect";
import { Records, Store, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/ticket/verbs/stop.ts";
import { Assignment } from "../../blueprint/things/assignment/thing.ts";
import { Mandate } from "../../blueprint/things/mandate/thing.ts";

/**
 * Stop a ticket (open or ended; the machine refuses a stopped one): in one commit its mandate is withdrawn, and its executor's current
 * Assignment is closed from the state this call reads under the row's version: a pending one is `ended` at once (nothing ran), a running
 * one is `closing`, which keeps its seat until the Agent says its turn closed (slice 9's `AgentClosed`). A closing or ended one is left.
 */
const stop: Handler<typeof declaration, Records | Store> = ({ ticket }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const store = yield* Store;
    const newest = (thing: typeof Assignment | typeof Mandate) =>
      Effect.map(store.list({ thing, where: { ticket }, state: undefined, order: "newest", limit: 1, after: undefined }), (page) => page.items[0]);
    // Found by the list, then read again through the call's records: that read fixes the version the write is guarded by, so the state decided on is the state written over.
    const read = (thing: typeof Assignment | typeof Mandate) =>
      Effect.flatMap(newest(thing), (found) => (found === undefined ? Effect.succeed(undefined) : records.find(thing, String(found["id"]))));
    const assignment = yield* read(Assignment);
    const mandate = yield* read(Mandate);
    yield* steps.write(Effect.gen(function* () {
      if (mandate?.state === "held") yield* records.update(Mandate, String(mandate["id"]), {}, "withdrawn");
      if (assignment?.state === "pending") yield* records.update(Assignment, String(assignment["id"]), {}, "ended");
      else if (assignment?.state === "running") yield* records.update(Assignment, String(assignment["id"]), {}, "closing");
    }));
    yield* move();
    return {};
  });

export default stop;
