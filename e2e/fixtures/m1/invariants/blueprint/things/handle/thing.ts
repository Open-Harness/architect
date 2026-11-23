import { Blueprint } from "orthograph";

// A name someone holds while it is claimed, and a person holds one claimed name at a time. The rules are in invariants.ts (G5).
export const Handle = Blueprint.thing({
  description: "A name someone holds for as long as they keep it.",
  code: "HD",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }), owner: Blueprint.text({ max: 40 }) },
});
