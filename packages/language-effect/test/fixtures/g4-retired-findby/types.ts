// Planted fixture (ST1.20, G5 section 7: G4's spelling retired). Compiled on its own by src/modules/records/g4-retired.test.ts, never by the package's typecheck.
// Until ST1.20 G4's `findBy(thing, field, value)` still type-checks for a declared unique field, so the `@ts-expect-error` line is not an error and the test is red;
// after it, `findBy` takes a rule only.
import { Effect } from "effect";
import { Blueprint } from "orthograph";
import { Records } from "../../../src/modules/records/types.ts";

// A variable, so the declaration itself is no excess-property error before or after ST1.20: only `findBy`'s form is judged here.
const spec = {
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
  unique: { name: {} },
} as const;
const Handle = Blueprint.thing(spec);

export const program = Effect.gen(function* () {
  const records = yield* Records;
  // @ts-expect-error G4's form: a thing, a field's name and a value. A rule is the only key now.
  yield* records.findBy(Handle, "name", "ada");
});
