import { Blueprint } from "orthograph";
import { HandleName } from "../../values/page.ts";

export const Handle = Blueprint.thing({
  description: "A public name that belongs to one person until they release it, and is the address of a public page.",
  code: "HN",
  // The person is Better Auth's (M2): the project refers to them by id, as acme's organisation does.
  fields: {
    id: Blueprint.described(Blueprint.id("hdl"), "The handle's own id."),
    name: HandleName,
    owner: Blueprint.described(Blueprint.id("per"), "The person who holds the name."),
  },
});
