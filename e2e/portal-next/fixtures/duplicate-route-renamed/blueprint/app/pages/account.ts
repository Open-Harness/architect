import { Blueprint } from "orthograph";
import { Handle } from "../../things/handle/thing.ts";
import home from "./home.ts";

export default Blueprint.page({
  description: "The profile page's route with the parameter renamed: the same address.",
  route: { path: "/@:name", params: { name: Handle.fields.name } },
  parent: home,
  allowed: [Blueprint.signedIn],
});
