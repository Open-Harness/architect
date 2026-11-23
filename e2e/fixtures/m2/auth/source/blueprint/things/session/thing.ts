import { Blueprint } from "orthograph";
import { Person } from "../person/thing.js";

export const Session = Blueprint.thing({
  description: "A person's signed-in session, issued by Better Auth.",
  fields: { id: Blueprint.id("ses"), person: Person.fields.id },
});
