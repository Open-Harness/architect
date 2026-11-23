// The stand-in for @orthograph/organizations (M2.07): the declarations, starting worlds and journeys the real package
// must carry, with every handler empty. Its roles are today's `rule` roles (`holds` builds in M2.18).
import { Blueprint } from "orthograph";
import auth from "@fixture/auth";

export default Blueprint.feature({
  description: "Organisations, their members, invitations and API keys: who belongs where.",
  needs: [auth],
});
