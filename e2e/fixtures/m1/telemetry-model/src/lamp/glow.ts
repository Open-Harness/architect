// Scaffolded from blueprint/things/lamp/verbs/glow.ts. Yours from now on.
// Waits for the check's HTTP service to answer (its gate decides how long), then lights a lamp.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/lamp/glow.handler.ts";
import { Lamp } from "../../blueprint/things/lamp/thing.ts";

const ask = (origin: string) => origin === "none" ? Effect.succeed("open") : Effect.promise(() => fetch(`${origin}/gate/glow`).then((response) => response.text()));

/** Light a lamp once the slow service has answered. */
const glow: Handler = ({ origin }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.wait(ask(origin));
    const lamp = yield* Ids.of(Lamp.fields.id);
    yield* steps.save(records.insert(Lamp, { id: lamp, label: "lit" }));
    yield* move("lit");
    return { lamp };
  });

export default glow;
