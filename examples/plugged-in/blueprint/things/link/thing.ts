import { Blueprint } from "orthograph";
import { LinkTitle, LinkUrl } from "../../values/page.ts";
import { Handle } from "../handle/thing.ts";
import { Profile } from "../profile/thing.ts";

export const Link = Blueprint.thing({
  description: "A title and web address on a public page.",
  code: "LN",
  fields: {
    id: Blueprint.described(Blueprint.id("lnk"), "The link's own id."),
    profile: Blueprint.described(Profile.fields.id, "The page the link is on."),
    owner: Blueprint.described(Handle.fields.owner, "The person whose page the link is on."),
    title: LinkTitle,
    url: LinkUrl,
  },
});
