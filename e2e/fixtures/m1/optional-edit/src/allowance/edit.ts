import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/allowance/edit.handler.ts";
import { Allowance } from "../../blueprint/things/allowance/thing.ts";

const edit: Handler = ({ allowance, limit }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const current = yield* steps.load(records.find(Allowance, allowance));
    if (!current) return yield* Effect.die(new Error("allowance is missing"));
    if (current["limit"] !== limit) yield* steps.save(records.update(Allowance, allowance, { limit }));
    return { limit };
  });

export default edit;
