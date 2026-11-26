import { Blueprint } from "orthograph";

// Laid over a project by e2e/from-doctype/09-collisions: a thing holding the refusal code TTEA, so a scaffold can't take it.
export const CodeHolderTwo = Blueprint.thing({
  code: "TTEA",
  description: "A thing that holds the code TTEA.",
  fields: { id: Blueprint.id("cht") },
});
