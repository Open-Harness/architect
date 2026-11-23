import { Blueprint } from "orthograph";

// `name` is unique while a handle is `claimed`; a released handle keeps its name and frees it. The rule is in invariants.ts (G5; respelled from G4's
// `unique` property at ST1.20). The checks pin behaviour, never the spelling.
export const Handle = Blueprint.thing({
  description: "A name someone holds for as long as they keep it.",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
});
