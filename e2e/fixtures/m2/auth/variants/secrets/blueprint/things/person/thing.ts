import { Blueprint } from "orthograph";

// The code is given, so the plugin can be mounted under any name (`identity.ts`) without its two things sharing a prefix.
export const Person = Blueprint.thing({
  description: "Someone who signs in. Better Auth keeps people; the project refers to them by id.",
  fields: { id: Blueprint.id("per"), email: Blueprint.email(), name: Blueprint.text() },
  code: "PE",
});
