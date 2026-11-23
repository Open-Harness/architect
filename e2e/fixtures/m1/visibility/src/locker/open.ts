// Scaffolded from blueprint/things/locker/verbs/open.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/locker/open.handler.ts";
import { Locker } from "../../blueprint/things/locker/thing.ts";
import { LockerSealed } from "../../blueprint/things/locker/errors.ts";
import { sentinels } from "../sentinels.ts";

/**
 * Open a locker with its key, or refuse the crowbar. As a careless handler would, it logs what it holds, and it hands back one
 * field more than the declaration names (in the answer, and in the refusal): neither may leave through any output.
 */
const open: Handler = ({ locker, tool }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Locker, locker));
    if (!found) return yield* Effect.die(new Error(`locker ${locker} was not found`));
    const label = String(found["label"]);
    const note = String(found["note"]);
    const code = String(found["code"]);
    const seal = String(found["seal"]);
    // Fields neither the answer nor the refusal declares: held in variables, so the type does not stop them.
    const undeclared = { answer: { residue: sentinels.residue }, refusal: { residue: sentinels.residueRefusal } };
    yield* Effect.logInfo(`opening ${label}: the note says ${note} and the code is ${code}`).pipe(Effect.annotateLogs({ note, code }));
    if (tool === "crowbar") return yield* new LockerSealed({ hint: sentinels.hint, memo: sentinels.memo, pin: sentinels.pin, ...undeclared.refusal });
    yield* move("opened");
    return { locker, label, note, code, seal, ...undeclared.answer };
  });

export default open;
