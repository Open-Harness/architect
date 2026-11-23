// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/claim.handler.ts";
import { Handle } from "../../blueprint/things/handle/thing.ts";

/** Claim a name: make the handle and move it to claimed. The runtime refuses a taken name and a second name for a person (the rules in invariants.ts). */
const claim: Handler = ({ name, owner }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.save(records.insert(Handle, { id, name, owner }));
    yield* move("claimed");
    return { handle: id };
  });

export default claim;
