import { Blueprint } from "orthograph";

export const Person = Blueprint.thing({
  description: "Someone who signs in. Better Auth keeps people; the project refers to them by id.",
  fields: { id: Blueprint.id("per"), email: Blueprint.email(), name: Blueprint.text() },
});
