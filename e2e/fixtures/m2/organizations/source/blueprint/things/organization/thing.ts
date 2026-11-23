import { Blueprint } from "orthograph";

export const Organization = Blueprint.thing({
  description: "A company: it has an owner and members.",
  fields: { id: Blueprint.id("org"), name: Blueprint.text(), owner: Blueprint.id("per") },
});
