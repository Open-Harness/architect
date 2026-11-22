// Scaffolded from blueprint/things/ping/verbs/send.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/ping/send.handler.ts";
import { Ping } from "../../blueprint/things/ping/thing.ts";

/** Ping an address. */
const send: Handler = ({ to }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const ping = yield* Ids.of(Ping.fields.id);
    yield* steps.insert(records.insert(Ping, { id: ping, to }));
    yield* move("sent");
    return { ping };
  });

export default send;
