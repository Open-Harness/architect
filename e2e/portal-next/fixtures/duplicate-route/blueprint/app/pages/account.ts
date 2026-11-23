import { Blueprint } from "orthograph";
import { Handle } from "../../things/handle/thing.ts";
import home from "./home.ts";

export default Blueprint.page({
  description: "Takes the profile page's route.",
  route: { path: "/@:handle", params: { handle: Handle.fields.name } },
  parent: home,
  allowed: [Blueprint.signedIn],
});
