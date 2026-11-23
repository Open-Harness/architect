// Planted fixture (G5, ST1.13). Compiled on its own by records/find-by.test.ts, never by the package's typecheck. `findBy` takes a rule and the
// rule's key: the first lines compile, and each `@ts-expect-error` line hides exactly one error.
import { Effect } from "effect";
import { Blueprint } from "orthograph";
import { Records } from "../../../src/modules/records/types.ts";

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }), note: Blueprint.text({ max: 40 }) },
});
const oneHolderPerName = Blueprint.invariant.unique(Handle.fields.name);
const onePerPair = Blueprint.invariant.unique([Handle.fields.owner, Handle.fields.name]);

export const program = Effect.gen(function* () {
  const records = yield* Records;
  // A rule with the key's own type: accepted, and the answer may be there or not.
  const held = yield* records.findBy(oneHolderPerName, "ada");
  const name: string | undefined = held ? String(held["name"]) : undefined;
  // A composite key takes an object of its fields.
  yield* records.findBy(onePerPair, { owner: "o1", name: "ada" });
  // @ts-expect-error the value is the key's own type, not a number
  yield* records.findBy(oneHolderPerName, 7);
  // @ts-expect-error a composite key takes its fields as an object, not one value
  yield* records.findBy(onePerPair, "ada");
  // @ts-expect-error an object of the wrong fields
  yield* records.findBy(onePerPair, { owner: "o1", nickname: "ada" });
  return name;
});
