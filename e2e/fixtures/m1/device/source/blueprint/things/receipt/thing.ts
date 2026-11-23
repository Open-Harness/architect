import { Blueprint } from "orthograph";

export const Receipt = Blueprint.thing({
  description: "A text stamped on the device that made it.",
  fields: { id: Blueprint.id("rcp") },
  code: "RC",
});
