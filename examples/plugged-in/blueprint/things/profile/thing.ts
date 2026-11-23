import { Blueprint, Schema } from "orthograph";
import { Handle } from "../handle/thing.ts";

export const Profile = Blueprint.thing({
  description: "A claimed name's public page, with its links in the order they were put.",
  code: "PR",
  fields: {
    id: Blueprint.described(Blueprint.id("prf"), "The page's own id."),
    handle: Blueprint.described(Handle.fields.id, "The handle the page belongs to."),
    links: Blueprint.described(Blueprint.value(Schema.fromJsonString(Schema.Array(Schema.String))), "The ids of the page's links, in the order they show."),
  },
});
