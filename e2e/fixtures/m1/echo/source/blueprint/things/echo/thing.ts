import { Blueprint } from "orthograph";

export const Echo = Blueprint.thing({
  description: "Something that says back what it is given.",
  fields: { id: Blueprint.id("ech") },
  code: "EC",
});
