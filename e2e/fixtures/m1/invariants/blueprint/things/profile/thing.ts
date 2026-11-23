import { Blueprint } from "orthograph";
import { Handle } from "../handle/thing.ts";

export const Profile = Blueprint.thing({
  description: "A claimed name's page.",
  code: "PR",
  fields: { id: Blueprint.id("prf"), handle: Handle.fields.id },
});
