import { Blueprint } from "orthograph";
import claim from "../../things/handle/verbs/claim.ts";

export default Blueprint.page({
  description: "Claim a name, or find one.",
  route: { path: "/", params: {} },
  allowed: [Blueprint.anyone],
  offers: [claim],
});
