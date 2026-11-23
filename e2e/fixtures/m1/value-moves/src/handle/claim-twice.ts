// Scaffolded from blueprint/things/handle/verbs/claim-twice.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/claim-twice.handler.ts";
import { Handle } from "../../blueprint/things/handle/thing.ts";

/** A bug on purpose: two claimed handles under one name, the subject and `other`, in one call. */
const claimTwice: Handler = ({ name, other }, { steps, move, id }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    yield* steps.first(records.insert(Handle, { id, name }));
    yield* steps.second(records.insert(Handle, { id: other, name }, "claimed"));
    yield* move("claimed");
    return { handle: id };
  });

export default claimTwice;
