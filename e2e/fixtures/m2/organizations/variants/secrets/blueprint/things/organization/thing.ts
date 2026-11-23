import { Blueprint } from "orthograph";
// The code is given, so the plugin can be mounted under any name (`team-members.ts`) without its things sharing a prefix.

export const Organization = Blueprint.thing({
  description: "A company: it has an owner and members.",
  fields: { id: Blueprint.id("org"), name: Blueprint.text(), owner: Blueprint.id("per") },
  code: "OG",
});
