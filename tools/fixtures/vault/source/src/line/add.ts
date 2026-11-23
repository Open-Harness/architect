import { Effect } from "effect";
import { Ids, Records, type Handler } from "@orthograph/language-effect";
import type declaration from "../../blueprint/things/line/verbs/add.js";
import { Line } from "../../blueprint/things/line/thing.js";

const add: Handler<typeof declaration, Records> = ({ amount }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const line = yield* Ids.of(Line.fields.id);
    yield* steps.save(records.insert(Line, { id: line, amount }));
    return { line };
  });

export default add;
