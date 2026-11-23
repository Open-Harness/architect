// Planted fixture (ST1.20, G5 section 7: G4's spelling retired). Compiled on its own by test/invariants.test.ts, never by the package's typecheck.
// Until ST1.20 the `@ts-expect-error` lines below are NOT errors (the `unique:` property is still accepted, and a thing still carries `unique`), so the test is red;
// after it, each hides exactly one error. A rule is declared in `invariants.ts` and nowhere else.
import { Blueprint } from "../../../src/index.ts";

export const Handle = Blueprint.thing({
  description: "A name someone holds.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
  // @ts-expect-error `unique` has left `Blueprint.thing`: a rule is `Blueprint.invariant.unique` in the thing's invariants.ts
  unique: { name: { while: ["claimed"] } },
});

export const Plain = Blueprint.thing({
  description: "A thing with no rules.",
  code: "PL",
  fields: { id: Blueprint.id("pln"), name: Blueprint.text({ max: 40 }) },
});
// @ts-expect-error a thing no longer carries a `unique` map
export const carried = Plain.unique;
