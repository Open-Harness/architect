import { Blueprint } from "orthograph";

// Laid over a project by e2e/from-doctype/09-collisions: a thing holding the refusal code TTE, so a scaffold can't take it.
export const CodeHolderOne = Blueprint.thing({
  code: "TTE",
  description: "A thing that holds the code TTE.",
  fields: { id: Blueprint.id("cho") },
});
